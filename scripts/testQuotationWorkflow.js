/**
 * Quotation workflow tests — Finance Unification Sprint 3
 * Usage: node backend/scripts/testQuotationWorkflow.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const fs = require("fs");
const path = require("path");
const pool = require("../db");
const financialYearService = require("../services/financialYearService");
const budgetHeadService = require("../services/budgetHeadService");
const budgetSubHeadService = require("../services/budgetSubHeadService");
const budgetAllocationService = require("../services/budgetAllocationService");
const expenseRequestService = require("../services/expenseRequestService");
const quotationService = require("../services/quotationService");
const { EXPENSE_REQUEST_STATUS } = require("../constants/expenseRequestStatus");
const { getQuotationRequiredThreshold } = require("../constants/quotationConfig");

const SCHOOL_ID = 1;

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const getIndianFyLabel = (startYear) => {
  const suffix = (startYear + 1) % 100;
  return `${startYear}-${String(suffix).padStart(2, "0")}`;
};

const getCurrentIndianFyStartYear = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  return month >= 3 ? year : year - 1;
};

const resolveTestUsers = async () => {
  const adminResult = await pool.query(
    `SELECT id FROM users WHERE role = 'admin' AND school_id = $1 ORDER BY id LIMIT 1`,
    [SCHOOL_ID]
  );
  const teacherResult = await pool.query(
    `SELECT id FROM users WHERE role = 'teacher' AND school_id = $1 ORDER BY id LIMIT 1`,
    [SCHOOL_ID]
  );

  assert(adminResult.rows.length > 0, "No admin user");
  assert(teacherResult.rows.length > 0, "No teacher user");

  return {
    adminUserId: adminResult.rows[0].id,
    teacherUserId: teacherResult.rows[0].id,
  };
};

const ensureSchema = async () => {
  for (const file of [
    "017_finance_activity_expense_request_bridge.sql",
    "018_activity_workflow.sql",
    "019_quotations_expense_request.sql",
  ]) {
    const migrationPath = path.join(__dirname, "..", "migrations", file);
    if (fs.existsSync(migrationPath)) {
      await pool.query(fs.readFileSync(migrationPath, "utf8"));
    }
  }
};

const cleanup = async (yearLabel) => {
  await pool.query(
    `
    UPDATE expense_requests
    SET selected_quotation_id = NULL
    WHERE purpose LIKE 'TEST_QUOTE_WF_%'
    `
  );
  await pool.query(
    `
    DELETE FROM quotations
    WHERE expense_request_id IN (
      SELECT id FROM expense_requests WHERE purpose LIKE 'TEST_QUOTE_WF_%'
    )
    `
  );
  await pool.query(`DELETE FROM expense_requests WHERE purpose LIKE 'TEST_QUOTE_WF_%'`);
  await pool.query(
    `
    DELETE FROM budget_allocations
    WHERE financial_year_id IN (
      SELECT id FROM financial_years WHERE school_id = $1 AND year_label = $2
    )
    `,
    [SCHOOL_ID, yearLabel]
  );
  await pool.query(`DELETE FROM budget_sub_heads WHERE sub_head_code = 'TEST_QUOTE_WF_SUB'`);
  await pool.query(`DELETE FROM budget_heads WHERE head_code = 'TEST_QUOTE_WF_HEAD'`);
  await pool.query(
    `DELETE FROM financial_years WHERE school_id = $1 AND year_label = $2`,
    [SCHOOL_ID, yearLabel]
  );
};

const expectError = async (fn, messageFragment) => {
  try {
    await fn();
    throw new Error(`Expected error containing "${messageFragment}"`);
  } catch (err) {
    if (err.message.startsWith("Expected error")) {
      throw err;
    }
    assert(
      String(err.message).includes(messageFragment),
      `Expected "${messageFragment}", got "${err.message}"`
    );
  }
};

const run = async () => {
  const testLabel = getIndianFyLabel(getCurrentIndianFyStartYear());
  const threshold = getQuotationRequiredThreshold();

  try {
    console.log("Quotation workflow tests\n");

    await ensureSchema();
    await cleanup(testLabel);

    const { adminUserId, teacherUserId } = await resolveTestUsers();

    const head = await budgetHeadService.createBudgetHead({
      userId: adminUserId,
      headName: "Test Quotation Workflow Head",
    });
    await pool.query(`UPDATE budget_heads SET head_code = 'TEST_QUOTE_WF_HEAD' WHERE id = $1`, [
      head.id,
    ]);

    const subHead = await budgetSubHeadService.createBudgetSubHead({
      userId: adminUserId,
      budgetHeadId: head.id,
      subHeadName: "Test Quotation Sub Head",
    });
    await pool.query(`UPDATE budget_sub_heads SET sub_head_code = 'TEST_QUOTE_WF_SUB' WHERE id = $1`, [
      subHead.id,
    ]);

    const fy = await financialYearService.createFinancialYear({
      schoolId: SCHOOL_ID,
      userId: adminUserId,
      yearLabel: testLabel,
      startDate: `${getCurrentIndianFyStartYear()}-04-01`,
      endDate: `${getCurrentIndianFyStartYear() + 1}-03-31`,
    });

    await financialYearService.activateFinancialYear(fy.id, SCHOOL_ID);

    const allocation = await budgetAllocationService.createBudgetAllocation({
      schoolId: SCHOOL_ID,
      userId: adminUserId,
      financialYearId: fy.id,
      budgetHeadId: head.id,
      budgetSubHeadId: subHead.id,
      allocatedAmount: threshold + 100000,
    });

    const highValueRequest = await expenseRequestService.createExpenseRequest({
      schoolId: SCHOOL_ID,
      userId: teacherUserId,
      role: "teacher",
      budgetAllocationId: allocation.id,
      requestedAmount: threshold,
      purpose: "TEST_QUOTE_WF_HIGH_VALUE",
      vendorName: null,
      remarks: "Requires quotations",
    });

    await expectError(
      () =>
        expenseRequestService.submitExpenseRequest(
          highValueRequest.id,
          SCHOOL_ID,
          teacherUserId,
          "teacher"
        ),
      "At least one quotation is required"
    );
    console.log("✓ Submit blocked without quotations above threshold");

    const quoteA = await quotationService.createQuotation({
      schoolId: SCHOOL_ID,
      role: "teacher",
      userId: teacherUserId,
      expenseRequestId: highValueRequest.id,
      vendorName: "Vendor Alpha",
      vendorContact: "9000000001",
      quotationAmount: threshold - 1000,
      quotationDate: "2026-06-01",
      remarks: "Quote A",
    });

    const quoteB = await quotationService.createQuotation({
      schoolId: SCHOOL_ID,
      role: "teacher",
      userId: teacherUserId,
      expenseRequestId: highValueRequest.id,
      vendorName: "Vendor Beta",
      vendorContact: "9000000002",
      quotationAmount: threshold - 500,
      quotationDate: "2026-06-02",
      remarks: "Quote B",
    });

    assert(quoteA.id && quoteB.id, "Quotations must be created");
    console.log("✓ Teacher can upload multiple quotations");

    const comparison = await quotationService.getQuotationComparison({
      expenseRequestId: highValueRequest.id,
      schoolId: SCHOOL_ID,
      role: "teacher",
    });

    assert(comparison.quotations_required === true, "Quotations required flag must be true");
    assert(comparison.quotation_count === 2, "Comparison must include two quotes");
    assert(
      comparison.quotes.find((row) => row.is_lowest)?.vendor_name === "Vendor Alpha",
      "Lowest quote must be Vendor Alpha"
    );
    assert(
      comparison.quotes.find((row) => row.vendor_name === "Vendor Beta")?.difference_from_lowest ===
        500,
      "Difference from lowest must be calculated"
    );
    console.log("✓ Comparison screen data includes vendor, amount, difference, lowest");

    const submitted = await expenseRequestService.submitExpenseRequest(
      highValueRequest.id,
      SCHOOL_ID,
      teacherUserId,
      "teacher"
    );
    assert(submitted.status === EXPENSE_REQUEST_STATUS.PENDING, "Submit must succeed with quote");
    console.log("✓ Submit succeeds once quotation exists");

    await expectError(
      () =>
        expenseRequestService.approveExpenseRequest(
          highValueRequest.id,
          SCHOOL_ID,
          adminUserId
        ),
      "quotation must be selected"
    );
    console.log("✓ Approve blocked until quotation selected");

    const selection = await quotationService.selectQuotation({
      id: quoteA.id,
      schoolId: SCHOOL_ID,
      role: "admin",
      userId: adminUserId,
    });

    assert(
      selection.selected_quotation_id === quoteA.id,
      "Selected quotation must be persisted on expense request"
    );
    console.log("✓ Admin can select quotation");

    const approved = await expenseRequestService.approveExpenseRequest(
      highValueRequest.id,
      SCHOOL_ID,
      adminUserId
    );
    assert(approved.status === EXPENSE_REQUEST_STATUS.APPROVED, "Approve must succeed");
    assert(approved.vendor_name === "Vendor Alpha", "Vendor name must sync from selected quote");
    console.log("✓ Approve succeeds after quotation selection");

    const detail = await expenseRequestService.getExpenseRequestById(
      highValueRequest.id,
      SCHOOL_ID,
      teacherUserId,
      "teacher"
    );
    assert(detail.quotation_count === 2, "Detail must include linked quotations");
    assert(detail.quotations.length === 2, "Detail must list quotations");
    console.log("✓ Expense request detail includes quotation metadata");

    const lowValueRequest = await expenseRequestService.createExpenseRequest({
      schoolId: SCHOOL_ID,
      userId: teacherUserId,
      role: "teacher",
      budgetAllocationId: allocation.id,
      requestedAmount: threshold - 1,
      purpose: "TEST_QUOTE_WF_LOW_VALUE",
      vendorName: "Direct Vendor",
      remarks: "Below threshold",
    });

    const lowSubmitted = await expenseRequestService.submitExpenseRequest(
      lowValueRequest.id,
      SCHOOL_ID,
      teacherUserId,
      "teacher"
    );
    assert(lowSubmitted.status === EXPENSE_REQUEST_STATUS.PENDING, "Low value submit without quotes");
    console.log("✓ Below-threshold requests do not require quotations");

    await cleanup(testLabel);
    console.log("\nAll quotation workflow tests passed.");
  } catch (err) {
    await cleanup(testLabel).catch(() => {});
    throw err;
  }
};

run().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
