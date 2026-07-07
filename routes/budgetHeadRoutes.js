const express = require("express");

const router = express.Router();

const asyncHandler = require("../middleware/asyncHandler");

const { authenticate } = require("../middleware/auth");
const authorize = require("../middleware/authorize");

const { validateRequest } = require("../middleware/validation");

const {
  budgetHeadSchema,
  budgetHeadStatusSchema,
} = require("../validators/budgetHeadValidator");

const {
  getBudgetHeads,
  getBudgetHeadById,
  createBudgetHead,
  updateBudgetHead,
  updateBudgetHeadStatus,
} = require("../controllers/budgetHeadController");

router.get("/", authenticate, authorize("finance.budget_head.read"), asyncHandler(getBudgetHeads));

router.get("/:id", authenticate, authorize("finance.budget_head.read"), asyncHandler(getBudgetHeadById));

router.post(
  "/",
  authenticate,
  authorize("finance.budget_head.create"),
  validateRequest(budgetHeadSchema),
  asyncHandler(createBudgetHead)
);

router.put(
  "/:id",
  authenticate,
  authorize("finance.budget_head.update"),
  validateRequest(budgetHeadSchema),
  asyncHandler(updateBudgetHead)
);

router.put(
  "/:id/status",
  authenticate,
  authorize("finance.budget_head.activate"),
  validateRequest(budgetHeadStatusSchema),
  asyncHandler(updateBudgetHeadStatus)
);

module.exports = router;
