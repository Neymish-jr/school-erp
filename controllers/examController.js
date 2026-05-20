const pool = require("../db");
const examSchema = require("../validators/examValidator");
const { successResponse, errorResponse } = require("../utils/response");

// CREATE EXAM
const createExam = async (req, res) => {
const { error } = examSchema.validate(req.body);

if (error) {
  return errorResponse(res, { message: error.details[0].message, error: error.details[0].message, status: 400 });
}

  try {

    const {
      exam_name,
      class_id,
      exam_type,
      start_date,
      end_date,
      total_marks
    } = req.body;

    // VALIDATION
    if (
      !exam_name ||
      !class_id ||
      !start_date ||
      !end_date
    ) {
      return errorResponse(res, { message: "Required fields missing", error: "Required fields missing", status: 400 });
    }

    if (total_marks <= 0) {
      return errorResponse(res, { message: "Total marks must be greater than 0", error: "Total marks must be greater than 0", status: 400 });
    }

    const result = await pool.query(
      `
      INSERT INTO exams
      (
        exam_name,
        class_id,
        exam_type,
        start_date,
        end_date,
        total_marks
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
      [
        exam_name,
        class_id,
        exam_type,
        start_date,
        end_date,
        total_marks
      ]
    );

    return successResponse(res, { data: result.rows[0], message: "Exam created successfully" });

  } catch (err) {

    console.error(err);
    return errorResponse(res, { message: "Error creating exam", error: err.message, status: 500 });

  }

};

// GET EXAMS
const getExams = async (req, res) => {

  try {

    const result = await pool.query(
      `
      SELECT
        exams.*,
        classes.class_name
      FROM exams
      JOIN classes
      ON exams.class_id = classes.id

      ORDER BY exams.id ASC
      `
    );

    return successResponse(res, { data: result.rows, message: "Exams fetched successfully" });

  } catch (err) {

    console.error(err);
    return errorResponse(res, { message: "Error fetching exams", error: err.message, status: 500 });

  }

};

module.exports = {
  createExam,
  getExams
};