const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const { authenticate } = require("../middleware/auth");
const authorize = require("../middleware/authorize");
const { validateRequest } = require("../middleware/validation");
const {
  createAssignmentSchema,
  relieveAssignmentSchema,
} = require("../validators/teacherStaffPostAssignmentValidator");
const {
  getAssignments,
  getAssignmentsForTeacher,
  getCurrentAssignmentForTeacher,
  getAssignmentsForStaffPost,
  getVacantStaffPosts,
  createAssignment,
  relieveAssignment,
} = require("../controllers/teacherStaffPostAssignmentController");

router.get(
  "/",
  authenticate,
  authorize("staff_post_assignment.read"),
  asyncHandler(getAssignments)
);
router.get(
  "/teacher/:teacherId",
  authenticate,
  authorize("staff_post_assignment.read"),
  asyncHandler(getAssignmentsForTeacher)
);
router.get(
  "/teacher/:teacherId/current",
  authenticate,
  authorize("staff_post_assignment.read"),
  asyncHandler(getCurrentAssignmentForTeacher)
);
router.get(
  "/staff-post/:staffPostId",
  authenticate,
  authorize("staff_post_assignment.read"),
  asyncHandler(getAssignmentsForStaffPost)
);
router.get(
  "/vacant-staff-posts",
  authenticate,
  authorize("staff_post_assignment.read_vacant"),
  asyncHandler(getVacantStaffPosts)
);
router.post(
  "/",
  authenticate,
  authorize("staff_post_assignment.assign"),
  validateRequest(createAssignmentSchema),
  asyncHandler(createAssignment)
);
router.put(
  "/:id/relieve",
  authenticate,
  authorize("staff_post_assignment.relieve"),
  validateRequest(relieveAssignmentSchema),
  asyncHandler(relieveAssignment)
);

module.exports = router;
