const pool = require("../db");
const { successResponse, errorResponse } = require("../utils/response");

// GET ACTIVITIES
const getActivities = async (req, res) => {
  try {
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

      ORDER BY activities.id DESC
      `
    );

    return successResponse(res, { data: result.rows });

  } catch (err) {

    console.error(err);
    return errorResponse(res, { message: "Error fetching activities", error: err.message, status: 500 });

  }
};

// CREATE ACTIVITY
const createActivity = async (req, res) => {
  try {
    const {
      activity_name,
      description,
      allocated_budget,
      assigned_teacher_id,
      school_id
    } = req.body;

    if (
      !activity_name ||
      !description ||
      !allocated_budget ||
      !assigned_teacher_id ||
      !school_id
    ) {
      return errorResponse(res, { message: "All fields are required", error: "All fields are required", status: 400 });
    }

    if (allocated_budget <= 0) {
      return errorResponse(res, { message: "Invalid budget", error: "Invalid budget", status: 400 });
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
        school_id,
        "Pending"
      ]
    );

    return successResponse(res, { data: { activity: result.rows[0], requiresQuotation } });

  } catch (err) {

    console.error(err);
    return errorResponse(res, { message: "Error adding activity", error: err.message, status: 500 });

  }
};

// UPDATE ACTIVITY STATUS
const updateActivityStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const allowedStatuses = [
      "Pending",
      "Approved",
      "Rejected",
      "Completed"
    ];

    if (!allowedStatuses.includes(status)) {
      return errorResponse(res, { message: "Invalid status", error: "Invalid status", status: 400 });
    }
    const result = await pool.query(
      `
      UPDATE activities
      SET status = $1
      WHERE id = $2
      RETURNING *
      `,
      [status, id]
    );

    return successResponse(res, { data: result.rows[0] });

  } catch (err) {

    console.error(err);
    return errorResponse(res, { message: "Error updating status", error: err.message, status: 500 });

  }
};

// UPLOAD ACTIVITY FILE
const uploadActivityFile = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return errorResponse(res, { message: "No file uploaded", error: "No file uploaded", status: 400 });
    }
    const filePath = req.file.path;

    await pool.query(
      `
      UPDATE activities
      SET file_path = $1
      WHERE id = $2
      `,
      [filePath, id]
    );

    return successResponse(res, { message: "File uploaded successfully", data: { file_path: filePath } });

  } catch (err) {

    console.error(err);
    return errorResponse(res, { message: "Upload failed", error: err.message, status: 500 });

  }
};

module.exports = {
  getActivities,
  createActivity,
  updateActivityStatus,
  uploadActivityFile
};
