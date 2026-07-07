const express = require("express");
const router = express.Router();
const pool = require("../db");
const { authenticate } = require("../middleware/auth");
const authorize = require("../middleware/authorize");
const cashbookEntryService = require("../services/cashbookEntryService");
const {
  buildSchoolClause,
  getEffectiveSchoolId,
  resolveSchoolScope,
} = require("../utils/tenantScope");

router.get("/", authenticate, authorize("dashboard.summary.read"), async (req, res) => {
  try {
    const scope = resolveSchoolScope(req, res);
    if (!scope) {
      return;
    }

    const { schoolId, role } = scope;

    const studentParams = [];
    const studentSchoolClause = buildSchoolClause(
      role,
      schoolId,
      studentParams,
      "students"
    );

    const students = await pool.query(
      `
      SELECT COUNT(*) FROM students
      WHERE is_active = true
      ${studentSchoolClause}
      `,
      studentParams
    );

    const teacherParams = [];
    const teacherSchoolClause = buildSchoolClause(
      role,
      schoolId,
      teacherParams,
      "teachers"
    );

    const teachers = await pool.query(
      `
      SELECT COUNT(*) FROM teachers
      WHERE 1 = 1
      ${teacherSchoolClause}
      `,
      teacherParams
    );

    const classParams = [];
    const classSchoolClause = buildSchoolClause(
      role,
      schoolId,
      classParams,
      "classes"
    );

    const classes = await pool.query(
      `
      SELECT COUNT(*) FROM classes
      WHERE 1 = 1
      ${classSchoolClause}
      `,
      classParams
    );

    const attendanceParams = [];
    const attendanceSchoolClause = buildSchoolClause(
      role,
      schoolId,
      attendanceParams,
      "attendance"
    );

    const attendance = await pool.query(
      `
      SELECT
        COUNT(*) FILTER (
          WHERE status IN ('Present', 'Late')
        ) * 100.0 /
        NULLIF(COUNT(*), 0)
        AS attendance_percentage
      FROM attendance
      WHERE 1 = 1
      ${attendanceSchoolClause}
      `,
      attendanceParams
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

router.get("/finance", authenticate, authorize("dashboard.finance.read"), async (req, res) => {
  try {
    const schoolId = getEffectiveSchoolId(req);
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
