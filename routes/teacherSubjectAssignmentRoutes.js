const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const { authenticate } = require("../middleware/auth");
const authorize = require("../middleware/authorize");
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

router.get(
  "/",
  authenticate,
  authorize("teacher_subject_assignment.read"),
  asyncHandler(getAssignments)
);
router.get(
  "/me",
  authenticate,
  authorize("teacher_subject_assignment.read_own"),
  asyncHandler(getAssignmentsForTeacher)
);
router.get(
  "/teacher/:teacherId",
  authenticate,
  authorize("teacher_subject_assignment.read"),
  asyncHandler(getAssignmentsByTeacherId)
);
router.post(
  "/",
  authenticate,
  authorize("teacher_subject_assignment.assign"),
  validateRequest(teacherSubjectAssignmentSchema),
  asyncHandler(createAssignment)
);
router.put(
  "/:id/relieve",
  authenticate,
  authorize("teacher_subject_assignment.relieve"),
  validateRequest(relieveSubjectAssignmentSchema),
  asyncHandler(relieveAssignment)
);

module.exports = router;
