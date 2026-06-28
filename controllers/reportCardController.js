const pool = require("../db");
const { successResponse, errorResponse } = require("../utils/response");

const buildSchoolClause = (role, schoolId, params, tableAlias = "s") => {
  if (role !== "super_admin" && schoolId != null) {
    params.push(schoolId);
    return ` AND ${tableAlias}.school_id = $${params.length}`;
  }

  return "";
};

const EXAM_ORDER = [
  "Unit Test 1",
  "Unit Test 2",
  "Unit Test 3",
  "Unit Test 4",
  "Half Yearly",
  "Pre Board 1",
  "Pre Board 2",
  "Final Exam",
];

const getGrade = (percentage) => {
  if (percentage >= 90) {
    return "A+";
  }

  if (percentage >= 75) {
    return "A";
  }

  if (percentage >= 60) {
    return "B";
  }

  if (percentage >= 45) {
    return "C";
  }

  return "Fail";
};

const getStatus = (percentage) => (percentage >= 45 ? "Pass" : "Fail");

const getExamOrder = (examName) => {
  const index = EXAM_ORDER.indexOf(examName);

  if (index === -1) {
    return EXAM_ORDER.length + 1;
  }

  return index;
};

const getReportCard = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { school_id: schoolId, role } = req.user;

    const studentParams = [studentId];
    const studentSchoolClause = buildSchoolClause(role, schoolId, studentParams);

    const studentResult = await pool.query(
      `
      SELECT
        s.id,
        s.name,
        s.student_class,
        s.section,
        s.is_active,
        s.created_at
      FROM students s
      WHERE s.id = $1
      ${studentSchoolClause}
      `,
      studentParams
    );

    if (studentResult.rowCount === 0) {
      return errorResponse(res, {
        message: "Student not found",
        error: "Student not found",
        status: 404,
      });
    }

    const student = studentResult.rows[0];

    const resultParams = [studentId];
    const resultsSchoolClause = buildSchoolClause(role, schoolId, resultParams);

    const resultRows = await pool.query(
      `
      SELECT
        sr.id,
        sr.student_id,
        sr.subject_id,
        sr.exam_name,
        sr.marks_obtained,
        sr.max_marks,
        sr.percentage,
        sr.result_status,
        sr.created_at,
        subjects.subject_name,
        subjects.subject_code
      FROM student_results AS sr
      JOIN students s
        ON s.id = sr.student_id
      JOIN subjects
        ON subjects.id = sr.subject_id
      WHERE sr.student_id = $1
      ${resultsSchoolClause}
      ORDER BY sr.created_at ASC
      `,
      resultParams
    );

    const examGroups = new Map();
    let totalObtained = 0;
    let totalMax = 0;

    resultRows.rows.forEach((row) => {
      const examName = row.exam_name;
      const existing = examGroups.get(examName) || {
        exam_name: examName,
        subjects: [],
        obtained_marks: 0,
        total_marks: 0,
      };

      const subjectPercentage = Number(row.percentage || 0);
      const subjectStatus = row.result_status || getStatus(subjectPercentage);

      existing.subjects.push({
        subject_id: row.subject_id,
        subject_name: row.subject_name,
        subject_code: row.subject_code,
        marks_obtained: Number(row.marks_obtained),
        max_marks: Number(row.max_marks),
        percentage: Number(subjectPercentage.toFixed(2)),
        status: subjectStatus,
      });

      existing.obtained_marks += Number(row.marks_obtained);
      existing.total_marks += Number(row.max_marks);

      totalObtained += Number(row.marks_obtained);
      totalMax += Number(row.max_marks);

      examGroups.set(examName, existing);
    });

    const sortedExamGroups = Array.from(examGroups.values())
      .map((group) => {
        const percentage = group.total_marks === 0
          ? 0
          : (group.obtained_marks / group.total_marks) * 100;

        return {
          ...group,
          percentage: Number(percentage.toFixed(2)),
          grade: getGrade(percentage),
          status: getStatus(percentage),
          subjects: group.subjects.sort((first, second) =>
            (first.subject_name || "").localeCompare(second.subject_name || "")
          ),
        };
      })
      .sort((first, second) => getExamOrder(first.exam_name) - getExamOrder(second.exam_name));

    const overallPercentage = totalMax === 0 ? 0 : (totalObtained / totalMax) * 100;

    return successResponse(res, {
      data: {
        student: {
          id: student.id,
          name: student.name,
          student_class: student.student_class,
          section: student.section,
          roll_number: student.id,
        },
        summary: {
          total_marks: totalMax,
          obtained_marks: totalObtained,
          percentage: Number(overallPercentage.toFixed(2)),
          grade: getGrade(overallPercentage),
          status: getStatus(overallPercentage),
        },
        exam_groups: sortedExamGroups,
      },
      message: "Report card fetched successfully",
    });
  } catch (err) {
    console.error(err);

    return errorResponse(res, {
      message: "Error generating report card",
      error: err.message,
      status: 500,
    });
  }
};

module.exports = {
  getReportCard,
  buildSchoolClause,
};
