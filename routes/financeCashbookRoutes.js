const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const { authenticate, isAdminOrSuperAdmin } = require("../middleware/auth");
const {
  getCashbookEntries,
  getCashbookEntry,
  getCashbookSummary,
  exportCashbook,
} = require("../controllers/cashbookEntryController");

router.use(authenticate, isAdminOrSuperAdmin);

router.get("/", asyncHandler(getCashbookEntries));
router.get("/summary", asyncHandler(getCashbookSummary));
router.get("/export", asyncHandler(exportCashbook));
router.get("/:id", asyncHandler(getCashbookEntry));

module.exports = router;
