const pool = require("../db");
const classSchema = require("../validators/classValidator");
const { successResponse, errorResponse } = require("../utils/response");

const {
  buildSchoolClause,
  resolveSchoolIdForWrite,
  resolveSchoolScope,
} = require("../utils/tenantScope");

// CREATE CLASS
const createClass = async (req, res) => {
  try {
    const schoolId = resolveSchoolIdForWrite(req, res);
    if (schoolId == null) {
      return;
    }

    const { error } = classSchema.validate(req.body);

    if (error) {
      return errorResponse(res, {
        message: error.details[0].message,
        error: error.details[0].message,
        status: 400,
      });
    }

    const { class_name } = req.body;

    const result = await pool.query(
      "INSERT INTO classes (class_name, school_id) VALUES ($1, $2) RETURNING *",
      [class_name, schoolId]
    );

    return successResponse(res, {
      data: result.rows[0],
      message: "Class created successfully",
    });
  } catch (err) {
    if (err?.code === "23503") {
      return errorResponse(res, {
        message: "Invalid school ID",
        error: "Invalid school ID",
        status: 400,
      });
    }

    console.error(err);
    return errorResponse(res, {
      message: "Error creating class",
      error: err.message,
      status: 500,
    });
  }
};

// GET ALL CLASSES
const getClasses = async (req, res) => {
  try {
    const scope = resolveSchoolScope(req, res);
    if (!scope) {
      return;
    }
    const { schoolId, role } = scope;
    const params = [];
    const schoolClause = buildSchoolClause(role, schoolId, params, "classes");

    const result = await pool.query(
      `
      SELECT *
      FROM classes
      WHERE 1 = 1
      ${schoolClause}
      ORDER BY id ASC
      `,
      params
    );

    return successResponse(res, {
      data: result.rows,
      message: "Classes fetched successfully",
    });
  } catch (err) {
    console.error(err);
    return errorResponse(res, {
      message: "Error fetching classes",
      error: err.message,
      status: 500,
    });
  }
};

module.exports = {
  createClass,
  getClasses,
  buildSchoolClause,
  resolveSchoolIdForWrite,
};
