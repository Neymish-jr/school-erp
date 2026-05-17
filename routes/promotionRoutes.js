const express = require("express");
const router = express.Router();
const pool = require("../db");

// RUN PROMOTION LOGIC
router.get("/:studentId", async (req, res) => {

  try {

    const { studentId } = req.params;

    // GET STUDENT
    const studentResult = await pool.query(
      `
      SELECT *
      FROM students
      WHERE id = $1
      `,
      [studentId]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).send("Student not found");
    }

    // GET MARKS
    const marksResult = await pool.query(
      `
      SELECT
        marks_obtained,
        max_marks
      FROM marks
      WHERE student_id = $1
      `,
      [studentId]
    );

    if (marksResult.rows.length === 0) {
      return res.status(400).send("No marks found");
    }

    // GET ATTENDANCE
    const attendanceResult = await pool.query(
      `
      SELECT
        COUNT(*) FILTER (WHERE status = 'present') AS present_days,
        COUNT(*) AS total_days
      FROM attendance
      WHERE student_id = $1
      `,
      [studentId]
    );

    const attendance = attendanceResult.rows[0];

    const presentDays = Number(attendance.present_days || 0);
    const totalDays = Number(attendance.total_days || 0);

    const attendancePercentage =
      totalDays === 0
        ? 0
        : (presentDays / totalDays) * 100;

    // CALCULATE RESULTS
    let totalObtained = 0;
    let totalMax = 0;

    let failedSubjects = 0;

    marksResult.rows.forEach(mark => {

      const obtained = Number(mark.marks_obtained);
      const max = Number(mark.max_marks);

      totalObtained += obtained;
      totalMax += max;

      const percentage = (obtained / max) * 100;

      if (percentage < 40) {
        failedSubjects++;
      }

    });

    const overallPercentage =
      (totalObtained / totalMax) * 100;

    let status = "Promoted";

    // RULES
    if (attendancePercentage < 75) {

      status = "Detained";

    } else if (failedSubjects >= 3) {

      status = "Failed";

    } else if (failedSubjects > 0) {

      status = "Compartment";

    } else if (overallPercentage < 40) {

      status = "Failed";

    }

    res.json({

      student_id: studentId,

      attendance_percentage:
        attendancePercentage.toFixed(2),

      overall_percentage:
        overallPercentage.toFixed(2),

      failed_subjects: failedSubjects,

      final_status: status

    });

  } catch (err) {

    console.error(err);
    res.status(500).send("Error processing promotion");

  }

});

module.exports = router;