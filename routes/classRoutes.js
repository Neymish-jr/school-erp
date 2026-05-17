const express = require("express");
const router = express.Router();
const pool = require("../db");

// CREATE CLASS
router.post("/", async (req, res) => {
  try {

    const { class_name } = req.body;

    const result = await pool.query(
      "INSERT INTO classes (class_name, school_id) VALUES ($1, $2) RETURNING *",
      [class_name, 1]
    );

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).send("Error creating class");
  }
});

// GET ALL CLASSES
router.get("/", async (req, res) => {
  try {

    const result = await pool.query(
      "SELECT * FROM classes"
    );

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching classes");
  }
});

module.exports = router;