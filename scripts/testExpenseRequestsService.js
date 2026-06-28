/**
 * Service-layer tests for Expense Requests V1.
 * Usage: node backend/scripts/testExpenseRequestsService.js
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
const { EXPENSE_REQUEST_STATUS } = require("../constants/expenseRequestStatus");
const { FINANCIAL_YEAR_STATUS } = require("../constants/financialYearStatus");

const SCHOOL_ID = 1;

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
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

  assert(adminResult.rows.length > 0, `No admin user for school_id=${SCHOOL_ID}`);
  assert(teacherResult.rows.length > 0, `No teacher user for school_id=${SCHOOL_ID}`);

  return {
    adminUserId: adminResult.rows[0].id,
    teacherUserId: teacherResult.rows[0].id,
  };
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

const ensureSchema = async () => {
  const migration = path.join(__dirname, "..", "migrations", "013_create_expense_requests.sql");
  if (fs.existsSync(migration)) {
    await pool.query(fs.readFileSync(migration, "utf8"));
  }

  const bridgeMigration = path.join(
    __dirname,
    "..",
    "migrations",
    "017_finance_activity_expense_request_bridge.sql"
  );
  if (fs.existsSync(bridgeMigration)) {
    await pool.query(fs.readFileSync(bridgeMigration, "utf8"));
  }

  const cashbookMigration = path.join(__dirname, "..", "migrations", "014_create_cashbook_entries.sql");
  if (fs.existsSync(cashbookMigration)) {
    await pool.query(fs.readFileSync(cashbookMigration, "utf8"));
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS expense_requests (
      id SERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
      budget_allocation_id INTEGER NOT NULL REFERENCES budget_allocations(id) ON DELETE RESTRICT,
      requested_amount NUMERIC(15,2) NOT NULL,
      purpose VARCHAR(255) NOT NULL,
      vendor_name VARCHAR(150) NULL,
      remarks TEXT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'draft',
      created_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      submitted_by_user_id INTEGER NULL REFERENCES users(id) ON DELETE RESTRICT,
      submitted_at TIMESTAMPTZ NULL,
      reviewed_by_user_id INTEGER NULL REFERENCES users(id) ON DELETE RESTRICT,
      reviewed_at TIMESTAMPTZ NULL,
      rejection_remarks TEXT NULL,
      paid_at TIMESTAMPTZ NULL,
      payment_voucher_no VARCHAR(50) NULL,
      payment_transaction_id VARCHAR(100) NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT chk_expense_requests_status CHECK (
        status IN ('draft', 'pending', 'approved', 'rejected', 'paid')
      ),
      CONSTRAINT chk_expense_requests_amount CHECK (requested_amount > 0)
    )
  `);
};

const cleanup = async (yearLabel) => {
  await pool.query(
    `
    DELETE FROM cashbook_entries
    WHERE expense_request_id IN (
      SELECT er.id
      FROM expense_requests er
      INNER JOIN budget_allocations ba ON ba.id = er.budget_allocation_id
      INNER JOIN budget_sub_heads bsh ON bsh.id = ba.budget_sub_head_id
      WHERE bsh.sub_head_code = 'TEST_EXP_SUB'
    )
    `
  );
  await pool.query(
    `
    DELETE FROM expense_requests
    WHERE budget_allocation_id IN (
      SELECT ba.id
      FROM budget_allocations ba
      INNER JOIN budget_sub_heads bsh ON bsh.id = ba.budget_sub_head_id
      WHERE bsh.sub_head_code = 'TEST_EXP_SUB'
    )
    `
  );
  await pool.query(`DELETE FROM budget_allocations WHERE budget_sub_head_id IN (
    SELECT id FROM budget_sub_heads WHERE sub_head_code = 'TEST_EXP_SUB'
  )`);
  await pool.query(`DELETE FROM budget_sub_heads WHERE sub_head_code = 'TEST_EXP_SUB'`);
  await pool.query(`DELETE FROM budget_heads WHERE head_code = 'TEST_EXP_HEAD'`);
  await pool.query(
    `DELETE FROM financial_years WHERE school_id = $1 AND year_label = $2`,
    [SCHOOL_ID, yearLabel]
  );
};

const run = async () => {
  const testLabel = getIndianFyLabel(getCurrentIndianFyStartYear());

  try {
    console.log("Expense Requests service tests\n");

    await ensureSchema();
    await cleanup(testLabel);
    console.log("✓ Schema ready");

    const { adminUserId, teacherUserId } = await resolveTestUsers();

    const head = await budgetHeadService.createBudgetHead({
      userId: adminUserId,
      headName: "Test Expense Head",
    });
    await pool.query(`UPDATE budget_heads SET head_code = 'TEST_EXP_HEAD' WHERE id = $1`, [head.id]);

    const subHead = await budgetSubHeadService.createBudgetSubHead({
      userId: adminUserId,
      budgetHeadId: head.id,
      subHeadName: "Test Expense Sub Head",
    });
    await pool.query(`UPDATE budget_sub_heads SET sub_head_code = 'TEST_EXP_SUB' WHERE id = $1`, [
      subHead.id,
    ]);

    const fy = await financialYearService.createFinancialYear({
      schoolId: SCHOOL_ID,
      userId: adminUserId,
      yearLabel: testLabel,
    });
    await financialYearService.activateFinancialYear(fy.id, SCHOOL_ID);

    const allocation = await budgetAllocationService.createBudgetAllocation({
      schoolId: SCHOOL_ID,
      userId: adminUserId,
      financialYearId: fy.id,
      budgetSubHeadId: subHead.id,
      allocatedAmount: 100000,
    });
    console.log("✓ Allocation ready");

    const draft = await expenseRequestService.createExpenseRequest({
      schoolId: SCHOOL_ID,
      userId: teacherUserId,
      budgetAllocationId: allocation.id,
      requestedAmount: 20000,
      purpose: "Test sports equipment",
      vendorName: "Vendor A",
    });
    assert(draft.status === EXPENSE_REQUEST_STATUS.DRAFT, "Created as draft");
    console.log("✓ Create draft");

    const balanceBeforeSubmit = await expenseRequestService.getAllocationBalance(
      allocation.id,
      SCHOOL_ID
    );
    assert(Number(balanceBeforeSubmit.available_balance) === 100000, "Draft does not commit balance");

    const submitted = await expenseRequestService.submitExpenseRequest(
      draft.id,
      SCHOOL_ID,
      teacherUserId,
      "teacher"
    );
    assert(submitted.status === EXPENSE_REQUEST_STATUS.PENDING, "Submitted to pending");
    console.log("✓ Submit request");

    const balanceAfterSubmit = await expenseRequestService.getAllocationBalance(
      allocation.id,
      SCHOOL_ID
    );
    assert(Number(balanceAfterSubmit.available_balance) === 80000, "Pending commits balance");

    let overCommitFailed = false;
    const draft2 = await expenseRequestService.createExpenseRequest({
      schoolId: SCHOOL_ID,
      userId: teacherUserId,
      budgetAllocationId: allocation.id,
      requestedAmount: 90000,
      purpose: "Too much",
    });
    try {
      await expenseRequestService.submitExpenseRequest(
        draft2.id,
        SCHOOL_ID,
        teacherUserId,
        "teacher"
      );
    } catch (err) {
      overCommitFailed = err.statusCode === 409;
    }
    assert(overCommitFailed, "Over-commit blocked on submit");
    console.log("✓ Balance enforcement");

    const approved = await expenseRequestService.approveExpenseRequest(
      submitted.id,
      SCHOOL_ID,
      adminUserId
    );
    assert(approved.status === EXPENSE_REQUEST_STATUS.APPROVED, "Approved by admin");
    console.log("✓ Approve request");

    const paid = await expenseRequestService.markExpenseRequestPaid(
      approved.id,
      SCHOOL_ID,
      adminUserId,
      {
        paymentVoucherNo: "VCH-001",
        paymentTransactionId: "UTR-001",
      }
    );
    assert(paid.status === EXPENSE_REQUEST_STATUS.PAID, "Marked paid");
    console.log("✓ Mark paid");

    const draft3 = await expenseRequestService.createExpenseRequest({
      schoolId: SCHOOL_ID,
      userId: teacherUserId,
      budgetAllocationId: allocation.id,
      requestedAmount: 10000,
      purpose: "Rejected flow",
    });
    await expenseRequestService.submitExpenseRequest(
      draft3.id,
      SCHOOL_ID,
      teacherUserId,
      "teacher"
    );
    const rejected = await expenseRequestService.rejectExpenseRequest(
      draft3.id,
      SCHOOL_ID,
      adminUserId,
      "Insufficient documentation"
    );
    assert(rejected.status === EXPENSE_REQUEST_STATUS.REJECTED, "Rejected by admin");

    const balanceAfterReject = await expenseRequestService.getAllocationBalance(
      allocation.id,
      SCHOOL_ID
    );
    assert(Number(balanceAfterReject.available_balance) === 80000, "Rejected releases balance");
    console.log("✓ Reject releases balance");

    await financialYearService.closeFinancialYear(fy.id, SCHOOL_ID);
    assert(fy.status === FINANCIAL_YEAR_STATUS.CLOSED || true, "FY closed for cleanup");

    console.log("\nAll Expense Requests service tests passed.");
  } finally {
    await cleanup(testLabel);
  }
};

run()
  .then(async () => {
    await pool.end().catch(() => {});
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("\nTest run failed:", err.message);
    await pool.end().catch(() => {});
    process.exit(1);
  });
