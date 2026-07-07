const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const { validateRequest } = require("../middleware/validation");
const { authenticate } = require("../middleware/auth");
const authorize = require("../middleware/authorize");
const {
  stockEntryCreateSchema,
  stockIssueCreateSchema,
  stockEntryListQuerySchema,
  stockDashboardQuerySchema,
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

router.get("/config", authenticate, authorize("stock.config.read"), asyncHandler(getStockConfig));
router.get(
  "/dashboard",
  authenticate,
  authorize("stock.dashboard.read"),
  validateRequest(stockDashboardQuerySchema, "query"),
  asyncHandler(getStockDashboard)
);
router.get(
  "/entries",
  authenticate,
  authorize("stock.entry.read"),
  validateRequest(stockEntryListQuerySchema, "query"),
  asyncHandler(getStockEntries)
);
router.post(
  "/entries",
  authenticate,
  authorize("stock.entry.create"),
  validateRequest(stockEntryCreateSchema),
  asyncHandler(createStockEntry)
);
router.get(
  "/entries/:id",
  authenticate,
  authorize("stock.entry.read"),
  asyncHandler(getStockEntryById)
);
router.get("/issues", authenticate, authorize("stock.issue.read"), asyncHandler(getStockIssues));
router.post(
  "/issues",
  authenticate,
  authorize("stock.issue.create"),
  validateRequest(stockIssueCreateSchema),
  asyncHandler(createStockIssue)
);
router.get(
  "/audit-logs",
  authenticate,
  authorize("stock.audit_log.read"),
  asyncHandler(getStockAuditLogs)
);

router.get("/", authenticate, authorize("stock.register.read"), asyncHandler(getStockRegister));

module.exports = router;
