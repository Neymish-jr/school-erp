const pool = require("../db");

// CREATE SUBJECT
const createSubject = async (req, res) => {

  try {

    const {
      subject_name,
      subject_code,
      class_id,
      teacher_id
    } = req.body;

    if (
      !subject_name ||
      !subject_code ||
      !class_id
    ) {
      return res.status(400).json({
        error: "Subject name, subject code and class ID are required"
      });
    }

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