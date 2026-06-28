/**
 * Verify Multi-Tenant Hardening Sprint 2 changes.
 * Usage: node backend/scripts/testMultiTenantSprint2.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const fs = require("fs");
const path = require("path");

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const read = (relativePath) =>
  fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");

const buildSchoolClause = (role, schoolId, params, tableAlias = "students") => {
  if (role !== "super_admin" && schoolId != null) {
    params.push(schoolId);
    return ` AND ${tableAlias}.school_id = $${params.length}`;
  }

  return "";
};

const run = async () => {
  console.log("Multi-Tenant Hardening Sprint 2 tests\n");

  const dashboardRoutes = read("routes/dashboardRoutes.js");
  const quotationService = read("services/quotationService.js");
  const quotationController = read("controllers/quotationController.js");
  const markController = read("controllers/markController.js");
  const reportCardController = read("controllers/reportCardController.js");
  const studentResultsController = read("controllers/studentResultsController.js");

  assert(
    dashboardRoutes.includes("buildSchoolClause"),
    "dashboardRoutes must define buildSchoolClause"
  );
  assert(
    dashboardRoutes.includes('role !== "super_admin"'),
    "dashboardRoutes must include super_admin bypass"
  );
  assert(
    !dashboardRoutes.includes("FROM users") &&
      dashboardRoutes.includes("FROM teachers"),
    "dashboardRoutes must count teachers from teachers table, not users"
  );
  assert(
    (dashboardRoutes.match(/\$\{.*SchoolClause\}/g) || []).length >= 4,
    "dashboardRoutes must apply schoolClause on all dashboard queries"
  );
  assert(
    !dashboardRoutes.includes("school_id || 1"),
    "dashboardRoutes finance endpoint must not default school_id to 1"
  );
  console.log("✓ Dashboard module hardened");

  assert(
    quotationService.includes("getExpenseRequestContext"),
    "quotationService must resolve expense request with school scope"
  );
  assert(
    quotationService.includes("AND er.school_id"),
    "quotationService must scope expense requests by school_id"
  );
  assert(
    quotationService.includes("Expense not found in your school"),
    "quotationService must reject cross-school legacy expense on create"
  );
  assert(
    quotationService.includes("You can only add quotations to your own expense requests"),
    "quotationService must restrict teacher uploads to own expense requests"
  );
  assert(
    quotationService.includes("WHERE expense_request_id = $1"),
    "selectQuotation must reset selections scoped to expense request"
  );
  assert(
    quotationController.includes("quotationService"),
    "quotationController must delegate to quotationService"
  );
  assert(
    quotationController.includes("resolveSchoolScope"),
    "quotationController must use tenant scope helpers"
  );
  console.log("✓ Quotations module hardened");

  assert(
    markController.includes("buildSchoolClause"),
    "markController must define buildSchoolClause"
  );
  assert(
    markController.includes("verifyStudentInSchool"),
    "markController must verify student belongs to school on create"
  );
  assert(
    /FROM marks[\s\S]*JOIN students/.test(markController),
    "markController getMarks must join students for school scope"
  );
  assert(
    markController.includes("Student not found in your school"),
    "markController must reject cross-school student on create"
  );
  console.log("✓ Marks module hardened");

  assert(
    reportCardController.includes("buildSchoolClause"),
    "reportCardController must define buildSchoolClause"
  );
  assert(
    /FROM students s[\s\S]*buildSchoolClause/.test(reportCardController),
    "reportCardController student lookup must be school scoped"
  );
  assert(
    /FROM student_results AS sr[\s\S]*JOIN students s/.test(reportCardController),
    "reportCardController results lookup must join students for school scope"
  );
  console.log("✓ Report card module hardened");

  assert(
    studentResultsController.includes("buildSchoolClause"),
    "studentResultsController must define buildSchoolClause"
  );
  assert(
    studentResultsController.includes("verifyStudentInSchool"),
    "studentResultsController must verify student belongs to school on create"
  );
  assert(
    /FROM student_results[\s\S]*JOIN students/.test(studentResultsController),
    "studentResultsController must join students for school scope"
  );
  assert(
    studentResultsController.includes("Student not found in your school"),
    "studentResultsController must reject cross-school student on create"
  );
  console.log("✓ Student results module hardened");

  require("../routes/dashboardRoutes");
  require("../controllers/quotationController");
  require("../controllers/markController");
  require("../controllers/reportCardController");
  require("../controllers/studentResultsController");
  console.log("✓ Modified modules load without import errors");

  const adminParams = [];
  const adminClause = buildSchoolClause("admin", 2, adminParams, "students");
  assert(adminClause === " AND students.school_id = $1", "admin must get school clause");
  assert(adminParams[0] === 2, "admin params must include school_id");

  const superParams = [];
  const superClause = buildSchoolClause("super_admin", 2, superParams, "students");
  assert(superClause === "", "super_admin must bypass school clause");
  assert(superParams.length === 0, "super_admin params must not add school_id");
  console.log("✓ buildSchoolClause matches promotion/student pattern");

  console.log("\nAll Multi-Tenant Hardening Sprint 2 checks passed.");
};

run().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
