const pool = require("../db");

// GENERATE REPORT CARD
const getReportCard = async (req, res) => {

  try {

    const { studentId } = req.params;

    // STUDENT DETAILS
    const studentResult = await pool.query(
      `
      SELECT *
      FROM students
      WHERE id = $1
      `,
      [studentId]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).send(
        "Student not found"
      );
    }

    const student = studentResult.rows[0];

    // MARKS DATA
    const marksResult = await pool.query(
      `
      SELECT
        subjects.subject_name,
        exams.exam_name,
        marks.marks_obtained,
        marks.max_marks

      FROM marks

      JOIN subjects
      ON marks.subject_id = subjects.id

      JOIN exams
      ON marks.exam_id = exams.id

      WHERE marks.student_id = $1
      `,
      [studentId]
    );

    // ATTENDANCE
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

    const presentDays =
      Number(attendance.present_days || 0);

    const totalDays =
      Number(attendance.total_days || 0);

    const attendancePercentage =
      totalDays === 0
        ? 0
        : (
            (presentDays / totalDays) * 100
          ).toFixed(2);

    // CALCULATE TOTALS
    let totalObtained = 0;
    let totalMax = 0;

    const subjects = marksResult.rows.map(mark => {

      totalObtained +=
        Number(mark.marks_obtained);

      totalMax +=
        Number(mark.max_marks);

      let grade = "F";

      const percentage =
        (mark.marks_obtained / mark.max_marks) * 100;

      if (percentage >= 90) grade = "A+";
      else if (percentage >= 75) grade = "A";
      else if (percentage >= 60) grade = "B";
      else if (percentage >= 40) grade = "C";

      return {
        subject: mark.subject_name,
        exam: mark.exam_name,
        marks_obtained: mark.marks_obtained,
        max_marks: mark.max_marks,
        grade
      };

    });

    const overallPercentage =
      totalMax === 0
        ? 0
        : (
            (totalObtained / totalMax) * 100
          ).toFixed(2);

    const result =
      overallPercentage >= 40
        ? "Pass"
        : "Fail";

    res.json({

      student: {
        id: student.id,
        name: student.name
      },

      attendance_percentage:
        attendancePercentage,

      subjects,

      total_marks_obtained:
        totalObtained,

      total_max_marks:
        totalMax,

      percentage:
        overallPercentage,

      result

    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false,
      message: "Error generating report card"
    });

  }

};

module.exports = {
  getReportCard
};