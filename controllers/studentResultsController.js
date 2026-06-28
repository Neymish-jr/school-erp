const pool = require("../db");
const studentResultsSchema = require("../validators/studentResultsValidator");
const { successResponse, errorResponse } = require("../utils/response");

const buildSchoolClause = (role, schoolId, params, tableAlias = "students") => {
  if (role !== "super_admin" && schoolId != null) {
    params.push(schoolId);
    return ` AND ${tableAlias}.school_id = $${params.length}`;
  }

  return "";
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

const calculatePercentage = (marksObtained, maxMarks) => {
  const obtained = Number(marksObtained);
  const total = Number(maxMarks);

  if (!Number.isFinite(obtained) || !Number.isFinite(total) || total <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, (obtained / total) * 100));
};

const getResultStatus = (percentage) => (
  percentage >= 40 ? "Pass" : "Fail"
);

const createStudentResult = async (req, res) => {
  const { error } = studentResultsSchema.validate(req.body);

  if (error) {
    return errorResponse(res, {
      message: error.details[0].message,
      error: error.details[0].message,
      status: 400,
    });
  }

  try {
    const { school_id: schoolId, role } = req.user;
    const {
      student_id,
      subject_id,
      exam_name,
      marks_obtained,
      max_marks,
    } = req.body;

    const studentAllowed = await verifyStudentInSchool(student_id, role, schoolId);
    if (!studentAllowed) {
      return errorResponse(res, {
        message: "Student not found in your school",
        error: "Student not found in your school",
        status: 404,
      });
    }

    if (Number(marks_obtained) > Number(max_marks)) {
      return errorResponse(res, {
        message: "Marks obtained cannot exceed maximum marks",
        error: "Validation failed",
        status: 400,
      });
    }

    const duplicateParams = [student_id, subject_id, exam_name];
    const duplicateSchoolClause = buildSchoolClause(role, schoolId, duplicateParams, "students");

    const duplicate = await pool.query(
      `
      SELECT sr.id
      FROM student_results sr
      JOIN students ON students.id = sr.student_id
      WHERE sr.student_id = $1
        AND sr.subject_id = $2
        AND LOWER(TRIM(sr.exam_name)) = LOWER(TRIM($3))
      ${duplicateSchoolClause}
      `,
      duplicateParams
    );

    if (duplicate.rowCount > 0) {
      return errorResponse(res, {
        message: "A result for this student, subject, and exam already exists",
        error: "Duplicate result",
        status: 409,
      });
    }

    const percentage = calculatePercentage(marks_obtained, max_marks);
    const result_status = getResultStatus(percentage);

    const result = await pool.query(
      `
      INSERT INTO student_results
      (
        student_id,
        subject_id,
        exam_name,
        marks_obtained,
        max_marks,
        percentage,
        result_status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
      `,
      [
        student_id,
        subject_id,
        exam_name.trim(),
        Number(marks_obtained),
        Number(max_marks),
        Number(percentage.toFixed(2)),
        result_status,
      ]
    );

    return successResponse(res, {
      data: result.rows[0],
      message: "Result added successfully",
    });
  } catch (err) {
    console.error(err);

    if (err.code === "23503") {
      return errorResponse(res, {
        message: "Invalid student or subject selected",
        error: "Foreign key validation failed",
        status: 400,
      });
    }

    return errorResponse(res, {
      message: "Error adding result",
      error: err.message,
      status: 500,
    });
  }
};

const getStudentResults = async (req, res) => {
  try {
    const { school_id: schoolId, role } = req.user;
    const params = [];
    const schoolClause = buildSchoolClause(role, schoolId, params, "students");

    const result = await pool.query(
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
        students.name AS student_name,
        students.student_class,
        students.section,
        subjects.subject_name,
        subjects.subject_code
      FROM student_results AS sr
      JOIN students
        ON students.id = sr.student_id
      JOIN subjects
        ON subjects.id = sr.subject_id
      WHERE 1 = 1
      ${schoolClause}
      ORDER BY sr.created_at DESC
      `,
      params
    );

    return successResponse(res, {
      data: result.rows,
      message: "Results fetched successfully",
    });
  } catch (err) {
    console.error(err);
    return errorResponse(res, {
      message: "Error fetching results",
      error: err.message,
      status: 500,
    });
  }
};

module.exports = {
  createStudentResult,
  getStudentResults,
  buildSchoolClause,
  verifyStudentInSchool,
};
