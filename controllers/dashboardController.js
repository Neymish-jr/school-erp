const pool = require("../db");

const getDashboardStats = async (req, res) => {

  try {

    const totalStudents = await pool.query(
      `
      SELECT COUNT(*) FROM students
      `
    );

    const totalTeachers = await pool.query(
      `
      SELECT COUNT(*) FROM teachers
      `
    );

    const totalClasses = await pool.query(
      `
      SELECT COUNT(*) FROM classes
      `
    );

    const totalExpenses = await pool.query(
      `
      SELECT COALESCE(SUM(amount), 0)
      FROM expenses
      `
    );

    const attendanceStats = await pool.query(
      `
      SELECT
        COUNT(*) FILTER (
          WHERE status = 'Present'
        ) AS present,

        COUNT(*) AS total

      FROM attendance
      `
    );

    const present =
      Number(attendanceStats.rows[0].present);

    const total =
      Number(attendanceStats.rows[0].total);

    const attendancePercentage =
      total === 0
        ? 0
        : ((present / total) * 100).toFixed(2);

    res.json({

      total_students:
        Number(totalStudents.rows[0].count),

      total_teachers:
        Number(totalTeachers.rows[0].count),

      total_classes:
        Number(totalClasses.rows[0].count),

      total_expenses:
        Number(totalExpenses.rows[0].coalesce),

      attendance_percentage:
        attendancePercentage

    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false,
      message: "Error fetching dashboard stats"
    });

  }

};

module.exports = {
  getDashboardStats
};