const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const { validateRequest } = require("../middleware/validation");
const { authenticate, isAdminLike } = require("../middleware/auth");
const {
  stockEntryCreateSchema,
  stockIssueCreateSchema,
} = require("../validators/stockValidator");
const {
  getStockConfig,
  getStockDashboard,
  getStockEntries,
  getStockEntryById,
  createStockEntry,
  getStockIssues,
  createStockIssue,
  getStockAuditLogs,
  getStockRegister,
} = require("../controllers/stockController");

router.use(authenticate, isAdminLike);

router.get("/config", asyncHandler(getStockConfig));
router.get("/dashboard", asyncHandler(getStockDashboard));
router.get("/entries", asyncHandler(getStockEntries));
router.post(
  "/entries",
  validateRequest(stockEntryCreateSchema),
  asyncHandler(createStockEntry)
);
router.get("/entries/:id", asyncHandler(getStockEntryById));
router.get("/issues", asyncHandler(getStockIssues));
router.post(
  "/issues",
  validateRequest(stockIssueCreateSchema),
  asyncHandler(createStockIssue)
);
router.get("/audit-logs", asyncHandler(getStockAuditLogs));

// Legacy route alias
router.get("/", asyncHandler(getStockRegister));

module.exports = router;
