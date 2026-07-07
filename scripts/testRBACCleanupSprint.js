/**
 * Verify RBAC Cleanup Sprint changes (RC Sprint 2 permission migration).
 * Usage: node backend/scripts/testRBACCleanupSprint.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const fs = require("fs");
const path = require("path");

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const read = (relativePath) =>
  fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");

const assertWriteRouteUsesAuthorize = (content, method, routePattern, permission, label) => {
  const routeRegex = new RegExp(
    `router\\.${method}\\(\\s*["']${routePattern}["'][\\s\\S]*?asyncHandler\\(`,
    "i"
  );
  const match = content.match(routeRegex);

  assert(match, `${label} ${method.toUpperCase()} route must exist`);
  assert(
    match[0].includes(`authorize("${permission}")`),
    `${label} ${method.toUpperCase()} must use authorize("${permission}")`
  );
};

const run = async () => {
  console.log("RBAC Cleanup Sprint tests\n");

  const routeFiles = [
    ["routes/classRoutes.js", "classRoutes", "class.create"],
    ["routes/sectionRoutes.js", "sectionRoutes", "section.create"],
    ["routes/classSectionRoutes.js", "classSectionRoutes", "class_section.create"],
    ["routes/examRoutes.js", "examRoutes", "exam.create"],
    ["routes/subjectRoutes.js", "subjectRoutes", "subject.create"],
  ];

  for (const [filePath, label] of routeFiles) {
    const content = read(filePath);

    assert(!content.includes("roleMiddleware"), `${label} must not use roleMiddleware`);
    assert(!content.includes("isAdminLike"), `${label} must not use isAdminLike`);
    assert(content.includes("authorize("), `${label} must use authorize()`);
    assert(content.includes("authenticate"), `${label} must keep authenticate`);
    console.log(`✓ ${label} uses authorize() instead of legacy role checks`);
  }

  assertWriteRouteUsesAuthorize(read("routes/classRoutes.js"), "post", "\\/", "class.create", "classRoutes");
  assertWriteRouteUsesAuthorize(read("routes/sectionRoutes.js"), "post", "\\/", "section.create", "sectionRoutes");
  assertWriteRouteUsesAuthorize(read("routes/classSectionRoutes.js"), "post", "\\/", "class_section.create", "classSectionRoutes");
  assertWriteRouteUsesAuthorize(read("routes/classSectionRoutes.js"), "put", "\\/:id", "class_section.update", "classSectionRoutes");
  assertWriteRouteUsesAuthorize(read("routes/classSectionRoutes.js"), "delete", "\\/:id", "class_section.delete", "classSectionRoutes");
  assertWriteRouteUsesAuthorize(read("routes/examRoutes.js"), "post", "\\/", "exam.create", "examRoutes");
  assertWriteRouteUsesAuthorize(read("routes/subjectRoutes.js"), "post", "\\/", "subject.create", "subjectRoutes");
  assertWriteRouteUsesAuthorize(read("routes/subjectRoutes.js"), "put", "\\/:id", "subject.update", "subjectRoutes");
  assertWriteRouteUsesAuthorize(read("routes/subjectRoutes.js"), "delete", "\\/:id", "subject.delete", "subjectRoutes");
  console.log("✓ POST/PUT/DELETE write routes require permission authorize()");

  for (const [filePath] of routeFiles) {
    const content = read(filePath);
    assert(
      /router\.get\([\s\S]*authorize\(/.test(content),
      `${filePath} GET routes must use authorize()`
    );
  }
  console.log("✓ GET routes use authorize()");

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
    assignmentController.includes("resolveSchoolScope"),
    "teacherSubjectAssignmentController must use resolveSchoolScope"
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

  console.log("\nAll RBAC Cleanup Sprint checks passed.");
};

run().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
