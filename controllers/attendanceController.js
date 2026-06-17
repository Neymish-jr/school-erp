const pool = require("../db");

const ALLOWED_STATUSES = ["Present", "Absent", "Late", "Leave"];

const getTodayDateString = () => new Date().toISOString().split("T")[0];

const isTeacherRestrictedToToday = (user, date) => {
  return user?.role === "teacher" && date !== getTodayDateString();
};

const buildSchoolClause = (role, schoolId, params, tableAlias = "attendance") => {
  if (role !== "super_admin" && schoolId != null) {
    params.push(schoolId);
    return ` AND ${tableAlias}.school_id = $${params.length}`;
  }

  return "";
};

const resolveSchoolIdForWrite = (req, res) => {
  const { school_id: schoolId } = req.user;

  if (schoolId == null) {
    res.status(400).json({
      error: "School context is required for this operation",
    });
    return null;
  }

  return schoolId;
};

const verifyStudentInSchool = async (studentId, role, schoolId) => {
  const params = [studentId];
  const schoolClause = buildSchoolClause(role, schoolId, params, "students");

  const result = await pool.query(
    `
    SELECT id
    FROM students
    WHERE id = $1
      AND is_active = true
    ${schoolClause}
    `,
    params
  );

  return result.rowCount > 0;
};

// MARK ATTENDANCE
const markAttendance = async (req, res) => {
  try {
    const { school_id: schoolId, role } = req.user;
    const writeSchoolId = resolveSchoolIdForWrite(req, res);
    if (writeSchoolId == null) {
      return;
    }

    const {
      student_id,
      date,
      period,
      status,
    } = req.body;

    if (
      student_id === undefined ||
      date === undefined ||
      period === undefined ||
      status === undefined
    ) {
      return res.status(400).json({
        error: "All fields are required",
      });
    }

    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        error: "Invalid status",
      });
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        error: "Invalid date",
      });
    }

    if (isTeacherRestrictedToToday(req.user, date)) {
      return res.status(403).json({
        error: "Attendance can only be marked for today's date",
      });
    }

    const studentAllowed = await verifyStudentInSchool(student_id, role, schoolId);
    if (!studentAllowed) {
      return res.status(404).json({
        error: "Student not found in your school",
      });
    }

    const existingParams = [student_id, date, period];
    const existingSchoolClause = buildSchoolClause(role, schoolId, existingParams);

    const existingAttendance = await pool.query(
      `
      SELECT id
      FROM attendance
      WHERE student_id = $1
        AND date = $2
        AND period = $3
      ${existingSchoolClause}
      `,
      existingParams
    );

    if (existingAttendance.rows.length > 0) {
      return res.status(400).json({
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
      [
        student_id,
        req.user.id,
        date,
        period,
        status,
        writeSchoolId,
      ]
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
    const { school_id: schoolId, role } = req.user;
    const params = [];
    const schoolClause = buildSchoolClause(role, schoolId, params);

    const result = await pool.query(
      `
      SELECT
        attendance.*,
        students.name
      FROM attendance
      JOIN students
        ON attendance.student_id = students.id
      WHERE 1 = 1
      ${schoolClause}
      ORDER BY attendance.date DESC
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
    const { school_id: schoolId, role } = req.user;

    const studentAllowed = await verifyStudentInSchool(Number(id), role, schoolId);
    if (!studentAllowed) {
      return res.status(404).json({
        error: "Student not found in your school",
      });
    }

    const params = [id];
    const schoolClause = buildSchoolClause(role, schoolId, params);

    const result = await pool.query(
      `
      SELECT *
      FROM attendance
      WHERE student_id = $1
      ${schoolClause}
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
    const { school_id: schoolId, role } = req.user;

    if (status === undefined) {
      return res.status(400).json({
        error: "Status is required",
      });
    }

    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        error: "Invalid status",
      });
    }

    const lookupParams = [id];
    const lookupSchoolClause = buildSchoolClause(role, schoolId, lookupParams);

    const existingAttendance = await pool.query(
      `
      SELECT date
      FROM attendance
      WHERE id = $1
      ${lookupSchoolClause}
      `,
      lookupParams
    );

    if (existingAttendance.rowCount === 0) {
      return res.status(404).json({
        error: "Attendance record not found",
      });
    }

    if (isTeacherRestrictedToToday(req.user, existingAttendance.rows[0].date)) {
      return res.status(403).json({
        error: "Attendance can only be marked for today's date",
      });
    }

    const updateParams = [status, req.user.id, id];
    const updateSchoolClause = buildSchoolClause(role, schoolId, updateParams);

    const result = await pool.query(
      `
      UPDATE attendance
      SET
        status = $1,
        teacher_id = $2
      WHERE id = $3
      ${updateSchoolClause}
      RETURNING *
      `,
      updateParams
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

module.exports = {
  markAttendance,
  getAttendance,
  getStudentAttendance,
  updateAttendance,
};
