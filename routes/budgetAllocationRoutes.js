const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const { authenticate, isAdminLike } = require("../middleware/auth");
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

router.get("/", authenticate, asyncHandler(getBudgetAllocations));
router.get("/summary", authenticate, asyncHandler(getBudgetAllocationSummary));
router.get("/:id", authenticate, asyncHandler(getBudgetAllocationById));
router.post(
  "/",
  authenticate,
  isAdminLike,
  validateRequest(budgetAllocationSchema),
  asyncHandler(createBudgetAllocation)
);
router.put(
  "/:id",
  authenticate,
  isAdminLike,
  validateRequest(budgetAllocationUpdateSchema),
  asyncHandler(updateBudgetAllocation)
);
router.put(
  "/:id/status",
  authenticate,
  isAdminLike,
  validateRequest(budgetAllocationStatusSchema),
  asyncHandler(updateBudgetAllocationStatus)
);

module.exports = router;
