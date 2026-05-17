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

// TEACHER CHECK
const isTeacher = (req, res, next) => {

  if (req.user.role !== "teacher") {
    return res.status(403).send("Only teachers allowed");
  }

  next();

};

module.exports = {
  authenticate,
  isAdmin,
  isTeacher
};