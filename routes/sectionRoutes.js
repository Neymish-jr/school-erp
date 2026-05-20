const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const { authenticate } = require("../middleware/auth");
const { validateRequest } = require("../middleware/validation");
const sectionSchema = require("../validators/sectionValidator");

const {
  createSection,
  getSections
} = require("../controllers/sectionController");

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

router.post("/", authenticate, validateRequest(sectionSchema), asyncHandler(createSection));

/**
 * @swagger
 * /api/sections:
 *   get:
 *     summary: Get sections
 *     tags:
 *       - Sections
 *     responses:
 *       200:
 *         description: Sections fetched successfully
 */
router.get("/", authenticate, asyncHandler(getSections));

module.exports = router;