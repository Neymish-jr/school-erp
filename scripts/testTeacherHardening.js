/**
 * Verify Teacher Module Hardening Sprint changes (RC Sprint 2).
 * Usage: node backend/scripts/testTeacherHardening.js
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
  console.log("Teacher Module Hardening tests\n");

  const teacherRoutes = read("routes/teacherRoutes.js");
  const adminChargeRoutes = read("routes/teacherAdministrativeChargeAssignmentRoutes.js");
  const subjectController = read("controllers/teacherSubjectAssignmentController.js");

  assert(!teacherRoutes.includes("roleMiddleware"), "teacherRoutes must not use roleMiddleware");
  assert(!teacherRoutes.includes("isAdminLike"), "teacherRoutes must not use isAdminLike");
  assert(teacherRoutes.includes('authorize("teacher.create")'), "teacherRoutes POST must use teacher.create");
  assert(teacherRoutes.includes('authorize("teacher.update")'), "teacherRoutes PUT must use teacher.update");
  assert(teacherRoutes.includes('authorize("teacher.delete")'), "teacherRoutes DELETE must use teacher.delete");
  console.log("✓ teacherRoutes uses authorize() on mutating routes");

  require("../routes/teacherRoutes");
  require("../routes/teacherAdministrativeChargeAssignmentRoutes");
  require("../controllers/teacherSubjectAssignmentController");
  console.log("✓ Modified modules load without import errors");

  assert(
    adminChargeRoutes.includes('authorize("administration.charge_assignment.read")'),
    "admin charge routes must use charge_assignment.read"
  );
  assert(
    adminChargeRoutes.includes('authorize("administration.charge_assignment.assign")'),
    "admin charge routes must use charge_assignment.assign"
  );
  assert(!adminChargeRoutes.includes("isAdminLike"), "admin charge routes must not use isAdminLike");
  console.log("✓ teacherAdministrativeChargeAssignmentRoutes use permission authorize()");

  assert(
    subjectController.includes("resolveSchoolScope"),
    "subject assignment controller must use resolveSchoolScope"
  );
  assert(
    subjectController.includes("buildSchoolClause"),
    "subject assignment controller must define buildSchoolClause"
  );
  assert(
    subjectController.includes("resolveSchoolIdForWrite"),
    "subject assignment controller must use resolveSchoolIdForWrite for writes"
  );
  console.log("✓ teacher subject assignment list scoped via tenantScope");

  console.log("\nAll teacher hardening checks passed.");
};

run().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
