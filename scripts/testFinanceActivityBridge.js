/**
 * Finance Unification Sprint 1 — activity ↔ expense request bridge tests.
 * Usage: node backend/scripts/testFinanceActivityBridge.js
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
const {
  assertBudgetAllocationForActivity,
  assertActivityLinkForExpenseRequest,
} = require("../services/activityService");

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

  assert(adminResult.rows.length > 0, `No admin user for school_id=${SCHOOL_ID}`);
  assert(teacherResult.rows.length > 0, `No teacher user for school_id=${SCHOOL_ID}`);
  assert(teacherProfile.rows.length > 0, `No teacher profile for school_id=${SCHOOL_ID}`);

  return {
    adminUserId: adminResult.rows[0].id,
    teacherUserId: teacherResult.rows[0].id,
    teacherId: teacherProfile.rows[0].id,
  };
};

const ensureSchema = async () => {
  const bridgeMigration = path.join(
    __dirname,
    "..",
    "migrations",
    "017_finance_activity_expense_request_bridge.sql"
  );

  if (fs.existsSync(bridgeMigration)) {
    await pool.query(fs.readFileSync(bridgeMigration, "utf8"));
  }

  const workflowMigration = path.join(
    __dirname,
    "..",
    "migrations",
    "018_activity_workflow.sql"
  );
  if (fs.existsSync(workflowMigration)) {
    await pool.query(fs.readFileSync(workflowMigration, "utf8"));
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
      INNER JOIN financial_years fy ON fy.id = ba.financial_year_id
      WHERE fy.school_id = $1 AND fy.year_label = $2
    )
    `,
    [SCHOOL_ID, yearLabel]
  );
  await pool.query(
    `
    DELETE FROM expense_requests
    WHERE budget_allocation_id IN (
      SELECT ba.id
      FROM budget_allocations ba
      INNER JOIN financial_years fy ON fy.id = ba.financial_year_id
      WHERE fy.school_id = $1 AND fy.year_label = $2
    )
    `,
    [SCHOOL_ID, yearLabel]
  );
  await pool.query(`DELETE FROM activities WHERE activity_name LIKE 'TEST_BRIDGE_%'`);
  await pool.query(
    `
    DELETE FROM budget_allocations
    WHERE financial_year_id IN (
      SELECT id FROM financial_years WHERE school_id = $1 AND year_label = $2
    )
    `,
    [SCHOOL_ID, yearLabel]
  );
  await pool.query(`DELETE FROM budget_sub_heads WHERE sub_head_code = 'TEST_BRIDGE_SUB'`);
  await pool.query(`DELETE FROM budget_heads WHERE head_code = 'TEST_BRIDGE_HEAD'`);
  await pool.query(
    `DELETE FROM financial_years WHERE school_id = $1 AND year_label = $2`,
    [SCHOOL_ID, yearLabel]
  );
};

const run = async () => {
  const testLabel = getIndianFyLabel(getCurrentIndianFyStartYear());

  try {
    console.log("Finance activity bridge tests\n");

    await ensureSchema();
    await cleanup(testLabel);
    console.log("✓ Schema ready");

    const { adminUserId, teacherUserId, teacherId } = await resolveTestUsers();

    const head = await budgetHeadService.createBudgetHead({
      userId: adminUserId,
      headName: "Test Bridge Head",
    });
    await pool.query(`UPDATE budget_heads SET head_code = 'TEST_BRIDGE_HEAD' WHERE id = $1`, [
      head.id,
    ]);

    const subHead = await budgetSubHeadService.createBudgetSubHead({
      userId: adminUserId,
      budgetHeadId: head.id,
      subHeadName: "Test Bridge Sub Head",
    });
    await pool.query(`UPDATE budget_sub_heads SET sub_head_code = 'TEST_BRIDGE_SUB' WHERE id = $1`, [
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
      allocatedAmount: 75000,
    });

    await assertBudgetAllocationForActivity(allocation.id, SCHOOL_ID);
    console.log("✓ Activity allocation validation");

    const activityResult = await pool.query(
      `
      INSERT INTO activities (
        activity_name,
        description,
        allocated_budget,
        assigned_teacher_id,
        school_id,
        budget_allocation_id,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, budget_allocation_id
      `,
      [
        "TEST_BRIDGE_Sports Day",
        "Annual sports event",
        25000,
        teacherId,
        SCHOOL_ID,
        allocation.id,
        "approved",
      ]
    );
    const activity = activityResult.rows[0];
    console.log("✓ Activity with budget_allocation_id");

    const linkedDraft = await expenseRequestService.createExpenseRequest({
      schoolId: SCHOOL_ID,
      userId: teacherUserId,
      budgetAllocationId: allocation.id,
      requestedAmount: 12000,
      purpose: "Sports equipment purchase",
      vendorName: "Vendor A",
      activityId: activity.id,
      itemName: "Football",
      quantity: 10,
    });

    assert(linkedDraft.activity_id === activity.id, "activity_id stored on expense request");
    assert(linkedDraft.item_name === "Football", "item_name stored");
    assert(Number(linkedDraft.quantity) === 10, "quantity stored");
    assert(linkedDraft.activity_name === "TEST_BRIDGE_Sports Day", "activity joined in response");
    console.log("✓ Create linked expense request");

    const unlinkedDraft = await expenseRequestService.createExpenseRequest({
      schoolId: SCHOOL_ID,
      userId: teacherUserId,
      budgetAllocationId: allocation.id,
      requestedAmount: 5000,
      purpose: "Legacy-style request without activity",
    });
    assert(unlinkedDraft.activity_id == null, "activity_id remains null when omitted");
    console.log("✓ Backward compatible create without activity");

    let mismatchFailed = false;
    try {
      await assertActivityLinkForExpenseRequest({
        activityId: activity.id,
        schoolId: SCHOOL_ID,
        budgetAllocationId: allocation.id + 999999,
      });
    } catch (err) {
      mismatchFailed = err.statusCode === 400;
    }
    assert(mismatchFailed, "Allocation mismatch rejected when activity has budget_allocation_id");

    const activityWithoutAllocation = await pool.query(
      `
      INSERT INTO activities (
        activity_name,
        description,
        allocated_budget,
        assigned_teacher_id,
        school_id,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
      `,
      [
        "TEST_BRIDGE_Unlinked Activity",
        "No allocation link",
        8000,
        teacherId,
        SCHOOL_ID,
        "approved",
      ]
    );

    const linkedToUnallocatedActivity = await expenseRequestService.createExpenseRequest({
      schoolId: SCHOOL_ID,
      userId: teacherUserId,
      budgetAllocationId: allocation.id,
      requestedAmount: 3000,
      purpose: "Activity without allocation link",
      activityId: activityWithoutAllocation.rows[0].id,
    });
    assert(
      linkedToUnallocatedActivity.activity_id === activityWithoutAllocation.rows[0].id,
      "Activity without budget_allocation_id can still link"
    );
    console.log("✓ Allocation consistency rules");

    const updated = await expenseRequestService.updateExpenseRequest({
      id: linkedDraft.id,
      schoolId: SCHOOL_ID,
      userId: teacherUserId,
      role: "teacher",
      requestedAmount: 13000,
      purpose: "Sports equipment purchase updated",
      vendorName: "Vendor A",
      remarks: "",
      activityId: activity.id,
      itemName: "Football",
      quantity: 12,
    });
    assert(Number(updated.quantity) === 12, "Update persists bridge fields");
    console.log("✓ Update bridge fields");

    const listed = await expenseRequestService.listExpenseRequests({
      schoolId: SCHOOL_ID,
      role: "admin",
      activityId: activity.id,
    });
    assert(
      listed.some((row) => row.id === linkedDraft.id),
      "List filter by activity_id works"
    );
    console.log("✓ List filter by activity_id");

    console.log("\nAll finance activity bridge tests passed.");
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
