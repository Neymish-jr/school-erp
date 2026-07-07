/**
 * Verify Dashboard Module P0 hardening (RC).
 * Usage: node backend/scripts/testDashboardHardening.js
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
  console.log("Dashboard Module Hardening tests\n");

  const dashboardRoutes = read("routes/dashboardRoutes.js");
  const tenantScope = read("utils/tenantScope.js");

  const summaryRouteSource = dashboardRoutes
    .split('router.get("/finance"')[0]
    .split('router.get("/",')[1];

  assert(
    summaryRouteSource.includes("resolveSchoolScope"),
    "summary route must resolve school context via resolveSchoolScope"
  );
  assert(
    summaryRouteSource.match(/if\s*\(\s*!scope\s*\)\s*\{\s*return;\s*\}/),
    "summary route must return early when school context is missing"
  );
  assert(
    !summaryRouteSource.includes("getEffectiveSchoolId"),
    "summary route must not use getEffectiveSchoolId (no optional tenant bypass)"
  );
  console.log("✓ P0: summary API uses resolveSchoolScope");

  assert(
    tenantScope.includes("School context is required for this operation"),
    "resolveSchoolScope must return standardized missing-school error"
  );
  console.log("✓ P0: missing school context returns standardized error");

  const buildSchoolClauseCalls =
    summaryRouteSource.match(/buildSchoolClause\([\s\S]*?\)/g) || [];

  assert(
    buildSchoolClauseCalls.length === 4,
    "summary route must call buildSchoolClause for all four aggregates"
  );

  const expectedAliases = ["students", "teachers", "classes", "attendance"];
  for (const alias of expectedAliases) {
    assert(
      buildSchoolClauseCalls.some((call) => call.includes(`"${alias}"`)),
      `buildSchoolClause must scope ${alias} query`
    );
  }

  for (const call of buildSchoolClauseCalls) {
    assert(
      !call.match(/buildSchoolClause\(\s*role,\s*schoolId,\s*\w+\s*\)/),
      `buildSchoolClause must pass an explicit table alias: ${call}`
    );
  }
  console.log("✓ P0: all summary queries use buildSchoolClause with correct aliases");

  assert(
    (summaryRouteSource.match(/\$\{.*SchoolClause\}/g) || []).length >= 4,
    "every summary SQL query must interpolate a school clause"
  );
  assert(
    /FROM students[\s\S]*studentSchoolClause/.test(summaryRouteSource) &&
      /FROM teachers[\s\S]*teacherSchoolClause/.test(summaryRouteSource) &&
      /FROM classes[\s\S]*classSchoolClause/.test(summaryRouteSource) &&
      /FROM attendance[\s\S]*attendanceSchoolClause/.test(summaryRouteSource),
    "summary SQL must apply school clauses on students, teachers, classes, and attendance"
  );
  console.log("✓ P0: summary SQL is tenant-scoped");

  assert(
    dashboardRoutes.includes('authorize("dashboard.summary.read")'),
    "summary route must keep dashboard.summary.read permission"
  );
  console.log("✓ route permission unchanged");

  require("../routes/dashboardRoutes");
  console.log("✓ Modified modules load without import errors");

  console.log("\nAll dashboard hardening checks passed.");
};

run().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
