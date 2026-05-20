const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const { authenticate } = require("../middleware/auth");
const { validateRequest } = require("../middleware/validation");
const classSchema = require("../validators/classValidator");

const {
  getClasses,
  createClass
} = require("../controllers/classController");

/**
 * @swagger
 * /api/classes:
 *   post:
 *     summary: Create a class
 *     tags:
 *       - Classes
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               class_name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Class created successfully
 */
router.post("/", authenticate, validateRequest(classSchema), asyncHandler(createClass));

/**
 * @swagger
 * /api/classes:
 *   get:
 *     summary: Get all classes
 *     tags:
 *       - Classes
 *     responses:
 *       200:
 *         description: Classes fetched successfully
 */

router.get("/", authenticate, asyncHandler(getClasses));

module.exports = router;