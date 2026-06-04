const pool = require("../db");
const { successResponse, errorResponse } = require("../utils/response");
const AppError = require("../utils/AppError");

// CREATE TEACHER
const createTeacher = async (req, res) => {

  const {
    teacher_name,
    designation,
    phone,
    age,
    gender
  } = req.body;

  const result = await pool.query(
    `
    INSERT INTO teachers
    (
      teacher_name,
      designation,
      phone,
      age,
      gender,
      school_id
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
    `,
    [
      teacher_name,
      designation,
      phone,
      age,
      gender,
      req.user.school_id
    ]
  );

  return successResponse(res, {
    message: "Teacher created successfully",
    data: result.rows[0]
  });

};

// GET TEACHERS
const getTeachers = async (req, res) => {

  const page = Number(req.query.page) || 1;

  const limit = Number(req.query.limit) || 50;

  const search = req.query.search || "";

  const skip = (page - 1) * limit;

  const result = await pool.query(
    `
    SELECT *
    FROM teachers
    WHERE school_id = $1
    AND teacher_name ILIKE $2
    ORDER BY id ASC
    LIMIT $3
    OFFSET $4
    `,
    [
      req.user.school_id,
      `%${search}%`,
      limit,
      skip
    ]
  );

  const countResult = await pool.query(
    `
    SELECT COUNT(*)
    FROM teachers
    WHERE school_id = $1
    AND teacher_name ILIKE $2
    `,
    [
      req.user.school_id,
      `%${search}%`
    ]
  );

  const totalTeachers = Number(
    countResult.rows[0].count
  );

  const totalPages = Math.ceil(
    totalTeachers / limit
  );

  return successResponse(res, {
    message: "Teachers fetched successfully",
    data: {
      teachers: result.rows,
      totalPages
    }
  });

};

// GET TEACHER BY ID
const getTeacherById = async (req, res) => {

  const { id } = req.params;

  const result = await pool.query(
    `
    SELECT *
    FROM teachers
    WHERE id = $1
    AND school_id = $2
    `,
    [id, req.user.school_id]
  );

  if (result.rows.length === 0) {
    throw new AppError(404, "Teacher not found");
  }

  return successResponse(res, {
    message: "Teacher fetched successfully",
    data: result.rows[0]
  });

};


// UPDATE TEACHER
const updateTeacher = async (req, res) => {

  const { id } = req.params;

  const {
    teacher_name,
    email,
    phone,
    subject,
    qualification,
    gender
  } = req.body;

  const result = await pool.query(
    `
    UPDATE teachers
    SET
      teacher_name = $1,
      email = $2,
      phone = $3,
      subject = $4,
      qualification = $5,
      gender = $6
    WHERE id = $7
    AND school_id = $8
    RETURNING *
    `,
    [
      teacher_name,
      email,
      phone,
      subject,
      qualification,
      gender,
      id,
      req.user.school_id
    ]
  );

  if (result.rows.length === 0) {
    throw new AppError(404, "Teacher not found");
  }

  return successResponse(res, {
    message: "Teacher updated successfully",
    data: result.rows[0]
  });

};

// DELETE TEACHER
const deleteTeacher = async (req, res) => {

  try {

    const { id } = req.params;

    const result = await pool.query(
      `
      DELETE FROM teachers
      WHERE id = $1
      AND school_id = $2
      RETURNING *
      `,
      [id, req.user.school_id]
    );

    if (result.rows.length === 0) {
      return errorResponse(res, {
        message: "Teacher not found",
        error: "Teacher not found",
        status: 404
      });
    }

    return successResponse(res, {
      message: "Teacher deleted successfully",
      data: result.rows[0]
    });

  } catch (err) {

    if (err.code === "23503") {
      return errorResponse(res, {
        message: "This teacher cannot be deleted because they are linked to existing activities.",
        error: "Teacher has linked activities",
        status: 409
      });
    }

    if (err instanceof AppError) {
      return errorResponse(res, {
        message: err.message,
        error: err.message,
        status: err.statusCode
      });
    }

    console.error(err);

    return errorResponse(res, {
      message: "Error deleting teacher",
      error: err.message,
      status: 500
    });

  }

};

module.exports = {
  createTeacher,
  getTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher
};