const express = require("express");

const router = express.Router();

const asyncHandler = require("../middleware/asyncHandler");

const { authenticate, isSuperAdmin } = require("../middleware/auth");

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



router.get("/", authenticate, asyncHandler(getBudgetHeads));

router.get("/:id", authenticate, asyncHandler(getBudgetHeadById));

router.post(

  "/",

  authenticate,

  isSuperAdmin,

  validateRequest(budgetHeadSchema),

  asyncHandler(createBudgetHead)

);

router.put(

  "/:id",

  authenticate,

  isSuperAdmin,

  validateRequest(budgetHeadSchema),

  asyncHandler(updateBudgetHead)

);

router.put(

  "/:id/status",

  authenticate,

  isSuperAdmin,

  validateRequest(budgetHeadStatusSchema),

  asyncHandler(updateBudgetHeadStatus)

);



module.exports = router;

