const express = require("express");
const router = express.Router();
const pool = require("../db");

// ADD MARKS
router.post("/", async (req, res) => {
  try {

    const {
      student_id,
      subject_id,
      exam_id,
      marks_obtained,
      max_marks,
      teacher_id
    } = req.body;

    // VALIDATION
    if (marks_obtained > max_marks) {
      return res.status(400).send("Marks cannot exceed max marks");
    }

    if (marks_obtained < 0) {
      return res.status(400).send("Invalid marks");
    }

    const result = await pool.query(
      `
      INSERT INTO marks
      (
        student_id,
        subject_id,
        exam_id,
        marks_obtained,
        max_marks,
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
        max_marks,
        teacher_id
      ]
    );

    res.json(result.rows[0]);

  } catch (err) {

    console.error(err);

    if (err.code === "23505") {
      return res.status(400).send("Marks already entered");
    }

    res.status(500).send("Error adding marks");
  }
});

// GET MARKS
router.get("/", async (req, res) => {
  try {

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
      `
    );

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching marks");
  }
});

module.exports = router;