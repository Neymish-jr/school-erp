const pool = require("../db");

const buildSchoolClause = (role, schoolId, params, tableAlias = "s") => {
  if (role !== "super_admin" && schoolId != null) {
    params.push(schoolId);
    return ` AND ${tableAlias}.school_id = $${params.length}`;
  }

  return "";
};

const parseStudentId = (studentId) => {
  const parsedStudentId = Number(studentId);

  if (!Number.isInteger(parsedStudentId) || parsedStudentId <= 0) {
    return null;
  }

  return parsedStudentId;
};

// RUN PROMOTION LOGIC
const processPromotion = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { school_id: schoolId, role } = req.user;
    const parsedStudentId = parseStudentId(studentId);

    if (parsedStudentId == null) {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID",
      });
    }

    const studentParams = [parsedStudentId];
    const studentSchoolClause = buildSchoolClause(role, schoolId, studentParams);

    const studentResult = await pool.query(
      `
      SELECT *
      FROM students s
      WHERE s.id = $1
      ${studentSchoolClause}
      `,
      studentParams
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).send("Student not found");
    }

    const marksParams = [parsedStudentId];
    const marksSchoolClause = buildSchoolClause(role, schoolId, marksParams);

    const marksResult = await pool.query(
      `
      SELECT
        m.marks_obtained,
        m.max_marks
      FROM marks m
      JOIN students s ON s.id = m.student_id
      WHERE m.student_id = $1
      ${marksSchoolClause}
      `,
      marksParams
    );

    if (marksResult.rows.length === 0) {
      return res.status(400).send("No marks found");
    }

    const attendanceParams = [parsedStudentId];
    const attendanceSchoolClause = buildSchoolClause(role, schoolId, attendanceParams);

    const attendanceResult = await pool.query(
      `
      SELECT
        COUNT(*) FILTER (WHERE a.status = 'Present')
          AS present_days,
        COUNT(*) AS total_days
      FROM attendance a
      JOIN students s ON s.id = a.student_id
      WHERE a.student_id = $1
      ${attendanceSchoolClause}
      `,
      attendanceParams
    );

    const attendance = attendanceResult.rows[0];

    const presentDays = Number(attendance.present_days || 0);
    const totalDays = Number(attendance.total_days || 0);

    const attendancePercentage =
      totalDays === 0 ? 0 : (presentDays / totalDays) * 100;

    let totalObtained = 0;
    let totalMax = 0;
    let failedSubjects = 0;

    marksResult.rows.forEach((mark) => {
      const obtained = Number(mark.marks_obtained);
      const max = Number(mark.max_marks);

      totalObtained += obtained;
      totalMax += max;

      const percentage = (obtained / max) * 100;

      if (percentage < 40) {
        failedSubjects++;
      }
    });

    const overallPercentage = (totalObtained / totalMax) * 100;

    let status = "Promoted";

    if (attendancePercentage < 75) {
      status = "Detained";
    } else if (failedSubjects >= 3) {
      status = "Failed";
    } else if (failedSubjects > 0) {
      status = "Compartment";
    } else if (overallPercentage < 40) {
      status = "Failed";
    }

    res.json({
      student_id: parsedStudentId,
      attendance_percentage: attendancePercentage.toFixed(2),
      overall_percentage: overallPercentage.toFixed(2),
      failed_subjects: failedSubjects,
      final_status: status,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Error processing promotion",
    });
  }
};

module.exports = {
  processPromotion,
  buildSchoolClause,
  parseStudentId,
};
