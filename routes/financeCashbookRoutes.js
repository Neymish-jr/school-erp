const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const { authenticate } = require("../middleware/auth");
const authorize = require("../middleware/authorize");
const {
  getCashbookEntries,
  getCashbookEntry,
  getCashbookSummary,
  exportCashbook,
} = require("../controllers/cashbookEntryController");

router.get(
  "/",
  authenticate,
  authorize("finance.cashbook.read"),
  asyncHandler(getCashbookEntries)
);
router.get(
  "/summary",
  authenticate,
  authorize("finance.cashbook.read_summary"),
  asyncHandler(getCashbookSummary)
);
router.get(
  "/export",
  authenticate,
  authorize("finance.cashbook.export"),
  asyncHandler(exportCashbook)
);
router.get(
  "/:id",
  authenticate,
  authorize("finance.cashbook.read"),
  asyncHandler(getCashbookEntry)
);

module.exports = router;
