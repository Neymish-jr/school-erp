/**
 * Verify Report Cards Module P0 hardening (RC).
 * Usage: node backend/scripts/testReportCardsHardening.js
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
  console.log("Report Cards Module Hardening tests\n");

  const reportCardController = read("controllers/reportCardController.js");
  const reportCardRoutes = read("routes/reportCardRoutes.js");

  assert(
    reportCardController.includes("resolveSchoolScope"),
    "reportCardController must require school context via resolveSchoolScope"
  );
  console.log("✓ P0: tenant scope uses resolveSchoolScope");

  assert(
    !reportCardController.includes("administrative_charges"),
    "reportCardController must not reference default administrative_charges alias"
  );
  console.log("✓ P0: no administrative_charges alias");

  const buildSchoolClauseCalls =
    reportCardController.match(/buildSchoolClause\([\s\S]*?\)/g) || [];

  assert(
    buildSchoolClauseCalls.length === 2,
    "reportCardController must call buildSchoolClause exactly twice"
  );

  for (const call of buildSchoolClauseCalls) {
    assert(
      call.includes('"s"'),
      `each buildSchoolClause call must pass the students alias "s": ${call}`
    );
    assert(
      !call.match(/buildSchoolClause\(\s*role,\s*schoolId,\s*\w+\s*\)/),
      `buildSchoolClause must not rely on the default alias: ${call}`
    );
  }
  console.log("✓ P0: all buildSchoolClause calls pass students table alias");

  assert(
    /FROM students s[\s\S]*WHERE s\.id = \$1[\s\S]*studentSchoolClause/.test(
      reportCardController
    ),
    "student lookup must scope via students alias s"
  );
  assert(
    /JOIN students s[\s\S]*ON s\.id = sr\.student_id[\s\S]*resultsSchoolClause/.test(
      reportCardController
    ),
    "results lookup must scope via joined students alias s"
  );
  console.log("✓ P0: SQL queries align alias with school clause");

  assert(
    reportCardRoutes.includes('authorize("report_card.read")'),
    "report card route must use report_card.read permission"
  );
  console.log("✓ route permission unchanged");

  require("../controllers/reportCardController");
  require("../routes/reportCardRoutes");
  console.log("✓ Modified modules load without import errors");

  console.log("\nAll report cards hardening checks passed.");
};

run().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
