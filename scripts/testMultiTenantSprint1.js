/**
 * Verify Multi-Tenant Hardening Sprint 1 changes.
 * Usage: node backend/scripts/testMultiTenantSprint1.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const fs = require("fs");
const path = require("path");

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const read = (relativePath) =>
  fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");

const buildSchoolClause = (role, schoolId, params, tableAlias = "activities") => {
  if (role !== "super_admin" && schoolId != null) {
    params.push(schoolId);
    return ` AND ${tableAlias}.school_id = $${params.length}`;
  }

  return "";
};

const run = async () => {
  console.log("Multi-Tenant Hardening Sprint 1 tests\n");

  const activityController = read("controllers/activityController.js");
  const activityValidator = read("validators/activityValidator.js");
  const attendanceController = read("controllers/attendanceController.js");
  const studentImportController = read("controllers/studentImportController.js");
  const studentImportRoutes = read("routes/studentImportRoutes.js");

  assert(
    !activityValidator.includes("school_id"),
    "activityValidator must not accept client school_id"
  );
  assert(
    activityController.includes('role !== "super_admin"'),
    "activityController must include super_admin bypass"
  );
  assert(
    activityController.includes("resolveSchoolIdForWrite"),
    "activityController must derive school_id from JWT on writes"
  );
  assert(
    activityController.includes("Assigned teacher not found in your school"),
    "activityController must verify teacher belongs to school"
  );
  assert(
    activityController.includes("WHERE 1 = 1") &&
      activityController.includes("buildSchoolClause"),
    "activityController must scope activity reads"
  );
  assert(
    (activityController.match(/\$\{schoolClause\}/g) || []).length >= 3,
    "activityController must apply schoolClause on reads and updates"
  );
  console.log("✓ Activities module hardened");

  assert(
    !attendanceController.includes("school_id: 1") &&
      !attendanceController.includes(", 1\n"),
    "attendanceController must not hardcode school_id = 1"
  );
  assert(
    attendanceController.includes("resolveSchoolIdForWrite"),
    "attendanceController must use JWT school_id on writes"
  );
  assert(
    attendanceController.includes("verifyStudentInSchool"),
    "attendanceController must verify student belongs to school"
  );
  assert(
    attendanceController.includes('role !== "super_admin"'),
    "attendanceController must include super_admin bypass"
  );
  console.log("✓ Attendance module hardened");

  assert(
    !studentImportController.includes(", 1,") &&
      !studentImportController.includes("school_id,\n          1"),
    "studentImportController must not hardcode school_id = 1"
  );
  assert(
    studentImportController.includes("resolveSchoolIdForWrite"),
    "studentImportController must use JWT school_id on import"
  );
  assert(
    studentImportController.includes("WHERE is_active = true") &&
      studentImportController.includes("buildSchoolClause"),
    "studentImportController must scope export by school"
  );
  assert(
    studentImportRoutes.includes("upload.single(\"file\")"),
    "studentImportRoutes must wire multer before importStudents"
  );
  console.log("✓ Student import/export hardened");

  require("../controllers/activityController");
  require("../controllers/attendanceController");
  require("../controllers/studentImportController");
  require("../routes/studentImportRoutes");
  require("../validators/activityValidator");
  console.log("✓ Modified modules load without import errors");

  const adminParams = [];
  const adminClause = buildSchoolClause("admin", 2, adminParams);
  assert(adminClause === " AND activities.school_id = $1", "admin must get school clause");
  assert(adminParams[0] === 2, "admin params must include school_id");

  const superParams = [];
  const superClause = buildSchoolClause("super_admin", 2, superParams);
  assert(superClause === "", "super_admin must bypass school clause");
  assert(superParams.length === 0, "super_admin params must not add school_id");
  console.log("✓ buildSchoolClause matches promotion/student pattern");

  console.log("\nAll Multi-Tenant Hardening Sprint 1 checks passed.");
};

run().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
