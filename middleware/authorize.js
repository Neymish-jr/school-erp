const { hasPermission } = require("../services/permissionService");
const { getEffectiveSchoolId } = require("../utils/schoolContext");

/**
 * Permission middleware factory.
 *
 * Requires `authenticate` to run first so `req.user` is populated.
 *
 * @param {string} permissionKey
 * @returns {import("express").RequestHandler}
 */
const authorize = (permissionKey) => async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const allowed = await hasPermission(
      req.user.id,
      permissionKey,
      getEffectiveSchoolId(req)
    );

    if (allowed) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: "You do not have permission to perform this action.",
      permission: permissionKey,
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = authorize;
