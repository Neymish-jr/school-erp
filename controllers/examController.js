const pool = require("../db");

// CREATE EXAM
const createExam = async (req, res) => {

  try {

    const {
      exam_name,
      class_id,
      exam_type,
      start_date,
      end_date,
      total_marks
    } = req.body;

    // VALIDATION
    if (
      !exam_name ||
      !class_id ||
      !start_date ||
      !end_date
    ) {
      return res.status(400).json({
        error: "Required fields missing"
      });
    }

    if (total_marks <= 0) {
      return res.status(400).json({
        error: "Total marks must be greater than 0"
      });
    }

    const result = await pool.query(
      `
      INSERT INTO exams
      (
        exam_name,
        class_id,
        exam_type,
        start_date,
        end_date,
        total_marks
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
      [
        exam_name,
        class_id,
        exam_type,
        start_date,
        end_date,
        total_marks
      ]
    );

    res.json(result.rows[0]);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false,
      message: "Error creating exam"
    });

  }

};

// GET EXAMS
const getExams = async (req, res) => {

  try {

    const result = await pool.query(
      `
      SELECT
        exams.*,
        classes.class_name
      FROM exams
      JOIN classes
      ON exams.class_id = classes.id

      ORDER BY exams.id ASC
      `
    );

    res.json(result.rows);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false,
      message: "Error fetching exams"
    });

  }

};

module.exports = {
  createExam,
  getExams
};