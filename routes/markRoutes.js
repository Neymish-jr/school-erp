const express = require("express");
const router = express.Router();

const {
  createMark,
  getMarks
} = require("../controllers/markController");

const {
  authenticate,
  isTeacher
} = require("../middleware/auth");

/**
 * @swagger
 * /api/marks:
 *   post:
 *     summary: Add marks
 *     tags:
 *       - Marks
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               student_id:
 *                 type: integer
 *               subject_id:
 *                 type: integer
 *               exam_id:
 *                 type: integer
 *               marks_obtained:
 *                 type: integer
 *               max_marks:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Marks added successfully
 */

router.post(
  "/",
  authenticate,
  isTeacher,
  createMark
);

/**
 * @swagger
 * /api/marks:
 *   get:
 *     summary: Get marks
 *     tags:
 *       - Marks
 *     responses:
 *       200:
 *         description: Marks fetched successfully
 */

router.get("/", getMarks);

module.exports = router;