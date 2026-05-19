const pool = require("../db");
const attendanceSchema = require("../validators/attendanceValidator");

// MARK ATTENDANCE
const markAttendance = async (req, res) => {
const { error } = attendanceSchema.validate(req.body);

if (error) {
  return res.status(400).json({
    error: error.details[0].message
  });
}

  try {

    const {
      student_id,
      date,
      period,
      status
    } = req.body;

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
      return res.status(400).send("Attendance already marked");
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

module.exports = {
  markAttendance,
  getAttendance,
  getStudentAttendance
};