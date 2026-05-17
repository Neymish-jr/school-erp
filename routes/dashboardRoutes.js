const express = require("express");
const router = express.Router();
const pool = require("../db");

router.get("/", async (req, res) => {

  try {

    const students = await pool.query(
      "SELECT COUNT(*) FROM students"
    );

    const teachers = await pool.query(
      "SELECT COUNT(*) FROM teachers"
    );

    const activities = await pool.query(
      "SELECT COUNT(*) FROM activities"
    );

    const expenses = await pool.query(
      "SELECT COUNT(*) FROM expenses"
    );

    res.json({

      total_students: students.rows[0].count,

      total_teachers: teachers.rows[0].count,

      total_activities: activities.rows[0].count,

      total_expenses: expenses.rows[0].count

    });

  } catch (err) {

    console.error(err);
    res.status(500).send("Dashboard error");

  }

});

module.exports = router;