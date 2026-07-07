const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const { authenticate } = require("../middleware/auth");
const authorize = require("../middleware/authorize");
const { validateRequest } = require("../middleware/validation");
const {
  budgetAllocationSchema,
  budgetAllocationUpdateSchema,
  budgetAllocationStatusSchema,
} = require("../validators/budgetAllocationValidator");
const {
  getBudgetAllocations,
  getBudgetAllocationSummary,
  getBudgetAllocationById,
  createBudgetAllocation,
  updateBudgetAllocation,
  updateBudgetAllocationStatus,
} = require("../controllers/budgetAllocationController");

router.get(
  "/",
  authenticate,
  authorize("finance.budget_allocation.read"),
  asyncHandler(getBudgetAllocations)
);
router.get(
  "/summary",
  authenticate,
  authorize("finance.budget_allocation.read_summary"),
  asyncHandler(getBudgetAllocationSummary)
);
router.get(
  "/:id",
  authenticate,
  authorize("finance.budget_allocation.read"),
  asyncHandler(getBudgetAllocationById)
);
router.post(
  "/",
  authenticate,
  authorize("finance.budget_allocation.create"),
  validateRequest(budgetAllocationSchema),
  asyncHandler(createBudgetAllocation)
);
router.put(
  "/:id",
  authenticate,
  authorize("finance.budget_allocation.update"),
  validateRequest(budgetAllocationUpdateSchema),
  asyncHandler(updateBudgetAllocation)
);
router.put(
  "/:id/status",
  authenticate,
  authorize("finance.budget_allocation.activate"),
  validateRequest(budgetAllocationStatusSchema),
  asyncHandler(updateBudgetAllocationStatus)
);

module.exports = router;
