/**
 * Service-layer tests for Cashbook V2.
 * Usage: node backend/scripts/testCashbookService.js
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
const cashbookEntryService = require("../services/cashbookEntryService");
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

const ensureSchema = async () => {
  const migration = path.join(__dirname, "..", "migrations", "014_create_cashbook_entries.sql");
  if (fs.existsSync(migration)) {
    await pool.query(fs.readFileSync(migration, "utf8"));
  }
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
      WHERE bsh.sub_head_code = 'TEST_CB_SUB'
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
      WHERE bsh.sub_head_code = 'TEST_CB_SUB'
    )
    `
  );
  await pool.query(`DELETE FROM budget_allocations WHERE budget_sub_head_id IN (
    SELECT id FROM budget_sub_heads WHERE sub_head_code = 'TEST_CB_SUB'
  )`);
  await pool.query(`DELETE FROM budget_sub_heads WHERE sub_head_code = 'TEST_CB_SUB'`);
  await pool.query(`DELETE FROM budget_heads WHERE head_code = 'TEST_CB_HEAD'`);
  await pool.query(
    `DELETE FROM financial_years WHERE school_id = $1 AND year_label = $2`,
    [SCHOOL_ID, yearLabel]
  );
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

const run = async () => {
  const testLabel = getIndianFyLabel(getCurrentIndianFyStartYear());

  try {
    console.log("Cashbook V2 service tests\n");

    await ensureSchema();
    await cleanup(testLabel);
    console.log("✓ Migration and schema ready");

    const beforeBackfill = await pool.query(
      `SELECT COUNT(*)::int AS count FROM cashbook_entries WHERE expense_request_id IS NOT NULL`
    );
    console.log(`✓ Backfill baseline entries: ${beforeBackfill.rows[0].count}`);

    const { adminUserId, teacherUserId } = await resolveTestUsers();

    const head = await budgetHeadService.createBudgetHead({
      userId: adminUserId,
      headName: "Test Cashbook Head",
    });
    await pool.query(`UPDATE budget_heads SET head_code = 'TEST_CB_HEAD' WHERE id = $1`, [head.id]);

    const subHead = await budgetSubHeadService.createBudgetSubHead({
      userId: adminUserId,
      budgetHeadId: head.id,
      subHeadName: "Test Cashbook Sub Head",
    });
    await pool.query(`UPDATE budget_sub_heads SET sub_head_code = 'TEST_CB_SUB' WHERE id = $1`, [
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
      allocatedAmount: 50000,
    });

    const draft = await expenseRequestService.createExpenseRequest({
      schoolId: SCHOOL_ID,
      userId: teacherUserId,
      budgetAllocationId: allocation.id,
      requestedAmount: 12000,
      purpose: "Cashbook test payment",
      vendorName: "Vendor CB",
    });
    await expenseRequestService.submitExpenseRequest(
      draft.id,
      SCHOOL_ID,
      teacherUserId,
      "teacher"
    );
    await expenseRequestService.approveExpenseRequest(draft.id, SCHOOL_ID, adminUserId);

    const paid = await expenseRequestService.markExpenseRequestPaid(
      draft.id,
      SCHOOL_ID,
      adminUserId,
      {
        paymentVoucherNo: "VCH-CB-001",
        paymentTransactionId: "UTR-CB-001",
      }
    );
    assert(paid.status === EXPENSE_REQUEST_STATUS.PAID, "Expense request marked paid");
    console.log("✓ Mark paid creates cashbook entry");

    const ledgerRows = await pool.query(
      `SELECT * FROM cashbook_entries WHERE expense_request_id = $1`,
      [draft.id]
    );
    assert(ledgerRows.rowCount === 1, "Exactly one ledger row created");
    assert(Number(ledgerRows.rows[0].amount) === 12000, "Ledger amount matches request");

    let duplicateBlocked = false;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await cashbookEntryService.createPaymentFromExpenseRequest(
        client,
        draft.id,
        adminUserId
      );
      await client.query("COMMIT");
    } catch (err) {
      duplicateBlocked = err.statusCode === 409;
      await client.query("ROLLBACK");
    } finally {
      client.release();
    }
    assert(duplicateBlocked, "Duplicate posting prevented");
    console.log("✓ Duplicate posting prevented");

    const list = await cashbookEntryService.listCashbookEntries({
      schoolId: SCHOOL_ID,
      role: "admin",
      financialYearId: fy.id,
      page: 1,
      limit: 10,
    });
    assert(list.data.length >= 1, "List returns cashbook entries");
    assert(list.pagination.total >= 1, "Pagination total set");
    console.log("✓ Filters and list");

    const summary = await cashbookEntryService.getCashbookSummary({
      schoolId: SCHOOL_ID,
      role: "admin",
      financialYearId: fy.id,
    });
    assert(Number(summary.total_outflow) >= 12000, "Summary total_outflow");
    assert(summary.payment_count >= 1, "Summary payment_count");
    assert(Array.isArray(summary.expenditure_by_head), "Summary by head");
    assert(Array.isArray(summary.expenditure_by_sub_head), "Summary by sub head");
    assert(Array.isArray(summary.monthly_totals), "Summary monthly totals");
    console.log("✓ Summary API");

    const searchSummary = await cashbookEntryService.getCashbookSummary({
      schoolId: SCHOOL_ID,
      role: "admin",
      financialYearId: fy.id,
      search: "Cashbook test payment",
    });
    assert(Number(searchSummary.payment_count) >= 1, "Summary honors search filter");
    assert(Number(searchSummary.total_outflow) >= 12000, "Summary search total_outflow");

    const emptySearchSummary = await cashbookEntryService.getCashbookSummary({
      schoolId: SCHOOL_ID,
      role: "admin",
      financialYearId: fy.id,
      search: "no-matching-cashbook-term-xyz",
    });
    assert(Number(emptySearchSummary.payment_count) === 0, "Summary search with no matches");
    console.log("✓ Summary search filter alignment");

    const exported = await cashbookEntryService.exportCashbookEntriesXlsx({
      schoolId: SCHOOL_ID,
      role: "admin",
      financialYearId: fy.id,
    });
    assert(Buffer.isBuffer(exported.buffer), "XLSX export returns buffer");
    assert(exported.filename.includes("Cashbook_"), "XLSX filename format");
    console.log("✓ XLSX export");

    const { CASHBOOK_EXPORT_MAX_ROWS } = require("../constants/cashbookEntry");
    assert(
      Number.isFinite(CASHBOOK_EXPORT_MAX_ROWS) && CASHBOOK_EXPORT_MAX_ROWS > 0,
      "Export max rows constant must be positive"
    );

    const draft2 = await expenseRequestService.createExpenseRequest({
      schoolId: SCHOOL_ID,
      userId: teacherUserId,
      budgetAllocationId: allocation.id,
      requestedAmount: 3000,
      purpose: "Second cashbook export row",
      vendorName: "Vendor CB2",
    });
    await expenseRequestService.submitExpenseRequest(
      draft2.id,
      SCHOOL_ID,
      teacherUserId,
      "teacher"
    );
    await expenseRequestService.approveExpenseRequest(draft2.id, SCHOOL_ID, adminUserId);
    await expenseRequestService.markExpenseRequestPaid(draft2.id, SCHOOL_ID, adminUserId, {
      paymentVoucherNo: "VCH-CB-002",
      paymentTransactionId: "UTR-CB-002",
    });

    const previousMax = process.env.CASHBOOK_EXPORT_MAX_ROWS;
    process.env.CASHBOOK_EXPORT_MAX_ROWS = "1";
    delete require.cache[require.resolve("../constants/cashbookEntry")];
    delete require.cache[require.resolve("../services/cashbookEntryService")];
    const cashbookEntryServiceReloaded = require("../services/cashbookEntryService");

    let exportBlocked = false;
    try {
      await cashbookEntryServiceReloaded.exportCashbookEntriesXlsx({
        schoolId: SCHOOL_ID,
        role: "admin",
        financialYearId: fy.id,
      });
    } catch (err) {
      exportBlocked = err.statusCode === 413;
    }

    if (previousMax === undefined) {
      delete process.env.CASHBOOK_EXPORT_MAX_ROWS;
    } else {
      process.env.CASHBOOK_EXPORT_MAX_ROWS = previousMax;
    }
    delete require.cache[require.resolve("../constants/cashbookEntry")];
    delete require.cache[require.resolve("../services/cashbookEntryService")];

    assert(exportBlocked, "Export blocked when row count exceeds max");
    console.log("✓ Export max row guard");

    const dashboardMetrics = await cashbookEntryService.getFinanceDashboardMetrics(
      SCHOOL_ID,
      "admin",
      fy.id
    );
    assert(Number(dashboardMetrics.total_expenditure) >= 12000, "Dashboard expenditure");
    assert(Number(dashboardMetrics.total_budget_received) >= 50000, "Dashboard budget received");
    console.log("✓ Dashboard finance metrics");

    console.log("\nAll Cashbook V2 service tests passed.");
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
