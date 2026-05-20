const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");

const {
  markAttendance,
  getAttendance,
  getStudentAttendance
} = require("../controllers/attendanceController");

const {
  authenticate,
  isTeacher
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
  isTeacher,
  asyncHandler(markAttendance)
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