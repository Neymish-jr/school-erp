const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const {
  authenticate,
  isAdminLike,
  isSuperAdmin,
} = require("../middleware/auth");
const { validateRequest } = require("../middleware/validation");
const {
  financialYearCreateSchema,
  financialYearUpdateSchema,
} = require("../validators/financialYearValidator");
const {
  getFinancialYears,
  getActiveFinancialYear,
  getFinancialYearById,
  createFinancialYear,
  updateFinancialYear,
  activateFinancialYear,
  closeFinancialYear,
  deleteFinancialYear,
} = require("../controllers/financialYearController");

router.get("/", authenticate, asyncHandler(getFinancialYears));
router.get("/active", authenticate, asyncHandler(getActiveFinancialYear));
router.get("/:id", authenticate, asyncHandler(getFinancialYearById));
router.post(
  "/",
  authenticate,
  isAdminLike,
  validateRequest(financialYearCreateSchema),
  asyncHandler(createFinancialYear)
);
router.put(
  "/:id",
  authenticate,
  isAdminLike,
  validateRequest(financialYearUpdateSchema),
  asyncHandler(updateFinancialYear)
);
router.put(
  "/:id/activate",
  authenticate,
  isAdminLike,
  asyncHandler(activateFinancialYear)
);
router.put(
  "/:id/close",
  authenticate,
  isAdminLike,
  asyncHandler(closeFinancialYear)
);
router.delete(
  "/:id",
  authenticate,
  isSuperAdmin,
  asyncHandler(deleteFinancialYear)
);

module.exports = router;
