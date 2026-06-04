const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const { authenticate, isAdmin } = require("../middleware/auth");
const { validateRequest } = require("../middleware/validation");
const {
  administrativeChargeSchema,
  administrativeChargeStatusSchema,
} = require("../validators/administrativeChargeValidator");

const {
  getAdministrativeCharges,
  getAdministrativeChargeById,
  createAdministrativeCharge,
  updateAdministrativeCharge,
  updateAdministrativeChargeStatus,
} = require("../controllers/administrativeChargeController");

router.get("/", authenticate, asyncHandler(getAdministrativeCharges));
router.get("/:id", authenticate, asyncHandler(getAdministrativeChargeById));
router.post(
  "/",
  authenticate,
  isAdmin,
  validateRequest(administrativeChargeSchema),
  asyncHandler(createAdministrativeCharge)
);
router.put(
  "/:id",
  authenticate,
  isAdmin,
  validateRequest(administrativeChargeSchema),
  asyncHandler(updateAdministrativeCharge)
);
router.put(
  "/:id/status",
  authenticate,
  isAdmin,
  validateRequest(administrativeChargeStatusSchema),
  asyncHandler(updateAdministrativeChargeStatus)
);

module.exports = router;
