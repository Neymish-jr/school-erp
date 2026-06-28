/**
 * Stock register workflow tests — Finance Unification Sprint 4
 * Usage: node backend/scripts/testStockRegisterWorkflow.js
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
const stockRegisterService = require("../services/stockRegisterService");
const { EXPENSE_REQUEST_STATUS } = require("../constants/expenseRequestStatus");

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
  const teacherProfile = await pool.query(
    `SELECT id FROM teachers WHERE school_id = $1 ORDER BY id LIMIT 1`,
    [SCHOOL_ID]
  );

  assert(adminResult.rows.length > 0, "No admin user");
  assert(teacherResult.rows.length > 0, "No teacher user");
  assert(teacherProfile.rows.length > 0, "No teacher profile");

  return {
    adminUserId: adminResult.rows[0].id,
    teacherUserId: teacherResult.rows[0].id,
    teacherId: teacherProfile.rows[0].id,
  };
};

const ensureSchema = async () => {
  for (const file of [
    "017_finance_activity_expense_request_bridge.sql",
    "018_activity_workflow.sql",
    "019_quotations_expense_request.sql",
    "020_stock_register.sql",
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
    DELETE FROM stock_audit_logs
    WHERE school_id = $1
      AND (
        (entity_type = 'stock_entry' AND entity_id IN (
          SELECT id FROM stock_entries WHERE item_name LIKE 'TEST_STOCK_WF_%'
        ))
        OR (entity_type = 'stock_issue' AND entity_id IN (
          SELECT id FROM stock_issues WHERE remarks LIKE 'TEST_STOCK_WF_%'
        ))
      )
    `,
    [SCHOOL_ID]
  );
  await pool.query(
    `
    DELETE FROM stock_issues
    WHERE stock_entry_id IN (
      SELECT id FROM stock_entries WHERE item_name LIKE 'TEST_STOCK_WF_%'
    )
    `
  );
  await pool.query(`DELETE FROM stock_entries WHERE item_name LIKE 'TEST_STOCK_WF_%'`);
  await pool.query(
    `
    UPDATE expense_requests
    SET selected_quotation_id = NULL
    WHERE purpose LIKE 'TEST_STOCK_WF_%'
    `
  );
  await pool.query(`DELETE FROM cashbook_entries WHERE description LIKE 'TEST_STOCK_WF_%'`);
  await pool.query(`DELETE FROM expense_requests WHERE purpose LIKE 'TEST_STOCK_WF_%'`);
  await pool.query(
    `
    DELETE FROM budget_allocations
    WHERE financial_year_id IN (
      SELECT id FROM financial_years WHERE school_id = $1 AND year_label = $2
    )
    `,
    [SCHOOL_ID, yearLabel]
  );
  await pool.query(`DELETE FROM budget_sub_heads WHERE sub_head_code = 'TEST_STOCK_WF_SUB'`);
  await pool.query(`DELETE FROM budget_heads WHERE head_code = 'TEST_STOCK_WF_HEAD'`);
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

  try {
    console.log("Stock register workflow tests\n");

    await ensureSchema();
    await cleanup(testLabel);

    const { adminUserId, teacherUserId, teacherId } = await resolveTestUsers();

    const head = await budgetHeadService.createBudgetHead({
      userId: adminUserId,
      headName: "Test Stock Workflow Head",
    });
    await pool.query(`UPDATE budget_heads SET head_code = 'TEST_STOCK_WF_HEAD' WHERE id = $1`, [
      head.id,
    ]);

    const subHead = await budgetSubHeadService.createBudgetSubHead({
      userId: adminUserId,
      budgetHeadId: head.id,
      subHeadName: "Test Stock Sub Head",
    });
    await pool.query(`UPDATE budget_sub_heads SET sub_head_code = 'TEST_STOCK_WF_SUB' WHERE id = $1`, [
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
      allocatedAmount: 200000,
    });

    const manualEntry = await stockRegisterService.createStockEntry({
      schoolId: SCHOOL_ID,
      userId: adminUserId,
      itemName: "TEST_STOCK_WF_MANUAL_ITEM",
      category: "sports",
      quantity: 20,
      unit: "pcs",
      purchaseRate: 500,
      vendorName: "Sports Vendor",
      purchaseDate: "2026-06-01",
    });

    assert(manualEntry.available_quantity === 20, "Manual entry available quantity must equal received");
    console.log("✓ Manual stock entry created with balance");

    const issue = await stockRegisterService.issueStock({
      schoolId: SCHOOL_ID,
      userId: adminUserId,
      stockEntryId: manualEntry.id,
      issuedQuantity: 5,
      issueType: "teacher",
      issuedToTeacherId: teacherId,
      issueDate: "2026-06-02",
      remarks: "TEST_STOCK_WF_ISSUE",
    });

    assert(Number(issue.issued_quantity) === 5, "Issue quantity must be recorded");
    console.log("✓ Stock issue to teacher recorded");

    const afterIssue = await stockRegisterService.getStockEntryById({
      id: manualEntry.id,
      schoolId: SCHOOL_ID,
      role: "admin",
    });
    assert(afterIssue.available_quantity === 15, "Available quantity must be received minus issued");
    console.log("✓ Stock balance = received − issued");

    await expectError(
      () =>
        stockRegisterService.issueStock({
          schoolId: SCHOOL_ID,
          userId: adminUserId,
          stockEntryId: manualEntry.id,
          issuedQuantity: 100,
          issueType: "department",
          issuedToDepartment: "Science",
          issueDate: "2026-06-03",
        }),
      "Cannot issue more than available quantity"
    );
    console.log("✓ Over-issue blocked");

    const expenseRequest = await expenseRequestService.createExpenseRequest({
      schoolId: SCHOOL_ID,
      userId: teacherUserId,
      role: "teacher",
      budgetAllocationId: allocation.id,
      requestedAmount: 10000,
      purpose: "TEST_STOCK_WF_ER",
      itemName: "TEST_STOCK_WF_AUTO_ITEM",
      quantity: 10,
      vendorName: "Auto Vendor",
    });

    await expenseRequestService.submitExpenseRequest(
      expenseRequest.id,
      SCHOOL_ID,
      teacherUserId,
      "teacher"
    );
    await expenseRequestService.approveExpenseRequest(
      expenseRequest.id,
      SCHOOL_ID,
      adminUserId
    );

    const paid = await expenseRequestService.markExpenseRequestPaid(
      expenseRequest.id,
      SCHOOL_ID,
      adminUserId,
      {
        paymentVoucherNo: "PV-STOCK-001",
        paymentTransactionId: "TXN-STOCK-001",
        createStockEntry: true,
        stockCategory: "ict",
        stockUnit: "pcs",
        purchaseRate: 1000,
      }
    );

    assert(paid.status === EXPENSE_REQUEST_STATUS.PAID, "Expense request must be paid");
    console.log("✓ Mark paid with optional stock creation succeeds");

    const autoEntries = await stockRegisterService.listStockEntries({
      schoolId: SCHOOL_ID,
      role: "admin",
      itemName: "TEST_STOCK_WF_AUTO_ITEM",
    });
    assert(autoEntries.length === 1, "Auto stock entry must be created");
    assert(autoEntries[0].expense_request_id === expenseRequest.id, "Stock entry must link to expense request");
    assert(autoEntries[0].source === "expense_payment", "Auto entry source must be expense_payment");
    console.log("✓ Auto stock entry created from paid expense request");

    const dashboard = await stockRegisterService.getStockDashboard({
      schoolId: SCHOOL_ID,
      role: "admin",
    });
    assert(dashboard.total_items >= 2, "Dashboard must count stock entries");
    assert(dashboard.recent_issues.length >= 1, "Dashboard must include recent issues");
    console.log("✓ Stock dashboard metrics available");

    const auditLogs = await stockRegisterService.listAuditLogs({
      schoolId: SCHOOL_ID,
      role: "admin",
      limit: 20,
    });
    assert(auditLogs.length >= 2, "Audit trail must record stock actions");
    console.log("✓ Audit trail recorded");

    await cleanup(testLabel);
    console.log("\nAll stock register workflow tests passed.");
  } catch (err) {
    await cleanup(testLabel).catch(() => {});
    throw err;
  }
};

run().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
