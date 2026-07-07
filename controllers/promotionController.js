const pool = require("../db");
const {
  buildSchoolClause,
  resolveSchoolScope,
} = require("../utils/tenantScope");
const {
  isPassingPercentage,
  PASS_MARK_PERCENTAGE,
} = require("../constants/assessmentResults");

const parseStudentId = (studentId) => {
  const parsedStudentId = Number(studentId);

  if (!Number.isInteger(parsedStudentId) || parsedStudentId <= 0) {
    return null;
  }

  return parsedStudentId;
};

const normalizeAssessmentRow = (row) => ({
  marks_obtained: Number(row.marks_obtained),
  max_marks: Number(row.max_marks),
});

const fetchStudentAssessmentRows = async (studentId, role, schoolId) => {
  const studentResultsParams = [studentId];
  const studentResultsClause = buildSchoolClause(
    role,
    schoolId,
    studentResultsParams,
    "students"
  );

  const studentResults = await pool.query(
    `
    SELECT
      sr.marks_obtained,
      sr.max_marks
    FROM student_results sr
    JOIN students ON students.id = sr.student_id
    WHERE sr.student_id = $1
    ${studentResultsClause}
    `,
    studentResultsParams
  );

  if (studentResults.rows.length > 0) {
    return {
      source: "student_results",
      rows: studentResults.rows.map(normalizeAssessmentRow),
    };
  }

  const marksParams = [studentId];
  const marksClause = buildSchoolClause(role, schoolId, marksParams, "students");

  const marksResult = await pool.query(
    `
    SELECT
      m.marks_obtained,
      m.total_marks AS max_marks
    FROM marks m
    JOIN students ON students.id = m.student_id
    WHERE m.student_id = $1
    ${marksClause}
    `,
    marksParams
  );

  return {
    source: "marks",
    rows: marksResult.rows.map(normalizeAssessmentRow),
  };
};

const processPromotion = async (req, res) => {
  try {
    const { studentId } = req.params;
    const scope = resolveSchoolScope(req, res);
    if (!scope) {
      return;
    }
    const { schoolId, role } = scope;
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

    const assessment = await fetchStudentAssessmentRows(
      parsedStudentId,
      role,
      schoolId
    );

    if (assessment.rows.length === 0) {
      return res.status(400).send("No marks found");
    }

    const attendanceParams = [parsedStudentId];
    const attendanceSchoolClause = buildSchoolClause(
      role,
      schoolId,
      attendanceParams
    );

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

    assessment.rows.forEach((mark) => {
      const obtained = Number(mark.marks_obtained);
      const max = Number(mark.max_marks);

      totalObtained += obtained;
      totalMax += max;

      const percentage = max === 0 ? 0 : (obtained / max) * 100;

      if (!isPassingPercentage(percentage)) {
        failedSubjects++;
      }
    });

    const overallPercentage = totalMax === 0 ? 0 : (totalObtained / totalMax) * 100;

    let status = "Promoted";

    if (attendancePercentage < 75) {
      status = "Detained";
    } else if (failedSubjects >= 3) {
      status = "Failed";
    } else if (failedSubjects > 0) {
      status = "Compartment";
    } else if (!isPassingPercentage(overallPercentage)) {
      status = "Failed";
    }

    res.json({
      student_id: parsedStudentId,
      assessment_source: assessment.source,
      attendance_percentage: attendancePercentage.toFixed(2),
      overall_percentage: overallPercentage.toFixed(2),
      failed_subjects: failedSubjects,
      pass_mark_percentage: PASS_MARK_PERCENTAGE,
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
  fetchStudentAssessmentRows,
};
