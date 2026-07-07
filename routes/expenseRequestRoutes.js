const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const { authenticate } = require("../middleware/auth");
const authorize = require("../middleware/authorize");
const { validateRequest } = require("../middleware/validation");
const {
  expenseRequestSchema,
  expenseRequestRejectSchema,
  expenseRequestMarkPaidSchema,
} = require("../validators/expenseRequestValidator");
const {
  getExpenseRequests,
  getExpenseRequestSummary,
  getAllocationBalance,
  getExpenseRequestById,
  createExpenseRequest,
  updateExpenseRequest,
  deleteExpenseRequest,
  submitExpenseRequest,
  approveExpenseRequest,
  rejectExpenseRequest,
  markExpenseRequestPaid,
} = require("../controllers/expenseRequestController");

router.get("/", authenticate, authorize("finance.expense_request.read"), asyncHandler(getExpenseRequests));
router.get(
  "/summary",
  authenticate,
  authorize("finance.expense_request.read_summary"),
  asyncHandler(getExpenseRequestSummary)
);
router.get(
  "/allocation/:id/balance",
  authenticate,
  authorize("finance.budget_allocation.read_balance"),
  asyncHandler(getAllocationBalance)
);
router.get("/:id", authenticate, authorize("finance.expense_request.read"), asyncHandler(getExpenseRequestById));
router.post(
  "/",
  authenticate,
  authorize("finance.expense_request.create"),
  validateRequest(expenseRequestSchema),
  asyncHandler(createExpenseRequest)
);
router.put(
  "/:id",
  authenticate,
  authorize("finance.expense_request.update"),
  validateRequest(expenseRequestSchema),
  asyncHandler(updateExpenseRequest)
);
router.delete(
  "/:id",
  authenticate,
  authorize("finance.expense_request.delete"),
  asyncHandler(deleteExpenseRequest)
);
router.put(
  "/:id/submit",
  authenticate,
  authorize("finance.expense_request.submit"),
  asyncHandler(submitExpenseRequest)
);
router.put(
  "/:id/approve",
  authenticate,
  authorize("finance.expense_request.approve"),
  asyncHandler(approveExpenseRequest)
);
router.put(
  "/:id/reject",
  authenticate,
  authorize("finance.expense_request.reject"),
  validateRequest(expenseRequestRejectSchema),
  asyncHandler(rejectExpenseRequest)
);
router.put(
  "/:id/mark-paid",
  authenticate,
  authorize("finance.expense_request.mark_paid"),
  validateRequest(expenseRequestMarkPaidSchema),
  asyncHandler(markExpenseRequestPaid)
);

module.exports = router;
