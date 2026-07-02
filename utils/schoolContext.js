const { isPlatformRole } = require("../constants/roles");

const ACTIVE_SCHOOL_ID_HEADER = "x-school-id";

const parseSchoolId = (value) => {
  if (value == null || value === "") {
    return null;
  }

  const schoolId = Number(value);
  return Number.isInteger(schoolId) && schoolId > 0 ? schoolId : null;
};

/**
 * Resolve the effective tenant school for the current request.
 * Priority: JWT school_id → X-School-Id header → school_id query param.
 */
const getEffectiveSchoolId = (req) => {
  const jwtSchoolId = parseSchoolId(req.user?.school_id);
  if (jwtSchoolId != null) {
    return jwtSchoolId;
  }

  const headerSchoolId = parseSchoolId(req.headers[ACTIVE_SCHOOL_ID_HEADER]);
  if (headerSchoolId != null) {
    return headerSchoolId;
  }

  return parseSchoolId(req.query?.school_id);
};

module.exports = {
  ACTIVE_SCHOOL_ID_HEADER,
  parseSchoolId,
  getEffectiveSchoolId,
  isPlatformRole,
};
