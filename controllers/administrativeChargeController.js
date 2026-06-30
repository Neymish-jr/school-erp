const pool = require("../db");
const { successResponse, errorResponse } = require("../utils/response");
const {
  resolveSchoolIdForWrite,
  resolveSchoolScope,
  buildSchoolClause,
} = require("../utils/tenantScope");
const administrativeChargeService = require("../services/administrativeChargeService");
const { resolveChargeCode } = require("../utils/chargeCode");

const normalizeChargePayload = (payload = {}) => ({
  charge_name: String(payload.charge_name || "").trim(),
  description: String(payload.description || "").trim(),
});

const getAdministrativeCharges = async (req, res) => {
  try {
    const scope = resolveSchoolScope(req, res);
    if (!scope) {
      return;
    }

    const search = String(req.query.search || "").trim();
    const isActive = req.query.is_active;
    const isActiveFilter =
      isActive === "true" ? true : isActive === "false" ? false : undefined;

    const data = await administrativeChargeService.listAdministrativeCharges(scope, {
      search,
      isActive: isActiveFilter,
    });

    return successResponse(res, {
      message: "Administrative charges fetched successfully",
      data,
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

const getAdministrativeChargeDetails = async (req, res) => {
  try {
    const scope = resolveSchoolScope(req, res);
    if (!scope) {
      return;
    }

    const chargeId = Number(req.params.id);
    if (!Number.isInteger(chargeId) || chargeId <= 0) {
      return errorResponse(res, {
        message: "Invalid charge id",
        error: "Validation Error",
        status: 400,
      });
    }

    const details = await administrativeChargeService.getChargeDetails(chargeId, scope);

    if (!details) {
      return errorResponse(res, {
        message: "Administrative charge not found",
        error: "Not found",
        status: 404,
      });
    }

    return successResponse(res, {
      message: "Administrative charge details fetched successfully",
      data: details,
    });
  } catch (err) {
    console.error(err);
    return errorResponse(res, {
      message: "Error fetching administrative charge details",
      error: err.message,
      status: 500,
    });
  }
};

const getAdministrativeChargeById = async (req, res) => {
  try {
    const scope = resolveSchoolScope(req, res);
    if (!scope) {
      return;
    }

    const params = [req.params.id];
    const schoolClause = buildSchoolClause(
      scope.role,
      scope.schoolId,
      params,
      "administrative_charges"
    );

    const result = await pool.query(
      `
      SELECT
        id,
        charge_name,
        charge_code,
        description,
        is_active,
        school_id,
        created_at,
        updated_at
      FROM administrative_charges
      WHERE id = $1
      ${schoolClause}
      `,
      params
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
    const schoolId = resolveSchoolIdForWrite(req, res);
    if (schoolId == null) {
      return;
    }

    const payload = normalizeChargePayload(req.body);
    const chargeCode = resolveChargeCode(payload.charge_name);

    const result = await pool.query(
      `
      INSERT INTO administrative_charges (
        charge_name,
        charge_code,
        description,
        school_id
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [
        payload.charge_name,
        chargeCode,
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
        message: "An administrative charge with this charge code already exists for this school",
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
    const schoolId = resolveSchoolIdForWrite(req, res);
    if (schoolId == null) {
      return;
    }

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
        schoolId,
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
    const schoolId = resolveSchoolIdForWrite(req, res);
    if (schoolId == null) {
      return;
    }

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
        schoolId,
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
  getAdministrativeChargeDetails,
  getAdministrativeChargeById,
  createAdministrativeCharge,
  updateAdministrativeCharge,
  updateAdministrativeChargeStatus,
};
