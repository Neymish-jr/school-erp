/**
 * Verify Student Module Hardening Sprint changes.
 * Usage: node backend/scripts/testStudentsHardening.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const fs = require("fs");
const path = require("path");
const { isAdminLike } = require("../middleware/auth");

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const runMiddleware = (middleware, role) =>
  new Promise((resolve) => {
    const req = { user: { role, school_id: 1 } };
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

  assert(
    routesContent.includes("isAdminLike"),
    "studentRoutes must use isAdminLike"
  );
  assert(
    !routesContent.includes('roleMiddleware("admin")'),
    "studentRoutes must not use roleMiddleware(\"admin\")"
  );
  console.log("✓ POST/PUT/DELETE use isAdminLike (admin + super_admin)");

  assert(
    /router\.delete\([\s\S]*isAdminLike/.test(routesContent),
    "DELETE must use isAdminLike"
  );
  console.log("✓ DELETE protected with isAdminLike");

  assert(
    controllerContent.includes('role !== "super_admin"'),
    "getStudents must bypass school filter for super_admin"
  );
  assert(
    controllerContent.includes("schoolClause"),
    "getStudents must apply schoolClause"
  );
  console.log("✓ GET list applies school_id filter with super_admin bypass");

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

  for (const role of ["admin", "super_admin"]) {
    const result = await runMiddleware(isAdminLike, role);
    assert(result.statusCode === 200, `isAdminLike should allow ${role}`);
  }

  const teacherResult = await runMiddleware(isAdminLike, "teacher");
  assert(teacherResult.statusCode === 403, "isAdminLike should deny teacher");
  console.log("✓ isAdminLike allows admin/super_admin and denies teacher");

  console.log("\nAll student hardening checks passed.");
};

run().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
