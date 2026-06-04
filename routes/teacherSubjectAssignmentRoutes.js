const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const { authenticate, isAdmin, isTeacherOrAdmin } = require("../middleware/auth");
const { validateRequest } = require("../middleware/validation");
const teacherSubjectAssignmentSchema = require("../validators/teacherSubjectAssignmentValidator");

const {
  getAssignments,
  getAssignmentsForTeacher,
  createAssignment,
  deleteAssignment,
} = require("../controllers/teacherSubjectAssignmentController");

router.get("/", authenticate, isAdmin, asyncHandler(getAssignments));
router.get("/me", authenticate, isTeacherOrAdmin, asyncHandler(getAssignmentsForTeacher));
router.post(
  "/",
  authenticate,
  isAdmin,
  validateRequest(teacherSubjectAssignmentSchema),
  asyncHandler(createAssignment)
);
router.delete("/:id", authenticate, isAdmin, asyncHandler(deleteAssignment));

module.exports = router;
