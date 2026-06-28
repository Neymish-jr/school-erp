const pool = require("../db");
const markSchema = require("../validators/markValidator");
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

// ADD MARKS
const createMark = async (req, res) => {
const { error } = markSchema.validate(req.body);

if (error) {
  return errorResponse(res, { message: error.details[0].message, error: error.details[0].message, status: 400 });
}
  try {
    const { school_id: schoolId, role } = req.user;
    const {
      student_id,
      subject_id,
      exam_id,
      marks_obtained,
      total_marks,
    } = req.body;

    const studentAllowed = await verifyStudentInSchool(student_id, role, schoolId);
    if (!studentAllowed) {
      return errorResponse(res, {
        message: "Student not found in your school",
        error: "Student not found in your school",
        status: 404,
      });
    }
    
    const result = await pool.query(
      `
      INSERT INTO marks
      (
        student_id,
        subject_id,
        exam_id,
        marks_obtained,
        total_marks,
        teacher_id
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
      [
        student_id,
        subject_id,
        exam_id,
        marks_obtained,
        total_marks,
        req.user.id
      ]
    );

    return successResponse(res, { data: result.rows[0], message: "Marks added successfully" });

  } catch (err) {

    console.error(err);

    if (err.code === "23505") {
      return errorResponse(res, { message: "Marks already entered", error: "Marks already entered", status: 400 });
    }

    return errorResponse(res, { message: "Error adding marks", error: err.message, status: 500 });

  }

};

// GET MARKS
const getMarks = async (req, res) => {

  try {
    const { school_id: schoolId, role } = req.user;
    const params = [];
    const schoolClause = buildSchoolClause(role, schoolId, params, "students");

    const result = await pool.query(
      `
      SELECT
        marks.*,
        students.name AS student_name,
        subjects.subject_name,
        exams.exam_name
      FROM marks

      JOIN students
      ON marks.student_id = students.id

      JOIN subjects
      ON marks.subject_id = subjects.id

      JOIN exams
      ON marks.exam_id = exams.id

      WHERE 1 = 1
      ${schoolClause}
      ORDER BY marks.id ASC
      `,
      params
    );

    return successResponse(res, { data: result.rows, message: "Marks fetched successfully" });

  } catch (err) {

    console.error(err);
    return errorResponse(res, { message: "Error fetching marks", error: err.message, status: 500 });

  }

};

module.exports = {
  createMark,
  getMarks,
  buildSchoolClause,
  verifyStudentInSchool,
};
