const jwt = require("jsonwebtoken");

// AUTHENTICATE USER
const authenticate = (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(401).send("No token");
  }

  const token = authHeader.split(" ")[1];

  try {
    const user = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.user = user;

    next();
  } catch (err) {
    return res.status(403).send("Invalid token");
  }
};

// ADMIN CHECK
const isAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).send("Access denied");
  }

  next();
};

// SUPER ADMIN CHECK
const isSuperAdmin = (req, res, next) => {
  if (req.user.role !== "super_admin") {
    return res.status(403).send("Access denied");
  }

  next();
};

// TEACHER CHECK
const isTeacher = (req, res, next) => {
  if (req.user.role !== "teacher") {
    return res.status(403).send("Only teachers allowed");
  }

  next();
};

// ALLOW ADMIN OR TEACHER
const isTeacherOrAdmin = (req, res, next) => {
  if (!["teacher", "admin"].includes(req.user.role)) {
    return res.status(403).send("Only teachers and admins allowed");
  }

  next();
};

// ALLOW ADMIN OR SUPER ADMIN
const isAdminOrSuperAdmin = (req, res, next) => {
  if (!["admin", "super_admin"].includes(req.user.role)) {
    return res.status(403).send("Access denied");
  }

  next();
};

// LEGACY ADMIN ROUTES
const isAdminLike = (req, res, next) => {
  if (!["admin", "super_admin"].includes(req.user.role)) {
    return res.status(403).send("Access denied");
  }

  next();
};

// LEGACY TEACHER/ADMIN ROUTES (includes super_admin)
const isTeacherOrAdminLike = (req, res, next) => {
  if (!["teacher", "admin", "super_admin"].includes(req.user.role)) {
    return res.status(403).send("Access denied");
  }

  next();
};

module.exports = {
  authenticate,
  isAdmin,
  isSuperAdmin,
  isTeacher,
  isTeacherOrAdmin,
  isAdminOrSuperAdmin,
  isAdminLike,
  isTeacherOrAdminLike,
};