const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const { authenticate, isAdminLike } = require("../middleware/auth");
const { validateRequest } = require("../middleware/validation");
const {
  createAssignmentSchema,
  updateAssignmentSchema
} = require("../validators/teacherAdministrativeChargeAssignmentValidator");

const {
  getAssignments,
  getAssignmentsForTeacher,
  getAvailableCharges,
  createAssignment,
  updateAssignment,
  relieveAssignment
} = require("../controllers/teacherAdministrativeChargeAssignmentController");

router.use(authenticate, isAdminLike);

router.get("/", asyncHandler(getAssignments));
router.get("/teacher/:teacherId", asyncHandler(getAssignmentsForTeacher));
router.get("/available-charges", asyncHandler(getAvailableCharges));
router.post("/", validateRequest(createAssignmentSchema), asyncHandler(createAssignment));
router.put("/:id", validateRequest(updateAssignmentSchema), asyncHandler(updateAssignment));
router.put("/:id/relieve", asyncHandler(relieveAssignment));

module.exports = router;
