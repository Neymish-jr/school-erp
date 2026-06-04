const express = require("express");
const router = express.Router();
const pool = require("../db");

const {
  authenticate,
  isAdmin
} = require("../middleware/auth");

router.get(
  "/",
   async (req, res) => {

    try {

      const students = await pool.query(
        `
        SELECT COUNT(*) FROM students
        `
      );

      const teachers = await pool.query(
        `
        SELECT COUNT(*) FROM users
        WHERE role = 'teacher'
        `
      );

      const activities = await pool.query(
        `
        SELECT COUNT(*) FROM activities
        `
      );

      const expenses = await pool.query(
        `
        SELECT COALESCE(SUM(amount), 0)
        FROM expenses
        `
      );

      const attendance = await pool.query(
        `
        SELECT
          COUNT(*) FILTER (
            WHERE status = 'Present'
          ) * 100.0 /
          NULLIF(COUNT(*), 0)
          AS attendance_percentage

        FROM attendance
        `
      );

      res.json({

        total_students:
          Number(students.rows[0].count),

        total_teachers:
          Number(teachers.rows[0].count),

        total_activities:
          Number(activities.rows[0].count),

        total_expenses:
          Number(expenses.rows[0].coalesce),

        attendance_percentage:
          Number(
            attendance.rows[0]
              .attendance_percentage || 0
          ).toFixed(2)

      });

    } catch (err) {

      console.error(err);

      res.status(500).json({
        success: false,
        message: "Dashboard error"
      });

    }

  }
);

module.exports = router;