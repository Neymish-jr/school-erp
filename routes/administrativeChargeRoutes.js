const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const { authenticate, isAdminLike } = require("../middleware/auth");
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

router.get("/", authenticate, asyncHandler(getAdministrativeCharges));
router.get("/:id/details", authenticate, asyncHandler(getAdministrativeChargeDetails));
router.get("/:id", authenticate, asyncHandler(getAdministrativeChargeById));
router.post(
  "/",
  authenticate,
  isAdminLike,
  validateRequest(administrativeChargeSchema),
  asyncHandler(createAdministrativeCharge)
);
router.put(
  "/:id",
  authenticate,
  isAdminLike,
  validateRequest(administrativeChargeSchema),
  asyncHandler(updateAdministrativeCharge)
);
router.put(
  "/:id/status",
  authenticate,
  isAdminLike,
  validateRequest(administrativeChargeStatusSchema),
  asyncHandler(updateAdministrativeChargeStatus)
);

module.exports = router;
