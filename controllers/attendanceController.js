const pool = require("../db");

const ALLOWED_STATUSES = ["Present", "Absent", "Late", "Leave"];
const ATTENDANCE_SCHOOL_ALIAS = "attendance";

const getTodayDateString = () => new Date().toISOString().split("T")[0];

const normalizeDateOnly = (value) => {
  if (!value) {
    return "";
  }

  return new Date(value).toISOString().split("T")[0];
};

const isTeacherRestrictedToToday = (user, date) => {
  return user?.role === "teacher" && normalizeDateOnly(date) !== getTodayDateString();
};

const {
  buildSchoolClause,
  resolveSchoolIdForWrite,
  resolveSchoolScope,
} = require("../utils/tenantScope");

const verifyStudentInSchool = async (studentId, schoolId) => {
  const params = [studentId, schoolId];

  const result = await pool.query(
    `
    SELECT id
    FROM students
    WHERE id = $1
      AND is_active = true
      AND school_id = $2
    `,
    params
  );

  return result.rowCount > 0;
};

const verifyTeacherCanAccessStudent = async (user, studentId, schoolId) => {
  if (user?.role !== "teacher") {
    return true;
  }

  const teacherId = user.teacher_id;

  if (!teacherId) {
    return false;
  }

  const result = await pool.query(
    `
    SELECT 1
    FROM students s
    INNER JOIN class_sections cs
      ON LOWER(TRIM(cs.class_name)) = LOWER(TRIM(s.student_class))
      AND LOWER(TRIM(cs.section_name)) = LOWER(TRIM(s.section))
    INNER JOIN teacher_subject_assignments tsa
      ON tsa.class_section_id = cs.id
      AND tsa.teacher_id = $1
      AND tsa.is_active = TRUE
    WHERE s.id = $2
      AND s.school_id = $3
      AND s.is_active = TRUE
    `,
    [teacherId, studentId, schoolId]
  );

  return result.rowCount > 0;
};

const buildTeacherStudentScopeClause = (user, params) => {
  if (user?.role !== "teacher") {
    return "";
  }

  const teacherId = user.teacher_id;

  if (!teacherId) {
    params.push(-1);
    return `
      AND 1 = 0
    `;
  }

  params.push(teacherId);

  return `
    AND EXISTS (
      SELECT 1
      FROM class_sections cs
      INNER JOIN teacher_subject_assignments tsa
        ON tsa.class_section_id = cs.id
        AND tsa.teacher_id = $${params.length}
        AND tsa.is_active = TRUE
      WHERE LOWER(TRIM(cs.class_name)) = LOWER(TRIM(students.student_class))
        AND LOWER(TRIM(cs.section_name)) = LOWER(TRIM(students.section))
    )
  `;
};

