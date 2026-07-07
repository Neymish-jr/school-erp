const express = require("express");

const router = express.Router();

const asyncHandler = require("../middleware/asyncHandler");

const { authenticate } = require("../middleware/auth");
const authorize = require("../middleware/authorize");

const { validateRequest } = require("../middleware/validation");

const {
  budgetSubHeadSchema,
  budgetSubHeadStatusSchema,
} = require("../validators/budgetSubHeadValidator");

const {
  getBudgetSubHeads,
  getBudgetSubHeadById,
  createBudgetSubHead,
  updateBudgetSubHead,
  updateBudgetSubHeadStatus,
} = require("../controllers/budgetSubHeadController");

router.get("/", authenticate, authorize("finance.budget_sub_head.read"), asyncHandler(getBudgetSubHeads));

router.get("/:id", authenticate, authorize("finance.budget_sub_head.read"), asyncHandler(getBudgetSubHeadById));

router.post(
  "/",
  authenticate,
  authorize("finance.budget_sub_head.create"),
  validateRequest(budgetSubHeadSchema),
  asyncHandler(createBudgetSubHead)
);

router.put(
  "/:id",
  authenticate,
  authorize("finance.budget_sub_head.update"),
  validateRequest(budgetSubHeadSchema),
  asyncHandler(updateBudgetSubHead)
);

router.put(
  "/:id/status",
  authenticate,
  authorize("finance.budget_sub_head.activate"),
  validateRequest(budgetSubHeadStatusSchema),
  asyncHandler(updateBudgetSubHeadStatus)
);

module.exports = router;
