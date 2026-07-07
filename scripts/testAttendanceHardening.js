/**
 * Verify Attendance Module P0/P1 hardening (RC).
 * Usage: node backend/scripts/testAttendanceHardening.js
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
  console.log("Attendance Module Hardening tests\n");

  const attendanceController = read("controllers/attendanceController.js");
  const attendanceRoutes = read("routes/attendanceRoutes.js");
  const attendanceValidator = read("validators/attendanceValidator.js");
  const tenantScope = read("utils/tenantScope.js");
  const dashboardRoutes = read("routes/dashboardRoutes.js");
  const dashboardController = read("controllers/dashboardController.js");
  const attendancePage = fs.readFileSync(
    path.join(__dirname, "..", "..", "frontend", "src", "pages", "attendance", "Attendance.jsx"),
    "utf8"
  );
  const studentController = read("controllers/studentController.js");

  assert(
    attendanceController.includes("ATTENDANCE_SCHOOL_ALIAS"),
    "getAttendance must use explicit attendance table alias for school scoping"
  );
  assert(
    attendanceController.includes("attendance.school_id = $1") ||
      attendanceController.includes("${ATTENDANCE_SCHOOL_ALIAS}.school_id"),
    "getAttendance must scope reads by attendance.school_id"
  );
  assert(
    !attendanceController.includes("buildSchoolClause(scope.role"),
    "attendanceController must not use buildSchoolClause with wrong default alias"
  );
  console.log("✓ P0: attendance queries use correct table alias");

  assert(
    tenantScope.includes("School context is required for this operation") &&
      !tenantScope.includes("isPlatformRole"),
    "resolveSchoolScope must require school context for all roles (X-School-Id / JWT)"
  );
  assert(
    attendanceController.includes("resolveSchoolScope"),
    "attendanceController must use resolveSchoolScope"
  );
  console.log("✓ P0: tenant scoping requires school context");

  assert(
    attendanceController.includes("verifyTeacherCanAccessStudent"),
    "attendanceController must enforce teacher assigned-class scope"
  );
  assert(
    attendanceController.includes("teacher_subject_assignments"),
    "teacher scope must join teacher_subject_assignments"
  );
  assert(
    attendanceController.includes("You can only mark attendance for your assigned classes"),
    "mark path must return 403 for unassigned students"
  );
  console.log("✓ P1: teachers limited to assigned classes");

  assert(
    attendanceRoutes.includes('"/bulk"') &&
      attendanceRoutes.includes("bulkSubmitAttendance") &&
      attendanceRoutes.includes("bulkAttendanceSchema"),
    "POST /api/attendance/bulk must be registered with validation"
  );
  assert(
    attendanceController.includes('client.query("BEGIN")') &&
      attendanceController.includes('client.query("COMMIT")') &&
      attendanceController.includes('client.query("ROLLBACK")'),
    "bulkSubmitAttendance must be transactional"
  );
  console.log("✓ P1: bulk submit is transactional");

  assert(
    attendanceValidator.includes('"Late"') &&
      attendancePage.includes('"Late"'),
    "API and UI must both include Late status"
  );
  assert(
    attendanceRoutes.includes("attendanceUpdateSchema"),
    "PUT /api/attendance/:id must validate body"
  );
  assert(
    attendanceController.includes("status(409)") ||
      attendanceController.includes("return res.status(409)"),
    "duplicate mark must return 409"
  );
  console.log("✓ P1: status alignment and validation");

  assert(
    dashboardRoutes.includes("status IN ('Present', 'Late')"),
    "dashboard summary must count Present + Late"
  );
  assert(
    dashboardController.includes("status IN ('Present', 'Late')"),
    "legacy dashboard must count Present + Late"
  );
  console.log("✓ P1: attendance percentage includes Present + Late");

  assert(
    attendanceController.includes("req.query.date") &&
      attendanceController.includes("req.query.student_class") &&
      attendanceController.includes("req.query.section"),
    "GET /api/attendance must support date/class/section filters"
  );
  assert(
    studentController.includes("req.query.student_class") &&
      studentController.includes("req.query.section"),
    "GET /api/students must support class/section filters"
  );
  assert(
    attendancePage.includes("/api/attendance/bulk") &&
      attendancePage.includes("student_class:") &&
      !attendancePage.includes("Promise.allSettled"),
    "Attendance UI must use bulk API and filtered loads"
  );
  console.log("✓ P1: improved loading strategy");

  require("../controllers/attendanceController");
  require("../routes/attendanceRoutes");
  require("../validators/attendanceValidator");
  console.log("✓ Modified modules load without import errors");

  console.log("\nAll attendance hardening checks passed.");
};

run().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
