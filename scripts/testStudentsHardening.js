/**
 * Verify Student Module RBAC + tenant consistency (RC Sprint 2).
 * Usage: node backend/scripts/testStudentsHardening.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const fs = require("fs");
const path = require("path");

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const routesPath = path.join(__dirname, "..", "routes", "studentRoutes.js");
const controllerPath = path.join(__dirname, "..", "controllers", "studentController.js");
const routesContent = fs.readFileSync(routesPath, "utf8");
const controllerContent = fs.readFileSync(controllerPath, "utf8");

const run = async () => {
  console.log("Student Module Hardening tests\n");

  assert(
    /router\.put\(\s*["']\/:id["']/.test(routesContent),
    "PUT /:id route must exist"
  );
  console.log("✓ PUT /api/students/:id route registered");

  assert(routesContent.includes('authorize("student.create")'), "POST must use student.create");
  assert(routesContent.includes('authorize("student.update")'), "PUT must use student.update");
  assert(routesContent.includes('authorize("student.delete")'), "DELETE must use student.delete");
  assert(routesContent.includes('authorize("student.read")'), "GET must use student.read");
  assert(!routesContent.includes("isAdminLike"), "studentRoutes must not use isAdminLike");
  console.log("✓ CRUD routes use permission-based authorize()");

  assert(
    controllerContent.includes("resolveSchoolScope"),
    "studentController must use resolveSchoolScope"
  );
  assert(
    controllerContent.includes("resolveSchoolIdForWrite"),
    "studentController must use resolveSchoolIdForWrite"
  );
  assert(
    controllerContent.includes("buildSchoolClause"),
    "studentController must apply buildSchoolClause"
  );
  console.log("✓ Controller uses tenantScope helpers");

  assert(
    routesContent.includes("asyncHandler(updateStudent)"),
    "updateStudent must be wrapped with asyncHandler"
  );
  console.log("✓ updateStudent wired through asyncHandler");

  assert(
    controllerContent.includes("studentSchema.validate(req.body)"),
    "updateStudent must validate request body"
  );
  console.log("✓ updateStudent validates with studentSchema");

  console.log("\nAll student hardening checks passed.");
};

run().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
