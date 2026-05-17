const express = require("express");
const router = express.Router();
const pool = require("../db");

// CREATE EXAM
router.post("/", async (req, res) => {
  try {

    const {
      exam_name,
      class_id,
      exam_type,
      start_date,
      end_date,
      total_marks
    } = req.body;

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

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).send("Error creating exam");
  }
});

// GET EXAMS
router.get("/", async (req, res) => {
  try {

    const result = await pool.query(
      `
      SELECT
        exams.*,
        classes.class_name
      FROM exams
      JOIN classes
      ON exams.class_id = classes.id
      `
    );

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching exams");
  }
});

module.exports = router;