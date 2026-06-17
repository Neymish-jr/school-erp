/**
 * Verify Promotion Module Hardening Sprint changes.
 * Usage: node backend/scripts/testPromotionHardening.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const fs = require("fs");
const path = require("path");
const {
  buildSchoolClause,
  parseStudentId,
} = require("../controllers/promotionController");

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const controllerPath = path.join(__dirname, "..", "controllers", "promotionController.js");
const routesPath = path.join(__dirname, "..", "routes", "promotionRoutes.js");
const controllerContent = fs.readFileSync(controllerPath, "utf8");
const routesContent = fs.readFileSync(routesPath, "utf8");

const run = () => {
  console.log("Promotion Module Hardening tests\n");

  assert(
    controllerContent.includes("WHERE a.status = 'Present'"),
    "Attendance query must use status = 'Present'"
  );
  assert(
    !controllerContent.includes("status = 'present'"),
    "Attendance query must not use lowercase present"
  );
  console.log("✓ Attendance calculation uses 'Present'");

  assert(
    controllerContent.includes("req.user"),
    "Controller must read req.user"
  );
  assert(
    controllerContent.includes('role !== "super_admin"'),
    "Controller must bypass school filter for super_admin"
  );
  assert(
    controllerContent.includes("buildSchoolClause"),
    "Controller must use shared school scoping helper"
  );
  console.log("✓ School isolation uses req.user with super_admin bypass");

  assert(
    /FROM students s[\s\S]*buildSchoolClause/.test(controllerContent),
    "Student lookup must be school scoped"
  );
  assert(
    /FROM marks m[\s\S]*JOIN students s/.test(controllerContent),
    "Marks lookup must join students for school scope"
  );
  assert(
    /FROM attendance a[\s\S]*JOIN students s/.test(controllerContent),
    "Attendance lookup must join students for school scope"
  );
  console.log("✓ Student, marks, and attendance lookups are school scoped");

  assert(
    controllerContent.includes("parseStudentId"),
    "Controller must validate studentId"
  );
  assert(parseStudentId("abc") === null, "Non-numeric studentId must be rejected");
  assert(parseStudentId("0") === null, "Zero studentId must be rejected");
  assert(parseStudentId("12") === 12, "Valid numeric studentId must parse");
  console.log("✓ studentId validation works");

  const adminParams = [42];
  const adminClause = buildSchoolClause("admin", 1, adminParams);
  assert(adminClause.includes("school_id"), "Admin must get school clause");
  assert(adminParams.length === 2, "Admin params must include school_id");

  const superParams = [42];
  const superClause = buildSchoolClause("super_admin", 1, superParams);
  assert(superClause === "", "super_admin must bypass school clause");
  assert(superParams.length === 1, "super_admin params must not add school_id");
  console.log("✓ buildSchoolClause matches student module pattern");

  assert(
    routesContent.includes("authenticate") && routesContent.includes("isAdminLike"),
    "Route must keep authenticate and isAdminLike"
  );
  assert(
    routesContent.includes("processPromotion"),
    "Route must wire processPromotion"
  );
  console.log("✓ Route wiring and auth unchanged");

  console.log("\nAll promotion hardening checks passed.");
};

run();
