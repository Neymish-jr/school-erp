const pool = require("../db");
const studentSchema = require("../validators/studentValidator");
const { successResponse, errorResponse } = require("../utils/response");
const AppError = require("../utils/AppError");
// GET STUDENTS
const getStudents = async (req, res) => {

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

      const requestedSort = req.query.sort;
      let sort;
      if (requestedSort) {
        if (!allowedSortFields.includes(requestedSort)) {
          throw new AppError(400, "Invalid sort parameter");
        }
        sort = requestedSort;
      } else {
        sort = "name";
      }
      const result = await pool.query(

        `
        SELECT *
        FROM students
        WHERE is_active = true
        AND name ILIKE $1
        AND gender ILIKE $2
        ORDER BY
        CASE
          WHEN '${sort}' = 'student_class' THEN
            CASE student_class
              WHEN 'I' THEN 1
              WHEN 'II' THEN 2
              WHEN 'III' THEN 3
              WHEN 'IV' THEN 4
              WHEN 'V' THEN 5
              WHEN 'VI' THEN 6
              WHEN 'VII' THEN 7
              WHEN 'VIII' THEN 8
              WHEN 'IX' THEN 9
              WHEN 'X' THEN 10
              WHEN 'XI' THEN 11
              WHEN 'XII' THEN 12
              ELSE CAST(student_class AS INTEGER)
            END
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

      return successResponse(res, {
        message: "Students fetched successfully",
        data: {
          currentPage: page,
          totalPages,
          totalStudents,
          students: result.rows
        }
      });

};

// CREATE STUDENT
    const createStudent = async (req, res) => {
        const { error } = studentSchema.validate(req.body);

        if (error) {
          return errorResponse(res, { message: error.details[0].message, error: error.details[0].message, status: 400 });
        }

        const payload = {
          ...req.body,
          school_id: req.user.school_id
        };

        const result = await pool.query(
          `
          INSERT INTO students
          (name, gender, category, student_class, section, school_id)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
          `,
          [
            payload.name,
            payload.gender,
            payload.category,
            payload.student_class,
            payload.section,
            payload.school_id
          ]
        ).catch((err) => {
          if (err.code === "23503") {
            throw new AppError(400, "Invalid school ID");
          }
          throw err;
        });

        return successResponse(res, { message: "Student created successfully", data: result.rows[0] });
    };

// GET STUDENT BY ID
const getStudentById = async (req, res) => {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT * FROM students
      WHERE id = $1
      AND school_id = $2
      `,
      [id, req.user.school_id]
    );

    if (result.rows.length === 0) {
      throw new AppError(404, "Student not found");
    }

    return successResponse(res, { message: "Student fetched successfully", data: result.rows[0] });
};

// UPDATE STUDENT
const updateStudent = async (req, res) => {
    const { id } = req.params;

    const {
      name,
      gender,
      category,
      student_class,
      section
    } = req.body;

    const result = await pool.query(
      `
      UPDATE students
      SET
        name = $1,
        gender = $2,
        category = $3,
        student_class = $4,
        section = $5
      WHERE id = $6
      AND school_id = $7
      RETURNING *
      `,
      [
        name,
        gender,
        category,
        student_class,
        section,
        id,
        req.user.school_id
      ]
    );

    if (result.rows.length === 0) {
      throw new AppError(404, "Student not found");
    }

    return successResponse(res, { message: "Student updated successfully", data: result.rows[0] });
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
      AND school_id = $2
      RETURNING *
      `,

      [
        id,
        req.user.school_id
      ]

    );

    if (result.rows.length === 0) {
      return errorResponse(res, { message: "Student not found", error: "Student not found", status: 404 });
    }

    return successResponse(res, { message: "Student deleted successfully", data: result.rows[0] });

  } catch (err) {

    console.error(err);
    return errorResponse(res, { message: "Error deleting student", error: err.message, status: 500 });

  }

};

module.exports = {
  getStudents,
  createStudent,
  getStudentById,
  updateStudent,
  deleteStudent
};