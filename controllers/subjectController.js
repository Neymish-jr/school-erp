const pool = require("../db");
const subjectSchema = require("../validators/subjectValidator");

// CREATE SUBJECT
const createSubject = async (req, res) => {
const { error } = subjectSchema.validate(req.body);

if (error) {
  return res.status(400).json({
    error: error.details[0].message
  });
}
  try {

    const {
      subject_name,
      subject_code,
      class_id,
      teacher_id
    } = req.body;


    const result = await pool.query(
      `
      INSERT INTO subjects
      (subject_name, subject_code, class_id, teacher_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [
        subject_name,
        subject_code,
        class_id,
        teacher_id || null
      ]
    );

    res.json(result.rows[0]);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false,
      message: "Error creating subject"
    });

  }

};

// GET SUBJECTS
const getSubjects = async (req, res) => {

  try {

    const result = await pool.query(
      `
      SELECT
        subjects.*,
        classes.class_name
      FROM subjects
      JOIN classes
      ON subjects.class_id = classes.id
      ORDER BY subjects.id ASC
      `
    );

    res.json(result.rows);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false,
      message: "Error fetching subjects"
    });

  }

};

module.exports = {
  createSubject,
  getSubjects
};