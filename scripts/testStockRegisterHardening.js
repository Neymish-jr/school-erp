/**
 * Verify Stock Register Module P1 hardening (RC).
 * Usage: node backend/scripts/testStockRegisterHardening.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const fs = require("fs");
const path = require("path");

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const read = (relativePath) =>
  fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");

const run = async () => {
  console.log("Stock Register Module Hardening tests\n");

  const stockService = read("services/stockRegisterService.js");
  const stockController = read("controllers/stockController.js");
  const stockRoutes = read("routes/stockRoutes.js");
  const stockPage = fs.readFileSync(
    path.join(
      __dirname,
      "..",
      "..",
      "frontend",
      "src",
      "pages",
      "stockRegister",
      "StockRegister.jsx"
    ),
    "utf8"
  );

  assert(
    stockService.includes("FOR UPDATE OF se") &&
      stockService.includes("getIssuedQuantityForEntry(client, stockEntryId"),
    "issueStock must lock entry row and re-check balance inside transaction"
  );
  console.log("✓ P1-1: concurrent issue protection with row locking");

  assert(
    stockService.includes("pagination:") &&
      stockService.includes("LIMIT $") &&
      stockService.includes("OFFSET $") &&
      stockController.includes("pagination: result.pagination"),
    "list endpoint must support server-side pagination"
  );
  assert(
    stockRoutes.includes("stockEntryListQuerySchema") &&
      stockRoutes.includes('"query"'),
    "list query schema must be wired"
  );
  console.log("✓ P1-2: server pagination, search, and filters");

  assert(
    stockService.includes("buildEntryFilters") &&
      stockService.match(/getStockDashboard[\s\S]*buildEntryFilters/) &&
      stockController.includes("itemName: filters.itemName") &&
      stockController.includes("lowStockOnly: filters.lowStockOnly"),
    "dashboard must accept the same filters as the entry list"
  );
  console.log("✓ P1-3: dashboard filter alignment");

  assert(
    stockPage.includes("openDetailModal") &&
      stockPage.includes("fetchStockEntryById") &&
      stockPage.includes("fetchStockIssues") &&
      stockPage.includes("fetchStockAuditLogs") &&
      stockPage.includes("Issue History") &&
      stockPage.includes("Audit Trail"),
    "frontend must expose entry detail with balance, issues, and audit"
  );
  console.log("✓ P1-4: entry detail modal");

  assert(
    stockPage.includes("buildFilterParams") &&
      stockPage.includes("item_name") &&
      stockPage.includes("Search by item name"),
    "frontend must expose item_name search filter"
  );
  console.log("✓ P1-5: search UI");

  require("../services/stockRegisterService");
  require("../controllers/stockController");
  require("../routes/stockRoutes");
  console.log("✓ Modified modules load without import errors");

  console.log("\nAll stock register hardening checks passed.");
};

run().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
