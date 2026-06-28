const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const asyncHandler = require("../middleware/asyncHandler");
const { validateRequest } = require("../middleware/validation");
const {
  authenticate,
  isAdminLike,
  isTeacherOrAdminLike,
} = require("../middleware/auth");
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

router.get("/config", authenticate, asyncHandler(getQuotationConfig));
router.get("/", authenticate, asyncHandler(getQuotations));

router.post(
  "/",
  authenticate,
  isTeacherOrAdminLike,
  upload.single("attachment"),
  validateRequest(quotationCreateSchema),
  asyncHandler(createQuotation)
);

router.get(
  "/expense-request/:expenseRequestId/comparison",
  authenticate,
  asyncHandler(getQuotationComparison)
);

router.get("/:id", authenticate, asyncHandler(getQuotationById));
router.put("/:id/select", authenticate, isAdminLike, asyncHandler(selectQuotation));

module.exports = router;
