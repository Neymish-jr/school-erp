/**
 * Service-layer tests for Financial Years (no HTTP server required).
 * Usage: node backend/scripts/testFinancialYearsService.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const fs = require("fs");
const path = require("path");
const pool = require("../db");
const financialYearService = require("../services/financialYearService");
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

const runMigration = async () => {
  const sql = fs.readFileSync(
    path.join(__dirname, "..", "migrations", "008_create_financial_years.sql"),
    "utf8"
  );
  await pool.query(sql);
};

const cleanupTestYears = async (labels = []) => {
  if (!labels.length) return;

  await pool.query(
    `
    DELETE FROM financial_years
    WHERE school_id = $1
      AND year_label = ANY($2::text[])
    `,
    [SCHOOL_ID, labels]
  );
};

const run = async () => {
  const currentStartYear = getCurrentIndianFyStartYear();
  const currentLabel = getIndianFyLabel(currentStartYear);
  const previousLabel = getIndianFyLabel(currentStartYear - 1);
  const olderLabel = getIndianFyLabel(currentStartYear - 2);
  const futureLabel = getIndianFyLabel(currentStartYear + 2);
  const testLabels = [currentLabel, previousLabel, olderLabel, futureLabel];

  const createdLabels = [];

  try {
    console.log("Financial Years service tests\n");

    await runMigration();
    await cleanupTestYears(testLabels);
    console.log("✓ Migration applied");

    const derived = financialYearService.deriveDatesFromYearLabel(currentLabel);
    assert(derived.start_date.endsWith("-04-01"), "start_date uses 01 April");
    assert(derived.end_date.endsWith("-03-31"), "end_date uses 31 March");
    console.log("✓ deriveDatesFromYearLabel");

    const futureFy = await financialYearService.createFinancialYear({
      schoolId: SCHOOL_ID,
      userId: USER_ID,
      yearLabel: futureLabel,
    });
    createdLabels.push(futureLabel);
    assert(futureFy.status === FINANCIAL_YEAR_STATUS.CLOSED, "Future FY defaults to closed");
    console.log(`✓ Future FY ${futureLabel} created as closed`);

    let futureActivateFailed = false;
    try {
      await financialYearService.activateFinancialYear(futureFy.id, SCHOOL_ID);
    } catch (err) {
      futureActivateFailed =
        err.statusCode === 400 &&
        err.message === "Financial year cannot be activated before its start date.";
    }
    assert(futureActivateFailed, "Future FY cannot activate before start date");
    console.log("✓ Future FY activation rejected before start date");

    await financialYearService.createFinancialYear({
      schoolId: SCHOOL_ID,
      userId: USER_ID,
      yearLabel: olderLabel,
    });
    createdLabels.push(olderLabel);

    await financialYearService.createFinancialYear({
      schoolId: SCHOOL_ID,
      userId: USER_ID,
      yearLabel: previousLabel,
    });
    createdLabels.push(previousLabel);

    const currentFy = await financialYearService.createFinancialYear({
      schoolId: SCHOOL_ID,
      userId: USER_ID,
      yearLabel: currentLabel,
    });
    createdLabels.push(currentLabel);

    await financialYearService.activateFinancialYear(currentFy.id, SCHOOL_ID);
    console.log(`✓ Activate current FY ${currentLabel}`);

    const list = await financialYearService.listFinancialYears({ schoolId: SCHOOL_ID });
    const listedLabels = list.map((row) => row.year_label);
    assert(listedLabels[0] === currentLabel, "Active FY appears first in list");
    assert(
      listedLabels.indexOf(previousLabel) < listedLabels.indexOf(olderLabel),
      "Remaining FYs sorted by start_date DESC"
    );
    console.log("✓ List ordering: active first, then start_date DESC");

    const sorted = financialYearService.sortFinancialYears(list);
    assert(sorted[0].year_label === currentLabel, "sortFinancialYears helper matches API order");
    console.log("✓ sortFinancialYears helper");

    await financialYearService.closeFinancialYear(currentFy.id, SCHOOL_ID);

    let activeDeleteFailed = false;
    await financialYearService.activateFinancialYear(currentFy.id, SCHOOL_ID);
    try {
      await financialYearService.deleteFinancialYear(currentFy.id, SCHOOL_ID);
    } catch (err) {
      activeDeleteFailed =
        err.statusCode === 400 && err.message === "Active financial years cannot be deleted.";
    }
    assert(activeDeleteFailed, "Active FY delete rejected");
    console.log("✓ Active FY cannot be deleted");

    await financialYearService.closeFinancialYear(currentFy.id, SCHOOL_ID);
    const deleted = await financialYearService.deleteFinancialYear(currentFy.id, SCHOOL_ID);
    assert(deleted.year_label === currentLabel, "Closed FY deleted");
    createdLabels.splice(createdLabels.indexOf(currentLabel), 1);
    console.log("✓ Super-admin delete path: closed FY deleted");

    const previousFy = await financialYearService.getFinancialYearById(
      (
        await pool.query(
          "SELECT id FROM financial_years WHERE school_id = $1 AND year_label = $2",
          [SCHOOL_ID, previousLabel]
        )
      ).rows[0].id,
      SCHOOL_ID
    );

    await financialYearService.activateFinancialYear(previousFy.id, SCHOOL_ID);
    const reloadedCurrent = await pool.query(
      "SELECT id FROM financial_years WHERE school_id = $1 AND year_label = $2",
      [SCHOOL_ID, currentLabel]
    );
    assert(reloadedCurrent.rowCount === 0, "Deleted FY removed from database");

    const currentFyAgain = await financialYearService.createFinancialYear({
      schoolId: SCHOOL_ID,
      userId: USER_ID,
      yearLabel: currentLabel,
    });
    createdLabels.push(currentLabel);

    await financialYearService.activateFinancialYear(currentFyAgain.id, SCHOOL_ID);
    const closedPrevious = await financialYearService.getFinancialYearById(previousFy.id, SCHOOL_ID);
    assert(closedPrevious.status === FINANCIAL_YEAR_STATUS.CLOSED, "Prior active FY auto-closed");
    console.log("✓ Auto-close when activating another eligible FY");

    console.log("\nAll Financial Years service tests passed.");
  } finally {
    await cleanupTestYears(createdLabels.length ? createdLabels : testLabels);
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
