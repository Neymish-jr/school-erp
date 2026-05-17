const express = require("express");
const router = express.Router();
const pool = require("../db");

// CREATE SUBJECT
router.post("/", async (req, res) => {
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
      [subject_name, subject_code, class_id, teacher_id]
    );

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).send("Error creating subject");
  }
});

// GET SUBJECTS
router.get("/", async (req, res) => {
  try {

    const result = await pool.query(
      `
      SELECT
        subjects.*,
        classes.class_name
      FROM subjects
      JOIN classes
      ON subjects.class_id = classes.id
      `
    );

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching subjects");
  }
});

module.exports = router;