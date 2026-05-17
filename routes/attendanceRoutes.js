const express = require("express");
const router = express.Router();

const {
  markAttendance
} = require("../controllers/attendanceController");

const {
  authenticate,
  isTeacher
} = require("../middleware/auth");

router.post(
  "/",
  authenticate,
  isTeacher,
  markAttendance
);

module.exports = router;