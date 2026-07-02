const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const { authenticate } = require("../middleware/auth");
const authorize = require("../middleware/authorize");
const { validateRequest } = require("../middleware/validation");
const {
  administrativeChargeSchema,
  administrativeChargeStatusSchema,
} = require("../validators/administrativeChargeValidator");

const {
  getAdministrativeCharges,
  getAdministrativeChargeDetails,
  getAdministrativeChargeById,
  createAdministrativeCharge,
  updateAdministrativeCharge,
  updateAdministrativeChargeStatus,
} = require("../controllers/administrativeChargeController");

router.get(
  "/",
  authenticate,
  authorize("administration.charge.read"),
  asyncHandler(getAdministrativeCharges)
);
router.get(
  "/:id/details",
  authenticate,
  authorize("administration.charge.read_details"),
  asyncHandler(getAdministrativeChargeDetails)
);
router.get(
  "/:id",
  authenticate,
  authorize("administration.charge.read"),
  asyncHandler(getAdministrativeChargeById)
);
router.post(
  "/",
  authenticate,
  authorize("administration.charge.create"),
  validateRequest(administrativeChargeSchema),
  asyncHandler(createAdministrativeCharge)
);
router.put(
  "/:id",
  authenticate,
  authorize("administration.charge.update"),
  validateRequest(administrativeChargeSchema),
  asyncHandler(updateAdministrativeCharge)
);
router.put(
  "/:id/status",
  authenticate,
  authorize("administration.charge.activate"),
  validateRequest(administrativeChargeStatusSchema),
  asyncHandler(updateAdministrativeChargeStatus)
);

module.exports = router;
