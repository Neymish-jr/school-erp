const express = require("express");

const router = express.Router();

const asyncHandler = require("../middleware/asyncHandler");

const { authenticate, isSuperAdmin } = require("../middleware/auth");

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



router.get("/", authenticate, asyncHandler(getBudgetSubHeads));

router.get("/:id", authenticate, asyncHandler(getBudgetSubHeadById));

router.post(

  "/",

  authenticate,

  isSuperAdmin,

  validateRequest(budgetSubHeadSchema),

  asyncHandler(createBudgetSubHead)

);

router.put(

  "/:id",

  authenticate,

  isSuperAdmin,

  validateRequest(budgetSubHeadSchema),

  asyncHandler(updateBudgetSubHead)

);

router.put(

  "/:id/status",

  authenticate,

  isSuperAdmin,

  validateRequest(budgetSubHeadStatusSchema),

  asyncHandler(updateBudgetSubHeadStatus)

);



module.exports = router;

