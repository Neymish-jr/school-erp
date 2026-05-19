const pool = require("../db");
const studentSchema = require("../validators/studentValidator");
// GET STUDENTS
const getStudents = async (req, res) => {

  try {

      const page = parseInt(req.query.page) || 1;

      const limit = parseInt(req.query.limit) || 10;

      const offset = (page - 1) * limit;

      const search = req.query.search || "";

      const gender = req.query.gender || "";
      const allowedSortFields = [
        "name",
        "gender",
        "student_class",
        "created_at"
      ];

      const sort =
        allowedSortFields.includes(req.query.sort)
          ? req.query.sort
          : "name";
      const result = await pool.query(

        `
        SELECT *
        FROM students
        WHERE is_active = true
        AND name ILIKE $1
        AND gender ILIKE $2
        ORDER BY
        CASE
          WHEN '${sort}' = 'student_class'
          THEN student_class
        END ASC,
        ${sort} ASC
        LIMIT $3 OFFSET $4
        `,

        [
          `%${search}%`,
          gender || "%",
          limit,
          offset
        ]

      );

      const totalResult = await pool.query(

        `
        SELECT COUNT(*)
        FROM students
        WHERE is_active = true
        AND name ILIKE $1
        AND gender ILIKE $2
        `,

        [
          `%${search}%`,
          gender || "%"
        ]

      );

      const totalStudents = parseInt(
        totalResult.rows[0].count
      );

      const totalPages = Math.ceil(
        totalStudents / limit
      );

      res.json({

        currentPage: page,

        totalPages,

        totalStudents,

        students: result.rows

      });


  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false,
      message: "Error fetching students"
    });

  }

};

// CREATE STUDENT
    const createStudent = async (req, res) => {

      try {

        const { error } = studentSchema.validate(req.body);

        if (error) {
          return res.status(400).json({
            error: error.details[0].message
          });
        }

        const {
          name,
          gender,
          category,
          student_class,
          section,
          school_id
        } = req.body;

        const result = await pool.query(
          `
          INSERT INTO students
          (name, gender, category, student_class, section, school_id)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
          `,
          [
            name,
            gender,
            category,
            student_class,
            section,
            school_id
          ]
        );

        res.json(result.rows[0]);

      } catch (err) {

        console.error(err);

        if (err.code === "23503") {
          return res.status(400).json({
            error: "Invalid school ID"
          });
        }

        res.status(500).json({
          success: false,
          message: "Error adding student"
        });

      }

    };

// GET STUDENT BY ID
const getStudentById = async (req, res) => {

  try {

    const { id } = req.params;

    const result = await pool.query(
      "SELECT * FROM students WHERE id = $1",
      [id]
    );


    if (result.rows.length === 0) {
      return res.status(404).send("Student not found");
    }

    res.json(result.rows[0]);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false,
      message: "Error fetching student"
    });

  }

};

// UPDATE STUDENT
const updateStudent = async (req, res) => {

  try {

    const { id } = req.params;

    const {
      name,
      gender,
      category,
      student_class,
      section,
      school_id
    } = req.body;

    const result = await pool.query(
      `
      UPDATE students
      SET
        name = $1,
        gender = $2,
        category = $3,
        student_class = $4,
        section = $5,
        school_id = $6
      WHERE id = $7
      RETURNING *
      `,
      [
        name,
        gender,
        category,
        student_class,
        section,
        school_id,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).send("Student not found");
    }

    res.json(result.rows[0]);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false,
      message: "Error updating student"
    });

  }

};

// DELETE STUDENT
const deleteStudent = async (req, res) => {

  try {

    const { id } = req.params;

    const result = await pool.query(

      `
      UPDATE students
      SET is_active = false
      WHERE id = $1
      RETURNING *
      `,

      [id]

    );

    if (result.rows.length === 0) {
      return res.status(404).send("Student not found");
    }

    res.json({
      message: "Student deleted successfully",
      student: result.rows[0]
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false,
      message: "Error deleting student"
    });

  }

};

module.exports = {
  getStudents,
  createStudent,
  getStudentById,
  updateStudent,
  deleteStudent
};