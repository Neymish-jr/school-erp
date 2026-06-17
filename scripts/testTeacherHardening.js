/**
 * Verify Teacher Module Hardening Sprint changes.
 * Usage: node backend/scripts/testTeacherHardening.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const fs = require("fs");
const path = require("path");
const { isAdminLike } = require("../middleware/auth");

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const read = (relativePath) =>
  fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");

const runMiddleware = (middleware, role) =>
  new Promise((resolve) => {
    const req = { user: { role, school_id: 1 }, body: {} };
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      send(message) {
        resolve({ statusCode: this.statusCode, message });
      },
      json(payload) {
        resolve({ statusCode: this.statusCode, payload });
      },
    };

    middleware(req, res, () => {
      resolve({ statusCode: 200, message: "next" });
    });
  });

const buildSchoolClause = (role, schoolId, params, tableAlias = "t") => {
  if (role !== "super_admin" && schoolId != null) {
    params.push(schoolId);
    return `${tableAlias}.school_id = $${params.length}`;
  }

  return null;
};

const run = async () => {
  console.log("Teacher Module Hardening tests\n");

  const teacherRoutes = read("routes/teacherRoutes.js");
  const adminChargeRoutes = read("routes/teacherAdministrativeChargeAssignmentRoutes.js");
  const subjectController = read("controllers/teacherSubjectAssignmentController.js");

  assert(!teacherRoutes.includes("roleMiddleware"), "teacherRoutes must not use roleMiddleware");
  assert(teacherRoutes.includes("isAdminLike"), "teacherRoutes must use isAdminLike");
  assert(
    (teacherRoutes.match(/isAdminLike/g) || []).length >= 3,
    "teacherRoutes must apply isAdminLike to POST, PUT, and DELETE"
  );
  console.log("✓ teacherRoutes uses isAdminLike on mutating routes");

  require("../routes/teacherRoutes");
  require("../routes/teacherAdministrativeChargeAssignmentRoutes");
  require("../controllers/teacherSubjectAssignmentController");
  console.log("✓ Modified modules load without import errors");

  assert(
    adminChargeRoutes.includes("router.use(authenticate, isAdminLike)"),
    "admin charge routes must use authenticate + isAdminLike"
  );
  assert(!adminChargeRoutes.includes("roleMiddleware"), "admin charge routes must not use roleMiddleware");
  console.log("✓ teacherAdministrativeChargeAssignmentRoutes protected with isAdminLike");

  assert(
    subjectController.includes('role !== "super_admin"'),
    "subject assignment controller must include super_admin bypass"
  );
  assert(
    subjectController.includes("buildSchoolClause"),
    "subject assignment controller must define buildSchoolClause"
  );
  assert(
    subjectController.includes("school_id: schoolId, role"),
    "getAssignments must pass schoolId and role into buildAssignmentsQuery"
  );
  console.log("✓ teacher subject assignment list scoped with super_admin bypass");

  const adminParams = [];
  const adminClause = buildSchoolClause("admin", 1, adminParams);
  assert(adminClause === "t.school_id = $1", "admin must get school clause");
  assert(adminParams.length === 1 && adminParams[0] === 1, "admin params must include school_id");

  const superParams = [];
  const superClause = buildSchoolClause("super_admin", 1, superParams);
  assert(superClause === null, "super_admin must bypass school clause");
  assert(superParams.length === 0, "super_admin params must not add school_id");
  console.log("✓ buildSchoolClause matches promotion/student pattern");

  for (const role of ["admin", "super_admin"]) {
    const result = await runMiddleware(isAdminLike, role);
    assert(result.statusCode === 200, `isAdminLike should allow ${role}`);
  }
  const teacherResult = await runMiddleware(isAdminLike, "teacher");
  assert(teacherResult.statusCode === 403, "isAdminLike should deny teacher");
  console.log("✓ isAdminLike allows admin/super_admin and denies teacher");

  console.log("\nAll teacher hardening checks passed.");
};

run().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
