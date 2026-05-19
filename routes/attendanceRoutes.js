const express = require("express");
const router = express.Router();

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
  markAttendance
);

router.get(
  "/",
  authenticate,
  getAttendance
);

router.get(
  "/student/:id",
  authenticate,
  getStudentAttendance
);

module.exports = router;