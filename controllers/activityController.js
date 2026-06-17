const pool = require("../db");
const { successResponse, errorResponse } = require("../utils/response");

const buildSchoolClause = (role, schoolId, params, tableAlias = "activities") => {
  if (role !== "super_admin" && schoolId != null) {
    params.push(schoolId);
    return ` AND ${tableAlias}.school_id = $${params.length}`;
  }

  return "";
};

const resolveSchoolIdForWrite = (req, res) => {
  const { school_id: schoolId } = req.user;

  if (schoolId == null) {
    errorResponse(res, {
      message: "School context is required for this operation",
      error: "Missing school_id",
      status: 400,
    });
    return null;
  }

  return schoolId;
};

// GET ACTIVITIES
const getActivities = async (req, res) => {
  try {
    const { school_id: schoolId, role } = req.user;
    const params = [];
    const schoolClause = buildSchoolClause(role, schoolId, params);

    const result = await pool.query(
      `
      SELECT
        activities.*,
        teachers.teacher_name,
        teachers.designation,
        schools.school_name
      FROM activities
      LEFT JOIN teachers
        ON activities.assigned_teacher_id = teachers.id
      LEFT JOIN schools
        ON activities.school_id = schools.id
      WHERE 1 = 1
      ${schoolClause}
      ORDER BY activities.id DESC
      `,
      params
    );

    return successResponse(res, { data: result.rows });
  } catch (err) {
    console.error(err);
    return errorResponse(res, {
      message: "Error fetching activities",
      error: err.message,
      status: 500,
    });
  }
};

// CREATE ACTIVITY
const createActivity = async (req, res) => {
  try {
    const schoolId = resolveSchoolIdForWrite(req, res);
    if (schoolId == null) {
      return;
    }

    const {
      activity_name,
      description,
      allocated_budget,
      assigned_teacher_id,
    } = req.body;

    if (
      !activity_name ||
      !description ||
      !allocated_budget ||
      !assigned_teacher_id
    ) {
      return errorResponse(res, {
        message: "All fields are required",
        error: "All fields are required",
        status: 400,
      });
    }

    if (allocated_budget <= 0) {
      return errorResponse(res, {
        message: "Invalid budget",
        error: "Invalid budget",
        status: 400,
      });
    }

    const teacherCheck = await pool.query(
      `
      SELECT id
      FROM teachers
      WHERE id = $1
        AND school_id = $2
      `,
      [assigned_teacher_id, schoolId]
    );

    if (teacherCheck.rowCount === 0) {
      return errorResponse(res, {
        message: "Assigned teacher not found in your school",
        error: "Teacher not found",
        status: 404,
      });
    }

    const requiresQuotation = allocated_budget > 50000;

    const result = await pool.query(
      `
      INSERT INTO activities
      (
        activity_name,
        description,
        allocated_budget,
        assigned_teacher_id,
        school_id,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
      [
        activity_name,
        description,
        allocated_budget,
        assigned_teacher_id,
        schoolId,
        "Pending",
      ]
    );

    return successResponse(res, {
      data: { activity: result.rows[0], requiresQuotation },
    });
  } catch (err) {
    console.error(err);
    return errorResponse(res, {
      message: "Error adding activity",
      error: err.message,
      status: 500,
    });
  }
};

// UPDATE ACTIVITY STATUS
const updateActivityStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const { school_id: schoolId, role } = req.user;
    const allowedStatuses = [
      "Pending",
      "Approved",
      "Rejected",
      "Completed",
    ];

    if (!allowedStatuses.includes(status)) {
      return errorResponse(res, {
        message: "Invalid status",
        error: "Invalid status",
        status: 400,
      });
    }

    const params = [status, id];
    const schoolClause = buildSchoolClause(role, schoolId, params);

    const result = await pool.query(
      `
      UPDATE activities
      SET status = $1
      WHERE id = $2
      ${schoolClause}
      RETURNING *
      `,
      params
    );

    if (result.rowCount === 0) {
      return errorResponse(res, {
        message: "Activity not found",
        error: "Activity not found",
        status: 404,
      });
    }

    return successResponse(res, { data: result.rows[0] });
  } catch (err) {
    console.error(err);
    return errorResponse(res, {
      message: "Error updating status",
      error: err.message,
      status: 500,
    });
  }
};

// UPLOAD ACTIVITY FILE
const uploadActivityFile = async (req, res) => {
  try {
    const { id } = req.params;
    const { school_id: schoolId, role } = req.user;

    if (!req.file) {
      return errorResponse(res, {
        message: "No file uploaded",
        error: "No file uploaded",
        status: 400,
      });
    }

    const filePath = req.file.path;
    const params = [filePath, id];
    const schoolClause = buildSchoolClause(role, schoolId, params);

    const result = await pool.query(
      `
      UPDATE activities
      SET file_path = $1
      WHERE id = $2
      ${schoolClause}
      RETURNING id
      `,
      params
    );

    if (result.rowCount === 0) {
      return errorResponse(res, {
        message: "Activity not found",
        error: "Activity not found",
        status: 404,
      });
    }

    return successResponse(res, {
      message: "File uploaded successfully",
      data: { file_path: filePath },
    });
  } catch (err) {
    console.error(err);
    return errorResponse(res, {
      message: "Upload failed",
      error: err.message,
      status: 500,
    });
  }
};

module.exports = {
  getActivities,
  createActivity,
  updateActivityStatus,
  uploadActivityFile,
};
