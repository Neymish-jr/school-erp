const pool = require("../db");
const classSchema = require("../validators/classValidator");
const { successResponse, errorResponse } = require("../utils/response");

// CREATE CLASS
const createClass = async (req, res) => {

  try {

    const { error } = classSchema.validate(req.body);

    if (error) {
      return errorResponse(res, { message: error.details[0].message, error: error.details[0].message, status: 400 });
    }

    const { class_name } = req.body;

    const result = await pool.query(
      "INSERT INTO classes (class_name, school_id) VALUES ($1, $2) RETURNING *",
      [class_name, 1]
    );

    return successResponse(res, { data: result.rows[0], message: "Class created successfully" });

  } catch (err) {

    console.error(err);
    return errorResponse(res, { message: "Error creating class", error: err.message, status: 500 });

  }

};

// GET ALL CLASSES
const getClasses = async (req, res) => {

  try {

    const result = await pool.query(
      "SELECT * FROM classes ORDER BY id ASC"
    );

    return successResponse(res, { data: result.rows, message: "Classes fetched successfully" });

  } catch (err) {

    console.error(err);
    return errorResponse(res, { message: "Error fetching classes", error: err.message, status: 500 });

  }

};

module.exports = {
  createClass,
  getClasses
};