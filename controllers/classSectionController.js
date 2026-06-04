const pool = require("../db");
const { successResponse, errorResponse } = require("../utils/response");

const normalizePayload = (payload = {}) => ({
  class_name: String(payload.class_name || "").trim(),
  section_name: String(payload.section_name || "").trim(),
});

const getClassSections = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        id,
        class_name,
        section_name,
        created_at
      FROM class_sections
      ORDER BY class_name ASC, section_name ASC
      `
    );

    return successResponse(res, {
      message: "Class sections fetched successfully",
      data: result.rows,
    });
  } catch (err) {
    console.error(err);
    return errorResponse(res, {
      message: "Error fetching class sections",
      error: err.message,
      status: 500,
    });
  }
};

const createClassSection = async (req, res) => {
  try {
    const { class_name, section_name } = normalizePayload(req.body);

    if (!class_name || !section_name) {
      return errorResponse(res, {
        message: "Class name and section name are required",
        error: "Missing required fields",
        status: 400,
      });
    }

    const result = await pool.query(
      `
      INSERT INTO class_sections (class_name, section_name)
      VALUES ($1, $2)
      RETURNING id, class_name, section_name, created_at
      `,
      [class_name, section_name]
    );

    return successResponse(res, {
      message: "Class section created successfully",
      data: result.rows[0],
    });
  } catch (err) {
    if (err?.code === "23505") {
      return errorResponse(res, {
        message: "A class and section combination already exists",
        error: "Duplicate class section",
        status: 409,
      });
    }

    console.error(err);
    return errorResponse(res, {
      message: "Error creating class section",
      error: err.message,
      status: 500,
    });
  }
};

const updateClassSection = async (req, res) => {
  try {
    const { id } = req.params;
    const { class_name, section_name } = normalizePayload(req.body);

    if (!class_name || !section_name) {
      return errorResponse(res, {
        message: "Class name and section name are required",
        error: "Missing required fields",
        status: 400,
      });
    }

    const result = await pool.query(
      `
      UPDATE class_sections
      SET class_name = $1,
          section_name = $2
      WHERE id = $3
      RETURNING id, class_name, section_name, created_at
      `,
      [class_name, section_name, id]
    );

    if (result.rowCount === 0) {
      return errorResponse(res, {
        message: "Class section not found",
        error: "Not found",
        status: 404,
      });
    }

    return successResponse(res, {
      message: "Class section updated successfully",
      data: result.rows[0],
    });
  } catch (err) {
    if (err?.code === "23505") {
      return errorResponse(res, {
        message: "A class and section combination already exists",
        error: "Duplicate class section",
        status: 409,
      });
    }

    console.error(err);
    return errorResponse(res, {
      message: "Error updating class section",
      error: err.message,
      status: 500,
    });
  }
};

const deleteClassSection = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM class_sections WHERE id = $1", [id]);

    if (result.rowCount === 0) {
      return errorResponse(res, {
        message: "Class section not found",
        error: "Not found",
        status: 404,
      });
    }

    return successResponse(res, {
      message: "Class section deleted successfully",
      data: { id },
    });
  } catch (err) {
    console.error(err);
    return errorResponse(res, {
      message: "Error deleting class section",
      error: err.message,
      status: 500,
    });
  }
};

module.exports = {
  getClassSections,
  createClassSection,
  updateClassSection,
  deleteClassSection,
};