const markAttendance = async (req, res) => {
  try {
    const scope = resolveSchoolScope(req, res);
    if (!scope) {
      return;
    }
    const { schoolId } = scope;
    const writeSchoolId = resolveSchoolIdForWrite(req, res);
    if (writeSchoolId == null) {
      return;
    }

    const { student_id, date, period, status } = req.body;

    if (isTeacherRestrictedToToday(req.user, date)) {
      return res.status(403).json({
        error: "Attendance can only be marked for today's date",
      });
    }

    const studentAllowed = await verifyStudentInSchool(student_id, schoolId);
    if (!studentAllowed) {
      return res.status(404).json({
        error: "Student not found in your school",
      });
    }

    const teacherAllowed = await verifyTeacherCanAccessStudent(
      req.user,
      student_id,
      schoolId
    );

    if (!teacherAllowed) {
      return res.status(403).json({
        error: "You can only mark attendance for your assigned classes",
      });
    }

    const existingParams = [student_id, date, period, schoolId];

    const existingAttendance = await pool.query(
      `
      SELECT id
      FROM attendance
      WHERE student_id = $1
        AND date = $2
        AND period = $3
        AND school_id = $4
      `,
      existingParams
    );

    if (existingAttendance.rows.length > 0) {
      return res.status(409).json({
        error: "Attendance already marked",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO attendance
      (
        student_id,
        teacher_id,
        date,
        period,
        status,
        school_id
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
      [student_id, req.user.id, date, period, status, writeSchoolId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Error marking attendance",
    });
  }
};

const getAttendance = async (req, res) => {
  try {
    const scope = resolveSchoolScope(req, res);
    if (!scope) {
      return;
    }
    const { schoolId } = scope;

    const params = [schoolId];
    const conditions = [`${ATTENDANCE_SCHOOL_ALIAS}.school_id = $1`];

    if (req.query.date) {
      params.push(req.query.date);
      conditions.push(`${ATTENDANCE_SCHOOL_ALIAS}.date = $${params.length}`);
    }

    if (req.query.period) {
      params.push(Number(req.query.period));
      conditions.push(`${ATTENDANCE_SCHOOL_ALIAS}.period = $${params.length}`);
    }

    if (req.query.student_class) {
      params.push(String(req.query.student_class).trim());
      conditions.push(`TRIM(students.student_class) = $${params.length}`);
    }

    if (req.query.section) {
      params.push(String(req.query.section).trim());
      conditions.push(`TRIM(students.section) = $${params.length}`);
    }

    const teacherScopeClause = buildTeacherStudentScopeClause(req.user, params);
    const whereClause = conditions.join(" AND ");

    const result = await pool.query(
      `
      SELECT
        attendance.*,
        students.name,
        students.student_class,
        students.section
      FROM attendance
      JOIN students
        ON attendance.student_id = students.id
      WHERE ${whereClause}
      ${teacherScopeClause}
      ORDER BY attendance.date DESC, students.name ASC
      `,
      params
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Error fetching attendance",
    });
  }
};

const getStudentAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const scope = resolveSchoolScope(req, res);
    if (!scope) {
      return;
    }
    const { schoolId } = scope;
    const studentId = Number(id);

    const studentAllowed = await verifyStudentInSchool(studentId, schoolId);
    if (!studentAllowed) {
      return res.status(404).json({
        error: "Student not found in your school",
      });
    }

    const teacherAllowed = await verifyTeacherCanAccessStudent(
      req.user,
      studentId,
      schoolId
    );

    if (!teacherAllowed) {
      return res.status(403).json({
        error: "You can only view attendance for your assigned classes",
      });
    }

    const params = [studentId, schoolId];

    const result = await pool.query(
      `
      SELECT *
      FROM attendance
      WHERE student_id = $1
        AND school_id = $2
      ORDER BY date DESC
      `,
      params
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Error fetching student attendance",
    });
  }
};

const updateAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const scope = resolveSchoolScope(req, res);
    if (!scope) {
      return;
    }
    const { schoolId } = scope;

    const lookupParams = [id, schoolId];

    const existingAttendance = await pool.query(
      `
      SELECT id, date, student_id
      FROM attendance
      WHERE id = $1
        AND school_id = $2
      `,
      lookupParams
    );

    if (existingAttendance.rowCount === 0) {
      return res.status(404).json({
        error: "Attendance record not found",
      });
    }

    const existing = existingAttendance.rows[0];

    if (isTeacherRestrictedToToday(req.user, existing.date)) {
      return res.status(403).json({
        error: "Attendance can only be marked for today's date",
      });
    }

    const teacherAllowed = await verifyTeacherCanAccessStudent(
      req.user,
      existing.student_id,
      schoolId
    );

    if (!teacherAllowed) {
      return res.status(403).json({
        error: "You can only update attendance for your assigned classes",
      });
    }

    const result = await pool.query(
      `
      UPDATE attendance
      SET
        status = $1,
        teacher_id = $2
      WHERE id = $3
        AND school_id = $4
      RETURNING *
      `,
      [status, req.user.id, id, schoolId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: "Attendance record not found",
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Error updating attendance",
    });
  }
};

