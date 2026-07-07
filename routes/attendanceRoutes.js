const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const { validateRequest } = require("../middleware/validation");
const attendanceSchema = require("../validators/attendanceValidator");
const {
  attendanceUpdateSchema,
  bulkAttendanceSchema,
} = require("../validators/attendanceValidator");

const {
  markAttendance,
  getAttendance,
  getStudentAttendance,
  updateAttendance,
  bulkSubmitAttendance,
} = require("../controllers/attendanceController");

const { authenticate } = require("../middleware/auth");
const authorize = require("../middleware/authorize");

router.post(
  "/bulk",
  authenticate,
  authorize("attendance.mark"),
  validateRequest(bulkAttendanceSchema),
  asyncHandler(bulkSubmitAttendance)
);

router.post(
  "/",
  authenticate,
  authorize("attendance.mark"),
  validateRequest(attendanceSchema),
  asyncHandler(markAttendance)
);

router.put(
  "/:id",
  authenticate,
  authorize("attendance.update"),
  validateRequest(attendanceUpdateSchema),
  asyncHandler(updateAttendance)
);

router.get("/", authenticate, authorize("attendance.read"), asyncHandler(getAttendance));

router.get(
  "/student/:id",
  authenticate,
  authorize("attendance.student.read"),
  asyncHandler(getStudentAttendance)
);

module.exports = router;
