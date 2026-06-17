const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const { authenticate, isAdminLike, isTeacherOrAdmin } = require("../middleware/auth");
const { validateRequest } = require("../middleware/validation");
const {
  teacherSubjectAssignmentSchema,
  relieveSubjectAssignmentSchema,
} = require("../validators/teacherSubjectAssignmentValidator");

const {
  getAssignments,
  getAssignmentsByTeacherId,
  getAssignmentsForTeacher,
  createAssignment,
  relieveAssignment,
} = require("../controllers/teacherSubjectAssignmentController");

router.get("/", authenticate, isAdminLike, asyncHandler(getAssignments));
router.get("/me", authenticate, isTeacherOrAdmin, asyncHandler(getAssignmentsForTeacher));
router.get("/teacher/:teacherId", authenticate, isAdminLike, asyncHandler(getAssignmentsByTeacherId));
router.post(
  "/",
  authenticate,
  isAdminLike,
  validateRequest(teacherSubjectAssignmentSchema),
  asyncHandler(createAssignment)
);
router.put(
  "/:id/relieve",
  authenticate,
  isAdminLike,
  validateRequest(relieveSubjectAssignmentSchema),
  asyncHandler(relieveAssignment)
);

module.exports = router;
