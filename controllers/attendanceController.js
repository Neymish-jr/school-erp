const pool = require("../db");

// MARK ATTENDANCE
const markAttendance = async (req, res) => {

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

module.exports = {
  markAttendance
};