const bulkSubmitAttendance = async (req, res) => {
  const client = await pool.connect();

  try {
    const scope = resolveSchoolScope(req, res);
    if (!scope) {
      return;
    }
    const { schoolId } = scope;
    const writeSchoolId = resolveSchoolIdForWrite(req, res);
    if (writeSchoolId == null) {
      return;
    }

    const { date, period, records } = req.body;

    if (writeSchoolId !== schoolId) {
      return res.status(400).json({
        error: "School context mismatch",
      });
    }

    if (isTeacherRestrictedToToday(req.user, date)) {
      return res.status(403).json({
        error: "Attendance can only be marked for today's date",
      });
    }

    await client.query("BEGIN");

    let created = 0;
    let updated = 0;
    const savedRecords = [];

    for (const record of records) {
      const { student_id, status, attendance_id: attendanceId } = record;

      const studentAllowed = await verifyStudentInSchool(student_id, schoolId);
      if (!studentAllowed) {
        await client.query("ROLLBACK");
        return res.status(404).json({
          error: `Student not found in your school (id: ${student_id})`,
        });
      }

      const teacherAllowed = await verifyTeacherCanAccessStudent(
        req.user,
        student_id,
        schoolId
      );

      if (!teacherAllowed) {
        await client.query("ROLLBACK");
        return res.status(403).json({
          error: "You can only mark attendance for your assigned classes",
        });
      }

      if (attendanceId) {
        const existing = await client.query(
          `
          SELECT id, student_id, date
          FROM attendance
          WHERE id = $1
            AND school_id = $2
          FOR UPDATE
          `,
          [attendanceId, schoolId]
        );

        if (existing.rowCount === 0) {
          await client.query("ROLLBACK");
          return res.status(404).json({
            error: `Attendance record not found (id: ${attendanceId})`,
          });
        }

        if (Number(existing.rows[0].student_id) !== Number(student_id)) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            error: `Attendance record ${attendanceId} does not belong to student ${student_id}`,
          });
        }

        const updateResult = await client.query(
          `
          UPDATE attendance
          SET status = $1,
              teacher_id = $2
          WHERE id = $3
            AND school_id = $4
          RETURNING *
          `,
          [status, req.user.id, attendanceId, schoolId]
        );

        updated += 1;
        savedRecords.push(updateResult.rows[0]);
        continue;
      }

      const duplicate = await client.query(
        `
        SELECT id
        FROM attendance
        WHERE student_id = $1
          AND date = $2
          AND period = $3
          AND school_id = $4
        FOR UPDATE
        `,
        [student_id, date, period, schoolId]
      );

      if (duplicate.rowCount > 0) {
        const updateResult = await client.query(
          `
          UPDATE attendance
          SET status = $1,
              teacher_id = $2
          WHERE id = $3
            AND school_id = $4
          RETURNING *
          `,
          [status, req.user.id, duplicate.rows[0].id, schoolId]
        );

        updated += 1;
        savedRecords.push(updateResult.rows[0]);
        continue;
      }

      const insertResult = await client.query(
        `
        INSERT INTO attendance
        (
          student_id,
          teacher_id,
          date,
          period,
          status,
          school_id
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
        `,
        [student_id, req.user.id, date, period, status, schoolId]
      );

      created += 1;
      savedRecords.push(insertResult.rows[0]);
    }

    await client.query("COMMIT");

    res.json({
      message: "Attendance saved successfully",
      created,
      updated,
      records: savedRecords,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Error saving attendance",
    });
  } finally {
    client.release();
  }
};

module.exports = {
  markAttendance,
  getAttendance,
  getStudentAttendance,
  updateAttendance,
  bulkSubmitAttendance,
  ALLOWED_STATUSES,
  verifyTeacherCanAccessStudent,
};
