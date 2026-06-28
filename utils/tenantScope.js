const { errorResponse } = require("./response");

const resolveSchoolIdForWrite = (req, res) => {
  const { school_id: schoolId } = req.user || {};

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

const resolveSchoolScope = (req, res) => {
  const { school_id: schoolId, role } = req.user || {};

  if (role === "super_admin") {
    return { schoolId: schoolId ?? null, role };
  }

  if (schoolId == null) {
    errorResponse(res, {
      message: "School context is required for this operation",
      error: "Missing school_id",
      status: 400,
    });
    return null;
  }

  return { schoolId, role };
};

const buildSchoolClause = (role, schoolId, params, tableAlias = "administrative_charges") => {
  if (role !== "super_admin" && schoolId != null) {
    params.push(schoolId);
    return ` AND ${tableAlias}.school_id = $${params.length}`;
  }

  return "";
};

module.exports = {
  resolveSchoolIdForWrite,
  resolveSchoolScope,
  buildSchoolClause,
};
