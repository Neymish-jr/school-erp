const pool = require("../db");
const examSchema = require("../validators/examValidator");
const { successResponse, errorResponse } = require("../utils/response");

const EXAM_OPTIONS = [
  "Unit Test 1",
  "Unit Test 2",
  "Unit Test 3",
  "Unit Test 4",
  "Half Yearly",
  "Final Exam",
];

const ADDITIONAL_EXAM_OPTIONS = ["Pre Board 1", "Pre Board 2"];
const ACADEMIC_YEAR_OPTIONS = ["2025-26", "2026-27", "2027-28"];

const buildAllowedExamNames = (className = "") => {
  const normalizedClass = String(className).trim().toLowerCase();

  if (
    normalizedClass === "10" ||
    normalizedClass === "12" ||
    normalizedClass === "class 10" ||
    normalizedClass === "class 12" ||
    normalizedClass === "10th" ||
    normalizedClass === "12th"
  ) {
    return [...EXAM_OPTIONS, ...ADDITIONAL_EXAM_OPTIONS];
  }

  return EXAM_OPTIONS;
};

const getClassName = async (classId) => {
  const result = await pool.query(
    `
    SELECT class_name
    FROM classes
    WHERE id = $1
    `,
    [classId]
  );

  if (result.rowCount === 0) {
    return null;
  }

  return result.rows[0].class_name;
};

const createExam = async (req, res) => {
  const { error } = examSchema.validate(req.body);

  if (error) {
    return errorResponse(res, {
      message: error.details[0].message,
      error: error.details[0].message,
      status: 400,
    });
  }

  try {
    const {
      exam_name,
      class_id,
      exam_type,
      academic_year,
      start_date,
      end_date,
      total_marks,
    } = req.body;

    const className = await getClassName(class_id);

    if (!className) {
      return errorResponse(res, {
        message: "Invalid class selected",
        error: "Invalid class selected",
        status: 400,
      });
    }

    if (!ACADEMIC_YEAR_OPTIONS.includes(academic_year)) {
      return errorResponse(res, {
        message: "Invalid academic year selected",
        error: "Invalid academic year selected",
        status: 400,
      });
    }

    const allowedExamNames = buildAllowedExamNames(className);

    if (!allowedExamNames.includes(exam_name)) {
      return errorResponse(res, {
        message: "Invalid exam selected",
        error: "Invalid exam selected",
        status: 400,
      });
    }

    if (new Date(start_date) > new Date(end_date)) {
      return errorResponse(res, {
        message: "Start date cannot be after end date",
        error: "Start date cannot be after end date",
        status: 400,
      });
    }

    const duplicate = await pool.query(
      `
      SELECT id
      FROM exams
      WHERE exam_name = $1
        AND class_id = $2
        AND academic_year = $3
      `,
      [exam_name, class_id, academic_year]
    );

    if (duplicate.rowCount > 0) {
      return errorResponse(res, {
        message: "Exam already exists for this class and academic year",
        error: "Exam already exists for this class and academic year",
        status: 409,
      });
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
        total_marks,
        academic_year
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
      `,
      [
        exam_name,
        class_id,
        exam_type,
        start_date,
        end_date,
        total_marks,
        academic_year,
      ]
    );

    return successResponse(res, {
      data: result.rows[0],
      message: "Exam created successfully",
    });
  } catch (err) {
    console.error(err);

    if (err.code === "23505") {
      return errorResponse(res, {
        message: "Exam already exists for this class and academic year",
        error: "Exam already exists for this class and academic year",
        status: 409,
      });
    }

    return errorResponse(res, {
      message: "Error creating exam",
      error: err.message,
      status: 500,
    });
  }
};

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
      ORDER BY exams.start_date DESC, exams.id DESC
      `
    );

    return successResponse(res, {
      data: result.rows,
      message: "Exams fetched successfully",
    });
  } catch (err) {
    console.error(err);
    return errorResponse(res, {
      message: "Error fetching exams",
      error: err.message,
      status: 500,
    });
  }
};

module.exports = {
  createExam,
  getExams,
};