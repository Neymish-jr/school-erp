const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const { validateRequest } = require("../middleware/validation");
const attendanceSchema = require("../validators/attendanceValidator");

const {
  markAttendance,
  getAttendance,
  getStudentAttendance,
  updateAttendance
} = require("../controllers/attendanceController");

const {
  authenticate,
  isTeacherOrAdmin
} = require("../middleware/auth");

/**
 * @swagger
 * /attendance:
 *   post:
 *     summary: Mark attendance
 *     tags:
 *       - Attendance
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               student_id:
 *                 type: integer
 *               date:
 *                 type: string
 *               period:
 *                 type: integer
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Attendance marked successfully
 */

router.post(
  "/",
  authenticate,
  isTeacherOrAdmin,
  validateRequest(attendanceSchema),
  asyncHandler(markAttendance)
);

router.put(
  "/:id",
  authenticate,
  isTeacherOrAdmin,
  asyncHandler(updateAttendance)
);

router.get(
  "/",
  authenticate,
  asyncHandler(getAttendance)
);

router.get(
  "/student/:id",
  authenticate,
  asyncHandler(getStudentAttendance)
);

module.exports = router;