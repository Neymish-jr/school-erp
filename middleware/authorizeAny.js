const { hasAnyPermission } = require("../services/permissionService");
const { getEffectiveSchoolId } = require("../utils/schoolContext");

/**
 * Permission middleware — user must hold at least one of the given keys.
 *
 * @param {string[]} permissionKeys
 * @returns {import("express").RequestHandler}
 */
const authorizeAny = (permissionKeys) => async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const keys = Array.isArray(permissionKeys) ? permissionKeys : [permissionKeys];

    const allowed = await hasAnyPermission(
      req.user.id,
      keys,
      getEffectiveSchoolId(req)
    );

    if (allowed) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: "You do not have permission to perform this action.",
      permissions: keys,
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = authorizeAny;
