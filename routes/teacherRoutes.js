const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const { authenticate, isAdminLike } = require("../middleware/auth");
const { validateRequest } = require("../middleware/validation");
const teacherSchema = require("../validators/teacherValidator");
const teacherUpdateSchema = teacherSchema.teacherUpdateSchema;

const {
  createTeacher,
  getTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher
} = require("../controllers/teacherController");

/**
 * @swagger
 * /api/teachers:
 *   post:
 *     summary: Create a teacher
 *     tags:
 *       - Teachers
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               teacher_name:
 *                 type: string
 *               designation:
 *                 type: string
 *     responses:
 *       200:
 *         description: Teacher created successfully
 */
router.post(
  "/",
  authenticate,
  isAdminLike,
  validateRequest(teacherSchema),
  asyncHandler(createTeacher)
);

/**
 * @swagger
 * /api/teachers:
 *   get:
 *     summary: Get all teachers
 *     tags:
 *       - Teachers
 *     responses:
 *       200:
 *         description: Teachers fetched successfully
 */
router.get("/", authenticate, asyncHandler(getTeachers));

/**
 * @swagger
 * /api/teachers/{id}:
 *   get:
 *     summary: Get a teacher by ID
 *     tags:
 *       - Teachers
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Teacher fetched successfully
 */
router.get("/:id", authenticate, asyncHandler(getTeacherById));

/**
 * @swagger
 * /api/teachers/{id}:
 *   put:
 *     summary: Update a teacher
 *     tags:
 *       - Teachers
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               teacher_name:
 *                 type: string
 *               designation:
 *                 type: string
 *     responses:
 *       200:
 *         description: Teacher updated successfully
 */
router.put(
  "/:id",
  authenticate,
  isAdminLike,
  validateRequest(teacherUpdateSchema),
  asyncHandler(updateTeacher)
);

/**
 * @swagger
 * /api/teachers/{id}:
 *   delete:
 *     summary: Delete a teacher
 *     tags:
 *       - Teachers
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Teacher deleted successfully
 */
router.delete(
  "/:id",
  authenticate,
  isAdminLike,
  asyncHandler(deleteTeacher)
);

module.exports = router;