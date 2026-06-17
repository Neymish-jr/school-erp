/**
 * Service-layer tests for Budget Allocations (sub head FK).
 * Usage: node backend/scripts/testBudgetAllocationsService.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const fs = require("fs");
const path = require("path");
const pool = require("../db");
const financialYearService = require("../services/financialYearService");
const budgetHeadService = require("../services/budgetHeadService");
const budgetSubHeadService = require("../services/budgetSubHeadService");
const budgetAllocationService = require("../services/budgetAllocationService");
const { FINANCIAL_YEAR_STATUS } = require("../constants/financialYearStatus");

const SCHOOL_ID = 1;
const USER_ID = 1;

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
  await pool.query(`
    CREATE TABLE IF NOT EXISTS budget_heads (
      id SERIAL PRIMARY KEY,
      head_code VARCHAR(30) NOT NULL UNIQUE,
      head_name VARCHAR(150) NOT NULL UNIQUE,
      remarks TEXT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS budget_sub_heads (
      id SERIAL PRIMARY KEY,
      budget_head_id INTEGER NOT NULL REFERENCES budget_heads(id) ON DELETE RESTRICT,
      sub_head_code VARCHAR(30) NOT NULL UNIQUE,
      sub_head_name VARCHAR(150) NOT NULL,
      remarks TEXT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (budget_head_id, sub_head_name)
    )
  `);

  const fyMigration = path.join(__dirname, "..", "migrations", "008_create_financial_years.sql");
  if (fs.existsSync(fyMigration)) {
    await pool.query(fs.readFileSync(fyMigration, "utf8"));
  }

  const hasSubHeadColumn = await pool.query(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'budget_allocations' AND column_name = 'budget_sub_head_id'
    ) AS ready
  `);

  if (!hasSubHeadColumn.rows[0].ready) {
    const migration012 = path.join(__dirname, "..", "migrations", "012_budget_heads_sub_heads_refactor.sql");
    if (fs.existsSync(migration012)) {
      await pool.query(fs.readFileSync(migration012, "utf8"));
    }
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS budget_allocations (
      id SERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
      financial_year_id INTEGER NOT NULL REFERENCES financial_years(id) ON DELETE RESTRICT,
      budget_sub_head_id INTEGER NOT NULL REFERENCES budget_sub_heads(id) ON DELETE RESTRICT,
      allocated_amount NUMERIC(15,2) NOT NULL,
      responsible_teacher_id INTEGER NULL REFERENCES teachers(id) ON DELETE RESTRICT,
      remarks TEXT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_budget_allocations_fy_sub_head UNIQUE (school_id, financial_year_id, budget_sub_head_id),
      CONSTRAINT chk_budget_allocations_amount CHECK (allocated_amount > 0)
    )
  `);
};

const cleanup = async (yearLabel) => {
  await pool.query(
    `
    DELETE FROM budget_allocations
    WHERE budget_sub_head_id IN (
      SELECT id FROM budget_sub_heads WHERE sub_head_code = 'TEST_ALLOC_SUB'
    )
    `
  );
  await pool.query(`DELETE FROM budget_sub_heads WHERE sub_head_code = 'TEST_ALLOC_SUB'`);
  await pool.query(`DELETE FROM budget_heads WHERE head_code = 'TEST_ALLOC_HEAD'`);
  await pool.query(
    `DELETE FROM financial_years WHERE school_id = $1 AND year_label = $2`,
    [SCHOOL_ID, yearLabel]
  );
};

const run = async () => {
  const testLabel = getIndianFyLabel(getCurrentIndianFyStartYear());

  try {
    console.log("Budget Allocations service tests\n");

    await ensureSchema();
    await cleanup(testLabel);
    console.log("✓ Schema ready");

    const head = await budgetHeadService.createBudgetHead({
      userId: USER_ID,
      headName: "Test Allocation Head",
    });
    await pool.query(`UPDATE budget_heads SET head_code = 'TEST_ALLOC_HEAD' WHERE id = $1`, [head.id]);

    const subHead = await budgetSubHeadService.createBudgetSubHead({
      userId: USER_ID,
      budgetHeadId: head.id,
      subHeadName: "Test Allocation Sub Head",
    });
    await pool.query(`UPDATE budget_sub_heads SET sub_head_code = 'TEST_ALLOC_SUB' WHERE id = $1`, [
      subHead.id,
    ]);

    const activeFy = await financialYearService.createFinancialYear({
      schoolId: SCHOOL_ID,
      userId: USER_ID,
      yearLabel: testLabel,
    });
    await financialYearService.activateFinancialYear(activeFy.id, SCHOOL_ID);
    assert(activeFy.status === FINANCIAL_YEAR_STATUS.CLOSED, "FY created closed");
    console.log("✓ Active financial year");

    const created = await budgetAllocationService.createBudgetAllocation({
      schoolId: SCHOOL_ID,
      userId: USER_ID,
      financialYearId: activeFy.id,
      budgetSubHeadId: subHead.id,
      allocatedAmount: 50000,
      remarks: "Test allocation",
    });

    assert(created.budget_sub_head_id === subHead.id, "Allocation references sub head");
    assert(created.budget_head_name === head.head_name, "Allocation join includes parent head");
    assert(created.sub_head_name === subHead.sub_head_name, "Allocation join includes sub head");
    console.log("✓ Create allocation against sub head");

    let duplicateFailed = false;
    try {
      await budgetAllocationService.createBudgetAllocation({
        schoolId: SCHOOL_ID,
        userId: USER_ID,
        financialYearId: activeFy.id,
        budgetSubHeadId: subHead.id,
        allocatedAmount: 1000,
      });
    } catch (err) {
      duplicateFailed = err.statusCode === 409;
    }
    assert(duplicateFailed, "Duplicate sub head per FY rejected");
    console.log("✓ Duplicate allocation rejected");

    const summary = await budgetAllocationService.getBudgetAllocationSummary(SCHOOL_ID, activeFy.id);
    assert(Number(summary.totals.total_allocated) === 50000, "Summary total");
    assert(summary.by_head.length >= 1, "Summary grouped by parent head");
    console.log("✓ Summary by budget head");

    await financialYearService.closeFinancialYear(activeFy.id, SCHOOL_ID);

    let closedFyFailed = false;
    try {
      await budgetAllocationService.createBudgetAllocation({
        schoolId: SCHOOL_ID,
        userId: USER_ID,
        financialYearId: activeFy.id,
        budgetSubHeadId: subHead.id,
        allocatedAmount: 1000,
      });
    } catch (err) {
      closedFyFailed = err.statusCode === 400;
    }
    assert(closedFyFailed, "Create blocked for closed FY");
    console.log("✓ Create blocked for closed FY");

    console.log("\nAll Budget Allocations service tests passed.");
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
