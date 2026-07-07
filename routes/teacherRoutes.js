const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const { authenticate } = require("../middleware/auth");
const authorize = require("../middleware/authorize");
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

router.post(
  "/",
  authenticate,
  authorize("teacher.create"),
  validateRequest(teacherSchema),
  asyncHandler(createTeacher)
);

router.get("/", authenticate, authorize("teacher.read"), asyncHandler(getTeachers));

router.get("/:id", authenticate, authorize("teacher.read"), asyncHandler(getTeacherById));

router.put(
  "/:id",
  authenticate,
  authorize("teacher.update"),
  validateRequest(teacherUpdateSchema),
  asyncHandler(updateTeacher)
);

router.delete(
  "/:id",
  authenticate,
  authorize("teacher.delete"),
  asyncHandler(deleteTeacher)
);

module.exports = router;
