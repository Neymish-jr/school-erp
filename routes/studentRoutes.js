const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const {
  getStudents,
  createStudent,
  getStudentById,
  updateStudent,
  deleteStudent
} = require("../controllers/studentController");

/**
 * @swagger
 * /api/students:
 *   get:
 *     summary: Get all students
 *     responses:
 *       200:
 *         description: List of students
 */

router.get("/", authMiddleware, getStudents);

/**
 * @swagger
 * /api/students:
 *   post:
 *     summary: Create student
 *     tags:
 *       - Students
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               gender:
 *                 type: string
 *               category:
 *                 type: string
 *               student_class:
 *                 type: string
 *               section:
 *                 type: string
 *               school_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Student created successfully
 */

router.post(
  "/",
  authMiddleware,
  roleMiddleware("admin"),
  createStudent
);

/**
 * @swagger
 * /api/students:
 *   get:
 *     summary: Get students
 *     tags:
 *       - Students
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: gender
 *         schema:
 *           type: string
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Students fetched successfully
 */

router.get("/:id", authMiddleware, getStudentById);

router.put("/:id", authMiddleware, updateStudent);

router.delete("/:id", authMiddleware, deleteStudent);

module.exports = router;