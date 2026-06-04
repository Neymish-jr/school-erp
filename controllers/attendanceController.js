const pool = require("../db");

const ALLOWED_STATUSES = ["Present", "Absent", "Late", "Leave"];

const getTodayDateString = () => new Date().toISOString().split("T")[0];

const isTeacherRestrictedToToday = (user, date) => {
  return user?.role === "teacher" && date !== getTodayDateString();
};

// MARK ATTENDANCE
const markAttendance = async (req, res) => {

  try {

    const {
      student_id,
      date,
      period,
      status
    } = req.body;

    if (
      student_id === undefined ||
      date === undefined ||
      period === undefined ||
      status === undefined
    ) {
      return res.status(400).json({
        error: "All fields are required"
      });
    }

    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        error: "Invalid status"
      });
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        error: "Invalid date"
      });
    }

    if (isTeacherRestrictedToToday(req.user, date)) {
      return res.status(403).json({
        error: "Attendance can only be marked for today's date"
      });
    }

    const existingAttendance = await pool.query(

      `
      SELECT * FROM attendance
      WHERE student_id = $1
      AND date = $2
      AND period = $3
      `,

      [student_id, date, period]

    );

    if (existingAttendance.rows.length > 0) {
      return res.status(400).json({
        error: "Attendance already marked"
      });
    }

    const result = await pool.query(

      `
      INSERT INTO attendance
      (
        student_id,
        teacher_id,
        date,
        period,
        status,
        school_id
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,

      [
        student_id,
        req.user.id,
        date,
        period,
        status,
        1
      ]

    );

    res.json(result.rows[0]);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false,
      message: "Error marking attendance"
    });

  }

};
const getAttendance = async (req, res) => {

  try {

    const result = await pool.query(
      `
      SELECT
        attendance.*,
        students.name
      FROM attendance
      JOIN students
      ON attendance.student_id = students.id

      ORDER BY date DESC
      `
    );

    res.json(result.rows);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false,
      message: "Error fetching attendance"
    });

  }

};
const getStudentAttendance = async (req, res) => {

  try {

    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT *
      FROM attendance

      WHERE student_id = $1

      ORDER BY date DESC
      `,
      [id]
    );

    res.json(result.rows);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false,
      message: "Error fetching student attendance"
    });

  }

};

const updateAttendance = async (req, res) => {

  try {

    const { id } = req.params;
    const { status } = req.body;

    if (status === undefined) {
      return res.status(400).json({
        error: "Status is required"
      });
    }

    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        error: "Invalid status"
      });
    }

    const existingAttendance = await pool.query(
      `
      SELECT date
      FROM attendance
      WHERE id = $1
      `,
      [id]
    );

    if (existingAttendance.rowCount === 0) {
      return res.status(404).json({
        error: "Attendance record not found"
      });
    }

    if (isTeacherRestrictedToToday(req.user, existingAttendance.rows[0].date)) {
      return res.status(403).json({
        error: "Attendance can only be marked for today's date"
      });
    }

    const result = await pool.query(
      `
      UPDATE attendance
      SET
        status = $1,
        teacher_id = $2
      WHERE id = $3
      RETURNING *
      `,
      [status, req.user.id, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: "Attendance record not found"
      });
    }

    res.json(result.rows[0]);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false,
      message: "Error updating attendance"
    });

  }

};

module.exports = {
  markAttendance,
  getAttendance,
  getStudentAttendance,
  updateAttendance
};