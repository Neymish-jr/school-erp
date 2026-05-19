const pool = require("../db");
const sectionSchema = require("../validators/sectionValidator");

// CREATE SECTION
const createSection = async (req, res) => {
const { error } = sectionSchema.validate(req.body);

if (error) {
  return res.status(400).json({
    error: error.details[0].message
  });
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

    res.json(result.rows[0]);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false,
      message: "Error creating section"
    });

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

    res.json(result.rows);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false,
      message: "Error fetching sections"
    });

  }

};

module.exports = {
  createSection,
  getSections
};