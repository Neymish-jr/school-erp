/**
 * Service-layer tests for Budget Heads + Sub Heads (two-table hierarchy).
 * Usage: node backend/scripts/testBudgetHeadsService.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const path = require("path");
const pool = require("../db");
const budgetHeadService = require("../services/budgetHeadService");
const budgetSubHeadService = require("../services/budgetSubHeadService");
const { generateCodeBase } = require("../services/budgetMasterCodeService");

const USER_ID = 1;

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const runMigrations = async () => {
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
};

const cleanup = async () => {
  await pool.query(
    `
    DELETE FROM budget_sub_heads
    WHERE sub_head_code LIKE 'TEST_%' OR sub_head_name LIKE 'Test %'
    `
  );
  await pool.query(
    `
    DELETE FROM budget_heads
    WHERE head_code LIKE 'TEST_%' OR head_name LIKE 'Test %'
    `
  );
};

const run = async () => {
  try {
    console.log("Budget Heads + Sub Heads service tests\n");

    await runMigrations();
    await cleanup();
    console.log("✓ Schema ready");

    assert(generateCodeBase("Sports Equipment") === "SPORTS_EQUIPMENT", "Code base generation");
    console.log("✓ generateCodeBase");

    const head = await budgetHeadService.createBudgetHead({
      userId: USER_ID,
      headName: "Test Sports & Physical Education",
      remarks: "Parent head",
    });
    assert(head.head_code, "Head code auto-generated");
    assert(head.is_active === true, "Head default active");
    console.log("✓ Create budget head");

    const subHead = await budgetSubHeadService.createBudgetSubHead({
      userId: USER_ID,
      budgetHeadId: head.id,
      subHeadName: "Test Sports Equipment",
      remarks: null,
    });
    assert(subHead.budget_head_id === head.id, "Sub head linked to parent");
    assert(subHead.sub_head_code, "Sub head code auto-generated");
    console.log("✓ Create budget sub head");

    let inactiveParentFailed = false;
    await budgetHeadService.updateBudgetHeadStatus(head.id, false);
    try {
      await budgetSubHeadService.createBudgetSubHead({
        userId: USER_ID,
        budgetHeadId: head.id,
        subHeadName: "Test Another Sub Head",
      });
    } catch (err) {
      inactiveParentFailed = err.statusCode === 400;
    }
    assert(inactiveParentFailed, "Cannot create sub head under inactive parent");
    console.log("✓ Inactive parent blocks new sub head");

    await budgetHeadService.updateBudgetHeadStatus(head.id, true);

    const list = await budgetSubHeadService.listBudgetSubHeads({ budgetHeadId: head.id });
    assert(list.length >= 1, "List sub heads by parent");
    console.log("✓ List sub heads");

    console.log("\nAll Budget Heads + Sub Heads service tests passed.");
  } finally {
    await cleanup();
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
