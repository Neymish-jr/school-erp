const pool = require("../db");
const { successResponse, errorResponse } = require("../utils/response");
const AppError = require("../utils/AppError");

// CREATE TEACHER
const createTeacher = async (req, res) => {
  const { teacher_name, designation } = req.body;

  const result = await pool.query(
    `
    INSERT INTO teachers
      (teacher_name, designation, school_id)
    VALUES ($1, $2, $3)
    RETURNING *
    `,
    [teacher_name, designation, req.user.school_id]
  );

  return successResponse(res, { message: "Teacher created successfully", data: result.rows[0] });
};

// GET TEACHERS
const getTeachers = async (req, res) => {
  const result = await pool.query(
    `
    SELECT * FROM teachers
    WHERE school_id = $1
    ORDER BY id ASC
    `,
    [req.user.school_id]
  );

  return successResponse(res, { message: "Teachers fetched successfully", data: result.rows });
};

// GET TEACHER BY ID
const getTeacherById = async (req, res) => {
  const { id } = req.params;

  const result = await pool.query(
    `
    SELECT * FROM teachers
    WHERE id = $1
    AND school_id = $2
    `,
    [id, req.user.school_id]
  );

  if (result.rows.length === 0) {
    throw new AppError(404, "Teacher not found");
  }

  return successResponse(res, { message: "Teacher fetched successfully", data: result.rows[0] });
};

// UPDATE TEACHER
const updateTeacher = async (req, res) => {
  const { id } = req.params;
  const { teacher_name, designation } = req.body;

  const result = await pool.query(
    `
    UPDATE teachers
    SET
      teacher_name = $1,
      designation = $2
    WHERE id = $3
    AND school_id = $4
    RETURNING *
    `,
    [teacher_name, designation, id, req.user.school_id]
  );

  if (result.rows.length === 0) {
    throw new AppError(404, "Teacher not found");
  }

  return successResponse(res, { message: "Teacher updated successfully", data: result.rows[0] });
};

// DELETE TEACHER
const deleteTeacher = async (req, res) => {
  const { id } = req.params;
  // 1) Try soft-delete using `deleted_at` timestamp column if it exists
  try {
    const upd = await pool.query(
      `
      UPDATE teachers
      SET deleted_at = NOW()
      WHERE id = $1
      AND school_id = $2
      RETURNING *
      `,
      [id, req.user.school_id]
    );

    if (upd.rows.length > 0) {
      return successResponse(res, { message: "Teacher deleted successfully", data: upd.rows[0] });
    }
    // no rows -> teacher not found
    throw new AppError(404, "Teacher not found");
  } catch (err) {
    // If column doesn't exist, Postgres returns code '42703' (undefined_column)
    if (err && err.code === "42703") {
      // try boolean `deleted` column next
      try {
        const upd2 = await pool.query(
          `
          UPDATE teachers
          SET deleted = true
          WHERE id = $1
          AND school_id = $2
          RETURNING *
          `,
          [id, req.user.school_id]
        );

        if (upd2.rows.length > 0) {
          return successResponse(res, { message: "Teacher deleted successfully", data: upd2.rows[0] });
        }
        throw new AppError(404, "Teacher not found");
      } catch (err2) {
        if (err2 && err2.code === "42703") {
          // no soft-delete columns available; check for referencing records
          const refs = await pool.query(
            `
            SELECT
              (SELECT COUNT(*) FROM activities WHERE assigned_teacher_id = $1) AS activities_count,
              (SELECT COUNT(*) FROM subjects WHERE teacher_id = $1) AS subjects_count,
              (SELECT COUNT(*) FROM sections WHERE class_teacher_id = $1) AS sections_count,
              (SELECT COUNT(*) FROM marks WHERE teacher_id = $1) AS marks_count
            `,
            [id]
          );

          const row = refs.rows[0] || {};
          const totalRefs =
            (parseInt(row.activities_count || 0) || 0) +
            (parseInt(row.subjects_count || 0) || 0) +
            (parseInt(row.sections_count || 0) || 0) +
            (parseInt(row.marks_count || 0) || 0);

          if (totalRefs > 0) {
            throw new AppError(400, "Teacher cannot be deleted because related records exist");
          }

          // safe to hard delete
          const del = await pool.query(
            `
            DELETE FROM teachers
            WHERE id = $1
            AND school_id = $2
            RETURNING *
            `,
            [id, req.user.school_id]
          );

          if (del.rows.length === 0) {
            throw new AppError(404, "Teacher not found");
          }

          return successResponse(res, { message: "Teacher deleted successfully", data: del.rows[0] });
        }

        // other error while attempting boolean delete
        throw err2;
      }
    }

    // rethrow other errors to be handled by global error handler
    throw err;
  }
};

module.exports = {
  createTeacher,
  getTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher
};
