const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const { authenticate } = require("../middleware/auth");
const authorize = require("../middleware/authorize");
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

router.get("/", authenticate, authorize("finance.financial_year.read"), asyncHandler(getFinancialYears));
router.get(
  "/active",
  authenticate,
  authorize("finance.financial_year.read"),
  asyncHandler(getActiveFinancialYear)
);
router.get("/:id", authenticate, authorize("finance.financial_year.read"), asyncHandler(getFinancialYearById));
router.post(
  "/",
  authenticate,
  authorize("finance.financial_year.create"),
  validateRequest(financialYearCreateSchema),
  asyncHandler(createFinancialYear)
);
router.put(
  "/:id",
  authenticate,
  authorize("finance.financial_year.update"),
  validateRequest(financialYearUpdateSchema),
  asyncHandler(updateFinancialYear)
);
router.put(
  "/:id/activate",
  authenticate,
  authorize("finance.financial_year.activate"),
  asyncHandler(activateFinancialYear)
);
router.put(
  "/:id/close",
  authenticate,
  authorize("finance.financial_year.close"),
  asyncHandler(closeFinancialYear)
);
router.delete(
  "/:id",
  authenticate,
  authorize("finance.financial_year.delete"),
  asyncHandler(deleteFinancialYear)
);

module.exports = router;
