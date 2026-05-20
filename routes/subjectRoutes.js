const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const { authenticate } = require("../middleware/auth");

const {
  createSubject,
  getSubjects
} = require("../controllers/subjectController");

/**
 * @swagger
 * /api/sections:
 *   post:
 *     summary: Create section
 *     tags:
 *       - Sections
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               section_name:
 *                 type: string
 *               class_id:
 *                 type: integer
 *               class_teacher_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Section created successfully
 */

router.post("/", authenticate, asyncHandler(createSubject));

/**
 * @swagger
 * /api/subjects:
 *   get:
 *     summary: Get subjects
 *     tags:
 *       - Subjects
 *     responses:
 *       200:
 *         description: Subjects fetched successfully
 */

router.get("/", authenticate, asyncHandler(getSubjects));

module.exports = router;