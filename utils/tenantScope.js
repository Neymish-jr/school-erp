const { errorResponse } = require("./response");
const {
  getEffectiveSchoolId,
  isPlatformRole,
} = require("./schoolContext");

const resolveSchoolIdForWrite = (req, res) => {
  const schoolId = getEffectiveSchoolId(req);

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
  const { role } = req.user || {};
  const schoolId = getEffectiveSchoolId(req);

  if (isPlatformRole(role)) {
    return { schoolId, role };
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
  if (schoolId != null) {
    params.push(schoolId);
    return ` AND ${tableAlias}.school_id = $${params.length}`;
  }

  return "";
};

module.exports = {
  resolveSchoolIdForWrite,
  resolveSchoolScope,
  buildSchoolClause,
  getEffectiveSchoolId,
};
