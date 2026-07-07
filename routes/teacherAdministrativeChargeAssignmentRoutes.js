const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const { authenticate } = require("../middleware/auth");
const authorize = require("../middleware/authorize");
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

router.get(
  "/",
  authenticate,
  authorize("administration.charge_assignment.read"),
  asyncHandler(getAssignments)
);
router.get(
  "/teacher/:teacherId",
  authenticate,
  authorize("administration.charge_assignment.read"),
  asyncHandler(getAssignmentsForTeacher)
);
router.get(
  "/available-charges",
  authenticate,
  authorize("administration.charge_assignment.read"),
  asyncHandler(getAvailableCharges)
);
router.post(
  "/",
  authenticate,
  authorize("administration.charge_assignment.assign"),
  validateRequest(createAssignmentSchema),
  asyncHandler(createAssignment)
);
router.put(
  "/:id",
  authenticate,
  authorize("administration.charge_assignment.update"),
  validateRequest(updateAssignmentSchema),
  asyncHandler(updateAssignment)
);
router.put(
  "/:id/relieve",
  authenticate,
  authorize("administration.charge_assignment.relieve"),
  asyncHandler(relieveAssignment)
);

module.exports = router;
