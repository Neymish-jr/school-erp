/**
 * Verify Cashbook Module P1 hardening (RC).
 * Usage: node backend/scripts/testCashbookHardening.js
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
  console.log("Cashbook Module Hardening tests\n");

  const cashbookEntryService = read("services/cashbookEntryService.js");
  const legacyCashbookController = read("controllers/cashbookController.js");
  const cashbookEntryConstants = read("constants/cashbookEntry.js");
  const cashbookPage = fs.readFileSync(
    path.join(
      __dirname,
      "..",
      "..",
      "frontend",
      "src",
      "pages",
      "finance",
      "cashbook",
      "Cashbook.jsx"
    ),
    "utf8"
  );

  assert(
    !cashbookEntryService.includes("search: undefined") &&
      cashbookEntryService.includes("buildListFilters(filters)") &&
      cashbookEntryService.match(/getCashbookSummary[\s\S]*?buildListFilters\(filters\)/),
    "summary must use the same filters as list (including search)"
  );
  console.log("✓ P1-1: summary uses full filter set");

  assert(
    cashbookEntryConstants.includes("CASHBOOK_EXPORT_MAX_ROWS") &&
      cashbookEntryService.includes("CASHBOOK_EXPORT_MAX_ROWS") &&
      cashbookEntryService.includes("Export exceeds maximum"),
    "export must enforce a configurable max row limit"
  );
  console.log("✓ P1-2: export row cap");

  assert(
    cashbookPage.includes("buildFilterParams") &&
      cashbookPage.includes("fetchCashbookSummary(filterParams)") &&
      cashbookPage.includes("/finance/expense-requests/"),
    "frontend must pass aligned filters and link expense requests from detail"
  );
  console.log("✓ P1-1/P1-3: frontend filter alignment + expense request link");

  assert(
    legacyCashbookController.includes("resolveSchoolScope") &&
      legacyCashbookController.includes("cashbookEntryService.listCashbookEntries") &&
      legacyCashbookController.includes("deprecated") &&
      !legacyCashbookController.includes("FROM expenses"),
    "legacy cashbook must delegate to tenant-scoped V2 data"
  );
  console.log("✓ P1-4: legacy endpoint deprecated and tenant-scoped");

  require("../constants/cashbookEntry");
  require("../controllers/cashbookController");
  require("../services/cashbookEntryService");
  console.log("✓ Modified modules load without import errors");

  console.log("\nAll cashbook hardening checks passed.");
};

run().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
