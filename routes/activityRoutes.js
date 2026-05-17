const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const pool = require("../db");


router.get("/", async (req, res) => {

  try {

    const result = await pool.query(

      `
      SELECT

      activities.*,

      teachers.teacher_name,
      teachers.designation,

      schools.school_name

      FROM activities

      LEFT JOIN teachers
      ON activities.assigned_teacher_id = teachers.id

      LEFT JOIN schools
      ON activities.school_id = schools.id

      ORDER BY activities.id DESC
      `

    );

    res.json(result.rows);

  } catch (err) {

    console.error(err);
    res.status(500).send("Error fetching activities");

  }

});


router.post("/", async (req, res) => {

  try {

    const {
      activity_name,
      description,
      allocated_budget,
      assigned_teacher_id,
      school_id
    } = req.body;

    if (
      !activity_name ||
      !description ||
      !allocated_budget ||
      !assigned_teacher_id ||
      !school_id
    ) {
      return res.status(400).json({
        error: "All fields are required"
      });
    }

    if (allocated_budget <= 0) {
      return res.status(400).json({
        error: "Invalid budget"
      });
    }

    const requiresQuotation = allocated_budget > 50000;

    const result = await pool.query(

      `
      INSERT INTO activities
      (
        activity_name,
        description,
        allocated_budget,
        assigned_teacher_id,
        school_id,
        status
      )

      VALUES ($1, $2, $3, $4, $5, $6)

      RETURNING *
      `,

      [
        activity_name,
        description,
        allocated_budget,
        assigned_teacher_id,
        school_id,
        "Pending"
      ]

    );

    res.json({
      activity: result.rows[0],
      requiresQuotation
    });

  } catch (err) {

    console.error(err);
    res.status(500).send("Error adding activity");

  }

});


router.put("/:id/status", async (req, res) => {

  try {

    const { id } = req.params;
    const { status } = req.body;
    const allowedStatuses = [
      "Pending",
      "Approved",
      "Rejected",
      "Completed"
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).send("Invalid status");
    }
    const result = await pool.query(
      `
      UPDATE activities
      SET status = $1
      WHERE id = $2
      RETURNING *
      `,
      [status, id]
    );

    res.json(result.rows[0]);

  } catch (err) {

    console.error(err);
    res.status(500).send("Error updating status");

  }

});
router.post("/:id/upload", upload.single("file"), async (req, res) => {

  try {

    const { id } = req.params;

    if (!req.file) {
      return res.status(400).send("No file uploaded");
    }
    const filePath = req.file.path;

    await pool.query(
      `
      UPDATE activities
      SET file_path = $1
      WHERE id = $2
      `,
      [filePath, id]
    );

    res.json({
      message: "File uploaded successfully",
      file_path: filePath
    });

  } catch (err) {

    console.error(err);
    res.status(500).send("Upload failed");

  }

});

module.exports = router;