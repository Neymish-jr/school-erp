const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const { authenticate, isAdmin } = require("../middleware/auth");
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

router.use(authenticate, isAdmin);

router.get("/", asyncHandler(getAssignments));
router.get("/teacher/:teacherId", asyncHandler(getAssignmentsForTeacher));
router.get("/teacher/:teacherId/current", asyncHandler(getCurrentAssignmentForTeacher));
router.get("/staff-post/:staffPostId", asyncHandler(getAssignmentsForStaffPost));
router.get("/vacant-staff-posts", asyncHandler(getVacantStaffPosts)); // Renamed from /vacancies
router.post("/", validateRequest(createAssignmentSchema), asyncHandler(createAssignment));
router.put("/:id/relieve", validateRequest(relieveAssignmentSchema), asyncHandler(relieveAssignment));

module.exports = router;