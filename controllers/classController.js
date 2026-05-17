const pool = require("../db");

// CREATE CLASS
const createClass = async (req, res) => {

  try {

    const { class_name } = req.body;

    if (!class_name) {
      return res.status(400).json({
        error: "Class name is required"
      });
    }

    const result = await pool.query(
      `
      INSERT INTO classes
      (class_name, school_id)
      VALUES ($1, $2)
      RETURNING *
      `,
      [class_name, 1]
    );

    res.json(result.rows[0]);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false,
      message: "Error creating class"
    });

  }

};

// GET ALL CLASSES
const getClasses = async (req, res) => {

  try {

    const result = await pool.query(
      "SELECT * FROM classes ORDER BY id ASC"
    );

    res.json(result.rows);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false,
      message: "Error fetching classes"
    });

  }

};

module.exports = {
  createClass,
  getClasses
};