const pool = require("../db");
const { successResponse } = require("../utils/response");
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

  const result = await pool.query(
    `
    SELECT *
    FROM teachers
    WHERE school_id = $1
    ORDER BY id ASC
    `,
    [req.user.school_id]
  );

  return successResponse(res, {
    message: "Teachers fetched successfully",
    data: result.rows
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
    designation,
    phone,
    age,
    gender
  } = req.body;

  const result = await pool.query(
    `
    UPDATE teachers
    SET
      teacher_name = $1,
      designation = $2,
      phone = $3,
      age = $4,
      gender = $5
    WHERE id = $6
    AND school_id = $7
    RETURNING *
    `,
    [
      teacher_name,
      designation,
      phone,
      age,
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
    throw new AppError(404, "Teacher not found");
  }

  return successResponse(res, {
    message: "Teacher deleted successfully",
    data: result.rows[0]
  });

};

module.exports = {
  createTeacher,
  getTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher
};