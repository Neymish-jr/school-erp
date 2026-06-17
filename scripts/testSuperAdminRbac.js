/**
 * Verify super_admin inherits admin route access via isAdminLike.
 * Usage: node backend/scripts/testSuperAdminRbac.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const {
  isAdmin,
  isAdminLike,
  isTeacherOrAdminLike,
} = require("../middleware/auth");

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const runMiddleware = (middleware, role) =>
  new Promise((resolve) => {
    const req = { user: { role } };
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      send(message) {
        resolve({ statusCode: this.statusCode, message });
      },
    };

    middleware(req, res, () => {
      resolve({ statusCode: 200, message: "next" });
    });
  });

const verifyRoleMatrix = async (middleware, label, allowedRoles, deniedRoles) => {
  for (const role of allowedRoles) {
    const result = await runMiddleware(middleware, role);
    assert(result.statusCode === 200, `${label} should allow ${role}`);
  }

  for (const role of deniedRoles) {
    const result = await runMiddleware(middleware, role);
    assert(result.statusCode === 403, `${label} should deny ${role}`);
  }
};

const run = async () => {
  console.log("Super Admin RBAC inheritance tests\n");

  await verifyRoleMatrix(isAdmin, "isAdmin (legacy)", ["admin"], ["super_admin", "teacher"]);
  console.log("✓ Legacy isAdmin still admin-only");

  await verifyRoleMatrix(
    isAdminLike,
    "isAdminLike",
    ["admin", "super_admin"],
    ["teacher"]
  );
  console.log("✓ isAdminLike allows admin + super_admin");

  await verifyRoleMatrix(
    isTeacherOrAdminLike,
    "isTeacherOrAdminLike",
    ["teacher", "admin", "super_admin"],
    []
  );
  console.log("✓ isTeacherOrAdminLike allows teacher + admin + super_admin");

  const routeFiles = [
    "expenseRequestRoutes.js",
    "budgetAllocationRoutes.js",
    "staffPostRoutes.js",
    "administrativeChargeRoutes.js",
    "staffServiceHistoryRoutes.js",
    "financialYearRoutes.js",
    "timetableRoutes.js",
    "teacherSubjectAssignmentRoutes.js",
    "teacherStaffPostAssignmentRoutes.js",
    "studentResultsRoutes.js",
  ];

  const fs = require("fs");
  const path = require("path");
  const routesDir = path.join(__dirname, "..", "routes");

  for (const file of routeFiles) {
    const content = fs.readFileSync(path.join(routesDir, file), "utf8");
    assert(!/\bisAdmin\b(?!Like|OrSuperAdmin)/.test(content), `${file} still uses isAdmin`);
  }

  const indexContent = fs.readFileSync(path.join(__dirname, "..", "index.js"), "utf8");
  assert(!/authenticate,\s*isAdmin\b/.test(indexContent), "index.js still mounts isAdmin routes");

  console.log("✓ No route files use legacy isAdmin guards");

  console.log("\nAll Super Admin RBAC inheritance tests passed.");
};

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\nTest run failed:", err.message);
    process.exit(1);
  });
