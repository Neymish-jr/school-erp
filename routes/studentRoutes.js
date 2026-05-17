const express = require("express");
const router = express.Router();
const pool = require("../db");

router.get("/", async (req, res) => {

  try {

    const search = req.query.search || "";

    const result = await pool.query(

      `
      SELECT * FROM students
      WHERE is_active = true
      AND name ILIKE $1
      ORDER BY name ASC
      `,

      [`%${search}%`]

    );

    res.json(result.rows);

  } catch (err) {

    console.error(err);
    res.status(500).send("Error fetching students");

  }

});
router.post("/", async (req, res) => {
  try {
    const {
      name,
      gender,
      category,
      student_class,
      section,
      school_id
    } = req.body;
if (
  !name ||
  !gender ||
  !category ||
  !student_class ||
  !section ||
  !school_id
) {
  return res.status(400).json({
    error: "All fields are required"
  });
}
    const result = await pool.query(
      `INSERT INTO students 
      (name, gender, category, student_class, section, school_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [name, gender, category, student_class, section, school_id]
    );

    res.json(result.rows[0]);

  }
  catch (err) {
  console.error(err);

  if (err.code === "23503") {
    return res.status(400).json({
      error: "Invalid school ID"
    });
  }

  res.status(500).send("Error adding student");
}
});
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "SELECT * FROM students WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).send("Student not found");
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching student");
  }
});
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const {
      name,
      gender,
      category,
      student_class,
      section,
      school_id
    } = req.body;

    const result = await pool.query(
      `UPDATE students
       SET name = $1,
           gender = $2,
           category = $3,
           student_class = $4,
           section = $5,
           school_id = $6
       WHERE id = $7
       RETURNING *`,
      [
        name,
        gender,
        category,
        student_class,
        section,
        school_id,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).send("Student not found");
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating student");
  }
});
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

const result = await pool.query(

  `
  UPDATE students
  SET is_active = false
  WHERE id = $1
  RETURNING *
  `,

  [id]

);

    if (result.rows.length === 0) {
      return res.status(404).send("Student not found");
    }

    res.json({
      message: "Student deleted successfully",
      student: result.rows[0]
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting student");
  }
});
module.exports = router;