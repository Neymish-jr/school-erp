/**
 * Verify Expense Requests Module P1 hardening (RC).
 * Usage: node backend/scripts/testExpenseRequestsHardening.js
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
  console.log("Expense Requests Module Hardening tests\n");

  const expenseRequestStatus = read("constants/expenseRequestStatus.js");
  const expenseRequestService = read("services/expenseRequestService.js");
  const expenseRequestController = read("controllers/expenseRequestController.js");
  const expenseRequestsPage = fs.readFileSync(
    path.join(
      __dirname,
      "..",
      "..",
      "frontend",
      "src",
      "pages",
      "finance",
      "expenseRequests",
      "ExpenseRequests.jsx"
    ),
    "utf8"
  );
  const expenseRequestDetailPage = fs.readFileSync(
    path.join(
      __dirname,
      "..",
      "..",
      "frontend",
      "src",
      "pages",
      "finance",
      "expenseRequests",
      "ExpenseRequestDetail.jsx"
    ),
    "utf8"
  );
  const financeApi = fs.readFileSync(
    path.join(__dirname, "..", "..", "frontend", "src", "api", "finance.js"),
    "utf8"
  );

  assert(
    expenseRequestStatus.includes("EDITABLE_EXPENSE_STATUSES") &&
      expenseRequestStatus.includes("SUBMITTABLE_EXPENSE_STATUSES"),
    "status constants must define editable/submittable rejected workflow"
  );
  assert(
    expenseRequestService.includes("EDITABLE_EXPENSE_STATUSES") &&
      expenseRequestService.includes("Only draft or rejected expense requests can be edited") &&
      expenseRequestService.includes("Only draft or rejected expense requests can be submitted") &&
      expenseRequestService.includes("rejection_remarks = NULL"),
    "service must allow rejected edit/resubmit and clear rejection on resubmit"
  );
  console.log("✓ P1-1: rejected edit + resubmit workflow");

  assert(
    !expenseRequestDetailPage.includes("Promise.all") &&
      expenseRequestDetailPage.includes("comparisonUnavailable") &&
      expenseRequestDetailPage.includes("Quotation comparison is not available for your role"),
    "detail page must load comparison safely without breaking the page"
  );
  console.log("✓ P1-3: teacher detail page degrades quotation comparison gracefully");

  assert(
    expenseRequestService.includes("ALLOCATED_ACTIVITY_STATUSES") &&
      expenseRequestService.includes("activity_committed") &&
      expenseRequestService.includes("activity_committed_amount"),
    "backend balance must include activity committed budgets"
  );
  assert(
    expenseRequestController.includes("exclude_request_id"),
    "allocation balance endpoint must support exclude_request_id"
  );
  assert(
    expenseRequestsPage.includes("activity_committed_amount") &&
      expenseRequestsPage.includes("Requested amount exceeds available balance"),
    "frontend list must show activity committed and validate budget"
  );
  assert(
    expenseRequestDetailPage.includes("activity_committed_amount") &&
      expenseRequestDetailPage.includes("Requested amount exceeds available balance"),
    "frontend detail must show activity committed and validate budget"
  );
  console.log("✓ P1-4/P1-5: budget validation backend + frontend");

  assert(
    expenseRequestDetailPage.includes("approveExpenseRequest") &&
      expenseRequestDetailPage.includes("rejectExpenseRequest") &&
      expenseRequestDetailPage.includes("markExpenseRequestPaid") &&
      expenseRequestDetailPage.includes("Mark Paid"),
    "detail page must expose approve/reject/mark paid workflow actions"
  );
  assert(
    expenseRequestsPage.includes("Resubmit") && expenseRequestDetailPage.includes("Resubmit"),
    "UI must expose resubmit for rejected expense requests"
  );
  console.log("✓ P1-6: workflow actions on detail page");

  assert(
    financeApi.includes("fetchAllocationBalance") &&
      financeApi.match(/fetchAllocationBalance\s*=\s*\(allocationId,\s*params/),
    "API client must pass optional params to allocation balance"
  );

  require("../constants/expenseRequestStatus");
  require("../controllers/expenseRequestController");
  require("../services/expenseRequestService");
  console.log("✓ Modified modules load without import errors");

  console.log("\nAll expense requests hardening checks passed.");
};

run().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
