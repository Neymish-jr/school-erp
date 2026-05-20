const pool = require("../db");
const sectionSchema = require("../validators/sectionValidator");
const { successResponse, errorResponse } = require("../utils/response");

// CREATE SECTION
const createSection = async (req, res) => {
const { error } = sectionSchema.validate(req.body);

if (error) {
  return errorResponse(res, { message: error.details[0].message, error: error.details[0].message, status: 400 });
}

  try {

    const {
      section_name,
      class_id,
      class_teacher_id
    } = req.body;

    const result = await pool.query(
      `
      INSERT INTO sections
      (section_name, class_id, class_teacher_id)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [
        section_name,
        class_id,
        class_teacher_id || null
      ]
    );

    return successResponse(res, { data: result.rows[0], message: "Section created successfully" });

  } catch (err) {

    console.error(err);
    return errorResponse(res, { message: "Error creating section", error: err.message, status: 500 });

  }

};

// GET SECTIONS
const getSections = async (req, res) => {

  try {

    const result = await pool.query(
      `
      SELECT
        sections.*,
        classes.class_name
      FROM sections
      JOIN classes
      ON sections.class_id = classes.id
      ORDER BY sections.id ASC
      `
    );

    return successResponse(res, { data: result.rows, message: "Sections fetched successfully" });

  } catch (err) {

    console.error(err);
    return errorResponse(res, { message: "Error fetching sections", error: err.message, status: 500 });

  }

};

module.exports = {
  createSection,
  getSections
};