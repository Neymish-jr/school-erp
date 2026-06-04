const pool = require("../db");
const { successResponse, errorResponse } = require("../utils/response");

const getSchoolId = (req) => req.user?.school_id || 1;

const normalizeChargePayload = (payload = {}) => ({
  charge_name: String(payload.charge_name || "").trim(),
  description: String(payload.description || "").trim(),
});

const getAdministrativeCharges = async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    const search = String(req.query.search || "").trim();
    const isActive = req.query.is_active;
    const params = [schoolId, `%${search}%`];

    let query = `
      SELECT
        id,
        charge_name,
        description,
        is_active,
        school_id,
        created_at,
        updated_at
      FROM administrative_charges
      WHERE school_id = $1
        AND (
          charge_name ILIKE $2
          OR COALESCE(description, '') ILIKE $2
        )
    `;

    if (isActive === "true" || isActive === "false") {
      params.push(isActive === "true");
      query += ` AND is_active = $${params.length}`;
    }

    query += `
      ORDER BY is_active DESC, charge_name ASC
    `;

    const result = await pool.query(query, params);

    return successResponse(res, {
      message: "Administrative charges fetched successfully",
      data: result.rows,
    });
  } catch (err) {
    console.error(err);
    return errorResponse(res, {
      message: "Error fetching administrative charges",
      error: err.message,
      status: 500,
    });
  }
};

const getAdministrativeChargeById = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        id,
        charge_name,
        description,
        is_active,
        school_id,
        created_at,
        updated_at
      FROM administrative_charges
      WHERE id = $1
        AND school_id = $2
      `,
      [req.params.id, getSchoolId(req)]
    );

    if (result.rowCount === 0) {
      return errorResponse(res, {
        message: "Administrative charge not found",
        error: "Not found",
        status: 404,
      });
    }

    return successResponse(res, {
      message: "Administrative charge fetched successfully",
      data: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    return errorResponse(res, {
      message: "Error fetching administrative charge",
      error: err.message,
      status: 500,
    });
  }
};

const createAdministrativeCharge = async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    const payload = normalizeChargePayload(req.body);

    const result = await pool.query(
      `
      INSERT INTO administrative_charges (
        charge_name,
        description,
        school_id
      )
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [
        payload.charge_name,
        payload.description,
        schoolId,
      ]
    );

    return successResponse(res, {
      message: "Administrative charge created successfully",
      data: result.rows[0],
      status: 201,
    });
  } catch (err) {
    if (err?.code === "23505") {
      return errorResponse(res, {
        message: "An administrative charge with this name already exists",
        error: "Duplicate administrative charge",
        status: 409,
      });
    }

    console.error(err);
    return errorResponse(res, {
      message: "Error creating administrative charge",
      error: err.message,
      status: 500,
    });
  }
};

const updateAdministrativeCharge = async (req, res) => {
  try {
    const payload = normalizeChargePayload(req.body);

    const result = await pool.query(
      `
      UPDATE administrative_charges
      SET
        charge_name = $1,
        description = $2,
        updated_at = NOW()
      WHERE id = $3
        AND school_id = $4
      RETURNING *
      `,
      [
        payload.charge_name,
        payload.description,
        req.params.id,
        getSchoolId(req),
      ]
    );

    if (result.rowCount === 0) {
      return errorResponse(res, {
        message: "Administrative charge not found",
        error: "Not found",
        status: 404,
      });
    }

    return successResponse(res, {
      message: "Administrative charge updated successfully",
      data: result.rows[0],
    });
  } catch (err) {
    if (err?.code === "23505") {
      return errorResponse(res, {
        message: "An administrative charge with this name already exists",
        error: "Duplicate administrative charge",
        status: 409,
      });
    }

    console.error(err);
    return errorResponse(res, {
      message: "Error updating administrative charge",
      error: err.message,
      status: 500,
    });
  }
};

const updateAdministrativeChargeStatus = async (req, res) => {
  try {
    const result = await pool.query(
      `
      UPDATE administrative_charges
      SET
        is_active = $1,
        updated_at = NOW()
      WHERE id = $2
        AND school_id = $3
      RETURNING *
      `,
      [
        Boolean(req.body.is_active),
        req.params.id,
        getSchoolId(req),
      ]
    );

    if (result.rowCount === 0) {
      return errorResponse(res, {
        message: "Administrative charge not found",
        error: "Not found",
        status: 404,
      });
    }

    return successResponse(res, {
      message: result.rows[0].is_active
        ? "Administrative charge activated successfully"
        : "Administrative charge deactivated successfully",
      data: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    return errorResponse(res, {
      message: "Error updating administrative charge status",
      error: err.message,
      status: 500,
    });
  }
};

module.exports = {
  getAdministrativeCharges,
  getAdministrativeChargeById,
  createAdministrativeCharge,
  updateAdministrativeCharge,
  updateAdministrativeChargeStatus,
};
