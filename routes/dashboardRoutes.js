const express = require("express");
const router = express.Router();
const pool = require("../db");
const { authenticate, isAdminOrSuperAdmin } = require("../middleware/auth");
const cashbookEntryService = require("../services/cashbookEntryService");

router.get("/", authenticate, async (req, res) => {
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

    const classes = await pool.query(
      `
      SELECT COUNT(*) FROM classes
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
      total_students: Number(students.rows[0].count),
      total_teachers: Number(teachers.rows[0].count),
      total_classes: Number(classes.rows[0].count),
      attendance_percentage: Number(
        attendance.rows[0].attendance_percentage || 0
      ).toFixed(2),
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Dashboard error",
    });
  }
});

router.get("/finance", authenticate, isAdminOrSuperAdmin, async (req, res) => {
  try {
    const schoolId = req.user?.school_id || 1;
    const role = req.user?.role;
    const financialYearId = req.query.financial_year_id
      ? Number(req.query.financial_year_id)
      : undefined;

    const data = await cashbookEntryService.getFinanceDashboardMetrics(
      schoolId,
      role,
      financialYearId
    );

    res.json({
      success: true,
      message: "Finance dashboard metrics fetched successfully",
      data,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Error fetching finance dashboard metrics",
    });
  }
});

module.exports = router;
