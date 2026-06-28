/**
 * Verify RBAC Cleanup Sprint changes.
 * Usage: node backend/scripts/testRBACCleanupSprint.js
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

const assertWriteRouteUsesAdminLike = (content, method, routePattern, label) => {
  const routeRegex = new RegExp(
    `router\\.${method}\\(\\s*["']${routePattern}["'][\\s\\S]*?asyncHandler\\(`,
    "i"
  );
  const match = content.match(routeRegex);

  assert(match, `${label} ${method.toUpperCase()} route must exist`);
  assert(
    match[0].includes("isAdminLike"),
    `${label} ${method.toUpperCase()} must use isAdminLike`
  );
};

const run = async () => {
  console.log("RBAC Cleanup Sprint tests\n");

  const routeFiles = [
    ["routes/classRoutes.js", "classRoutes"],
    ["routes/sectionRoutes.js", "sectionRoutes"],
    ["routes/classSectionRoutes.js", "classSectionRoutes"],
    ["routes/examRoutes.js", "examRoutes"],
    ["routes/subjectRoutes.js", "subjectRoutes"],
  ];

  for (const [filePath, label] of routeFiles) {
    const content = read(filePath);

    assert(!content.includes("roleMiddleware"), `${label} must not use roleMiddleware`);
    assert(content.includes("isAdminLike"), `${label} must import/use isAdminLike`);
    assert(content.includes("authenticate"), `${label} must keep authenticate`);
    console.log(`✓ ${label} uses isAdminLike instead of legacy roleMiddleware`);
  }

  assertWriteRouteUsesAdminLike(read("routes/classRoutes.js"), "post", "\\/", "classRoutes");
  assertWriteRouteUsesAdminLike(read("routes/sectionRoutes.js"), "post", "\\/", "sectionRoutes");
  assertWriteRouteUsesAdminLike(read("routes/classSectionRoutes.js"), "post", "\\/", "classSectionRoutes");
  assertWriteRouteUsesAdminLike(read("routes/classSectionRoutes.js"), "put", "\\/:id", "classSectionRoutes");
  assertWriteRouteUsesAdminLike(read("routes/classSectionRoutes.js"), "delete", "\\/:id", "classSectionRoutes");
  assertWriteRouteUsesAdminLike(read("routes/examRoutes.js"), "post", "\\/", "examRoutes");
  assertWriteRouteUsesAdminLike(read("routes/subjectRoutes.js"), "post", "\\/", "subjectRoutes");
  assertWriteRouteUsesAdminLike(read("routes/subjectRoutes.js"), "put", "\\/:id", "subjectRoutes");
  assertWriteRouteUsesAdminLike(read("routes/subjectRoutes.js"), "delete", "\\/:id", "subjectRoutes");
  console.log("✓ POST/PUT/DELETE write routes require isAdminLike");

  for (const [filePath] of routeFiles) {
    const content = read(filePath);
    assert(
      /router\.get\([\s\S]*authenticate/.test(content),
      `${filePath} GET routes must remain authenticate-protected`
    );
  }
  console.log("✓ GET routes remain authenticate-only");

  const assignmentController = read("controllers/teacherSubjectAssignmentController.js");
  assert(
    /const relieveAssignment[\s\S]*buildSchoolClause/.test(assignmentController),
    "relieveAssignment must use buildSchoolClause"
  );
  assert(
    /UPDATE teacher_subject_assignments tsa[\s\S]*FROM teachers t/.test(assignmentController),
    "relieveAssignment must join teachers for school scope"
  );
  assert(
    assignmentController.includes('role !== "super_admin"'),
    "teacherSubjectAssignmentController must include super_admin bypass"
  );
  console.log("✓ relieveAssignment is school scoped via teachers join");

  const authController = read("controllers/authController.js");
  assert(
    !authController.includes(", 1]") && !authController.includes(", 1\n"),
    "registerUser must not hardcode school_id = 1"
  );
  assert(
    authController.includes("school_id: bodySchoolId"),
    "registerUser must read school_id from request body"
  );
  assert(
    authController.includes("Valid school_id is required"),
    "registerUser must validate school_id"
  );
  console.log("✓ registerUser uses explicit school_id instead of hardcoded 1");

  require("../routes/classRoutes");
  require("../routes/sectionRoutes");
  require("../routes/classSectionRoutes");
  require("../routes/examRoutes");
  require("../routes/subjectRoutes");
  require("../controllers/teacherSubjectAssignmentController");
  require("../controllers/authController");
  console.log("✓ Modified modules load without import errors");

  for (const role of ["admin", "super_admin"]) {
    const result = await runMiddleware(isAdminLike, role);
    assert(result.statusCode === 200, `isAdminLike should allow ${role}`);
  }

  const teacherResult = await runMiddleware(isAdminLike, "teacher");
  assert(teacherResult.statusCode === 403, "isAdminLike should deny teacher");
  console.log("✓ isAdminLike allows admin/super_admin and denies teacher");

  console.log("\nAll RBAC Cleanup Sprint checks passed.");
};

run().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
