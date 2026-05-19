const express = require("express");
const router = express.Router();

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
router.post("/", createClass);

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

router.get("/", getClasses);

module.exports = router;