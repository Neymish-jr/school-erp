const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const asyncHandler = require("../middleware/asyncHandler");
const { validateRequest } = require("../middleware/validation");
const { authenticate } = require("../middleware/auth");
const authorize = require("../middleware/authorize");
const {
  quotationCreateSchema,
} = require("../validators/quotationValidator");
const {
  getQuotationConfig,
  getQuotations,
  getQuotationComparison,
  getQuotationById,
  createQuotation,
  selectQuotation,
} = require("../controllers/quotationController");

router.get(
  "/config",
  authenticate,
  authorize("finance.quotation.read_config"),
  asyncHandler(getQuotationConfig)
);
router.get("/", authenticate, authorize("finance.quotation.read"), asyncHandler(getQuotations));

router.post(
  "/",
  authenticate,
  authorize("finance.quotation.create"),
  upload.single("attachment"),
  validateRequest(quotationCreateSchema),
  asyncHandler(createQuotation)
);

router.get(
  "/expense-request/:expenseRequestId/comparison",
  authenticate,
  authorize("finance.quotation.read_comparison"),
  asyncHandler(getQuotationComparison)
);

router.get("/:id", authenticate, authorize("finance.quotation.read"), asyncHandler(getQuotationById));
router.put(
  "/:id/select",
  authenticate,
  authorize("finance.quotation.select"),
  asyncHandler(selectQuotation)
);

module.exports = router;
