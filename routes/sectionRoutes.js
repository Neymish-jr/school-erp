const express = require("express");
const router = express.Router();
const pool = require("../db");

// CREATE SECTION
router.post("/", async (req, res) => {
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
      [section_name, class_id, class_teacher_id]
    );

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).send("Error creating section");
  }
});

// GET SECTIONS
router.get("/", async (req, res) => {
  try {

    const result = await pool.query(
      `
      SELECT
        sections.*,
        classes.class_name
      FROM sections
      JOIN classes
      ON sections.class_id = classes.id
      `
    );

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching sections");
  }
});

module.exports = router;