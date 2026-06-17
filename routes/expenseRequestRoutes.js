const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const { authenticate, isAdminLike, isTeacher } = require("../middleware/auth");
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

router.get("/", authenticate, asyncHandler(getExpenseRequests));
router.get("/summary", authenticate, asyncHandler(getExpenseRequestSummary));
router.get("/allocation/:id/balance", authenticate, asyncHandler(getAllocationBalance));
router.get("/:id", authenticate, asyncHandler(getExpenseRequestById));
router.post(
  "/",
  authenticate,
  isTeacher,
  validateRequest(expenseRequestSchema),
  asyncHandler(createExpenseRequest)
);
router.put(
  "/:id",
  authenticate,
  isTeacher,
  validateRequest(expenseRequestSchema),
  asyncHandler(updateExpenseRequest)
);
router.delete("/:id", authenticate, isTeacher, asyncHandler(deleteExpenseRequest));
router.put("/:id/submit", authenticate, isTeacher, asyncHandler(submitExpenseRequest));
router.put(
  "/:id/approve",
  authenticate,
  isAdminLike,
  asyncHandler(approveExpenseRequest)
);
router.put(
  "/:id/reject",
  authenticate,
  isAdminLike,
  validateRequest(expenseRequestRejectSchema),
  asyncHandler(rejectExpenseRequest)
);
router.put(
  "/:id/mark-paid",
  authenticate,
  isAdminLike,
  validateRequest(expenseRequestMarkPaidSchema),
  asyncHandler(markExpenseRequestPaid)
);

module.exports = router;
