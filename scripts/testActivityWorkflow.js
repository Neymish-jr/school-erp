/**
 * Activity workflow tests — Finance Unification Sprint 2
 * Usage: node backend/scripts/testActivityWorkflow.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const fs = require("fs");
const path = require("path");
const pool = require("../db");
const financialYearService = require("../services/financialYearService");
const budgetHeadService = require("../services/budgetHeadService");
const budgetSubHeadService = require("../services/budgetSubHeadService");
const budgetAllocationService = require("../services/budgetAllocationService");
const activityService = require("../services/activityService");
const expenseRequestService = require("../services/expenseRequestService");
const { ACTIVITY_STATUS } = require("../constants/activityStatus");
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
    DELETE FROM expense_requests
    WHERE activity_id IN (
      SELECT id FROM activities WHERE activity_name LIKE 'TEST_ACT_WF_%'
    )
    `
  );
  await pool.query(`DELETE FROM activities WHERE activity_name LIKE 'TEST_ACT_WF_%'`);
  await pool.query(
    `
    DELETE FROM budget_allocations
    WHERE financial_year_id IN (
      SELECT id FROM financial_years WHERE school_id = $1 AND year_label = $2
    )
    `,
    [SCHOOL_ID, yearLabel]
  );
  await pool.query(`DELETE FROM budget_sub_heads WHERE sub_head_code = 'TEST_ACT_WF_SUB'`);
  await pool.query(`DELETE FROM budget_heads WHERE head_code = 'TEST_ACT_WF_HEAD'`);
  await pool.query(
    `DELETE FROM financial_years WHERE school_id = $1 AND year_label = $2`,
    [SCHOOL_ID, yearLabel]
  );
};

const run = async () => {
  const testLabel = getIndianFyLabel(getCurrentIndianFyStartYear());

  try {
    console.log("Activity workflow tests\n");

    await ensureSchema();
    await cleanup(testLabel);

    const { adminUserId, teacherUserId, teacherId } = await resolveTestUsers();

    const head = await budgetHeadService.createBudgetHead({
      userId: adminUserId,
      headName: "Test Activity Workflow Head",
    });
    await pool.query(`UPDATE budget_heads SET head_code = 'TEST_ACT_WF_HEAD' WHERE id = $1`, [
      head.id,
    ]);

    const subHead = await budgetSubHeadService.createBudgetSubHead({
      userId: adminUserId,
      budgetHeadId: head.id,
      subHeadName: "Test Activity Workflow Sub",
    });
    await pool.query(`UPDATE budget_sub_heads SET sub_head_code = 'TEST_ACT_WF_SUB' WHERE id = $1`, [
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
      allocatedAmount: 200000,
    });

    const created = await activityService.createActivity({
      schoolId: SCHOOL_ID,
      userId: teacherUserId,
      activityName: "TEST_ACT_WF_Science Fair",
      description: "Annual science fair activity",
      allocatedBudget: 40000,
      assignedTeacherId: teacherId,
      budgetAllocationId: allocation.id,
    });

    assert(created.activity.status === ACTIVITY_STATUS.DRAFT, "Created as draft");
    console.log("✓ Create draft");

    const submitted = await activityService.submitActivity({
      id: created.activity.id,
      schoolId: SCHOOL_ID,
      userId: teacherUserId,
      role: "teacher",
      teacherId,
    });
    assert(submitted.status === ACTIVITY_STATUS.SUBMITTED, "Submitted");
    console.log("✓ Submit");

    const approved = await activityService.approveActivity({
      id: created.activity.id,
      schoolId: SCHOOL_ID,
      reviewerUserId: adminUserId,
    });
    assert(approved.status === ACTIVITY_STATUS.APPROVED, "Approved");
    console.log("✓ Approve");

    const expense = await expenseRequestService.createExpenseRequest({
      schoolId: SCHOOL_ID,
      userId: teacherUserId,
      budgetAllocationId: allocation.id,
      requestedAmount: 10000,
      purpose: "Science fair materials",
      activityId: created.activity.id,
      itemName: "Kit",
      quantity: 5,
    });
    await expenseRequestService.submitExpenseRequest(
      expense.id,
      SCHOOL_ID,
      teacherUserId,
      "teacher"
    );
    console.log("✓ Linked expense request");

    const detail = await activityService.getActivityById({
      id: created.activity.id,
      schoolId: SCHOOL_ID,
      role: "admin",
    });
    assert(Number(detail.expense_summary.total_requested_amount) === 10000, "Requested total");
    assert(detail.expense_requests.length === 1, "Expense list on detail");

    const dashboard = await activityService.getActivityDashboard({
      schoolId: SCHOOL_ID,
      role: "admin",
      financialYearId: fy.id,
    });
    assert(Number(dashboard.total_budget) === 200000, "Dashboard total budget");
    assert(Number(dashboard.utilized_budget) === 10000, "Dashboard utilized");
    console.log("✓ Dashboard metrics");

    const timeline = await activityService.getActivityTimeline({
      id: created.activity.id,
      schoolId: SCHOOL_ID,
      role: "admin",
    });
    const keys = timeline.events.map((event) => event.key);
    assert(keys.includes("created"), "Timeline has created");
    assert(keys.includes("submitted"), "Timeline has submitted");
    assert(keys.includes("approved"), "Timeline has approved");
    assert(keys.includes("expenses_raised"), "Timeline has expenses raised");
    console.log("✓ Timeline");

    const completed = await activityService.completeActivity({
      id: created.activity.id,
      schoolId: SCHOOL_ID,
      userId: teacherUserId,
      role: "teacher",
      teacherId,
    });
    assert(completed.status === ACTIVITY_STATUS.COMPLETED, "Completed");
    console.log("✓ Complete");

    const rejectedDraft = await activityService.createActivity({
      schoolId: SCHOOL_ID,
      userId: teacherUserId,
      activityName: "TEST_ACT_WF_Reject Flow",
      description: "Reject path",
      allocatedBudget: 5000,
      assignedTeacherId: teacherId,
      budgetAllocationId: allocation.id,
    });
    await activityService.submitActivity({
      id: rejectedDraft.activity.id,
      schoolId: SCHOOL_ID,
      userId: teacherUserId,
      role: "teacher",
      teacherId,
    });
    const rejected = await activityService.rejectActivity({
      id: rejectedDraft.activity.id,
      schoolId: SCHOOL_ID,
      reviewerUserId: adminUserId,
      rejectionRemarks: "Insufficient planning detail",
    });
    assert(rejected.status === ACTIVITY_STATUS.REJECTED, "Rejected");
    console.log("✓ Reject");

    const revised = await activityService.updateActivity({
      id: rejectedDraft.activity.id,
      schoolId: SCHOOL_ID,
      userId: teacherUserId,
      role: "teacher",
      teacherId,
      activityName: "TEST_ACT_WF_Reject Flow Revised",
      description: "Revised after rejection",
      allocatedBudget: 4500,
      assignedTeacherId: teacherId,
      budgetAllocationId: allocation.id,
    });
    assert(revised.activity_name === "TEST_ACT_WF_Reject Flow Revised", "Rejected activity edited");
    console.log("✓ Edit rejected activity");

    const resubmitted = await activityService.submitActivity({
      id: rejectedDraft.activity.id,
      schoolId: SCHOOL_ID,
      userId: teacherUserId,
      role: "teacher",
      teacherId,
    });
    assert(resubmitted.status === ACTIVITY_STATUS.SUBMITTED, "Resubmitted after rejection");
    assert(resubmitted.rejection_remarks == null, "Rejection remarks cleared on resubmit");
    console.log("✓ Resubmit rejected activity");

    let budgetErrorThrown = false;
    try {
      await activityService.createActivity({
        schoolId: SCHOOL_ID,
        userId: teacherUserId,
        activityName: "TEST_ACT_WF_Over Budget",
        description: "Should fail budget validation",
        allocatedBudget: 250000,
        assignedTeacherId: teacherId,
        budgetAllocationId: allocation.id,
      });
    } catch (err) {
      budgetErrorThrown = err.message.includes("exceeds available allocation balance");
    }
    assert(budgetErrorThrown, "Create must reject over-allocation budget");
    console.log("✓ Budget cap validation");

    console.log("\nAll activity workflow tests passed.");
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
