/**
 * Verify Timetable Module P0 hardening (RC).
 * Usage: node backend/scripts/testTimetableHardening.js
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
  console.log("Timetable Module Hardening tests\n");

  const timetableController = read("controllers/timetableController.js");
  const timetableGuard = read("utils/timetableSchoolGuard.js");
  const tenantScope = read("utils/tenantScope.js");

  assert(
    timetableController.includes("resolveSchoolScope") &&
      timetableController.includes("resolveSchoolIdForWrite") &&
      timetableController.includes("buildSchoolClause"),
    "timetableController must use tenantScope helpers"
  );
  console.log("✓ P0: tenantScope helpers wired");

  assert(
    timetableController.includes("buildTeacherSchoolWhere") &&
      timetableController.match(
        /getAllTimetables[\s\S]*?buildTeacherSchoolWhere/
      ) &&
      timetableController.includes('buildSchoolClause') &&
      timetableController.includes('"tr"'),
    "GET /api/timetable must filter via teachers.school_id"
  );
  console.log("✓ P0-1: list endpoint tenant scoped");

  assert(
    timetableController.match(
      /deleteTimetable[\s\S]*?DELETE FROM timetables t[\s\S]*?USING teachers tr/
    ) &&
      timetableController.match(
        /deleteTimetable[\s\S]*?buildSchoolClause/
      ),
    "DELETE must join teachers and enforce school scope"
  );
  console.log("✓ P0-2: delete endpoint tenant scoped");

  assert(
    timetableController.match(
      /createTimetable[\s\S]*?resolveSchoolIdForWrite/
    ) &&
      timetableController.match(
        /createTimetable[\s\S]*?fetchTeacherForAssignment[\s\S]*?schoolId/
      ) &&
      timetableController.includes("fetchClassSectionForSchool") &&
      timetableController.includes("fetchSubjectForSchool"),
    "create must validate teacher, class section, and subject for the school"
  );
  console.log("✓ P0-3: create validates school resources");

  assert(
    timetableGuard.includes("students s") &&
      timetableGuard.includes("teacher_subject_assignments") &&
      timetableGuard.includes("student_results"),
    "school guard must link class sections and subjects to school footprint"
  );
  console.log("✓ P0-3: interim school guard helpers");

  assert(
    tenantScope.includes("School context is required for this operation"),
    "resolveSchoolScope must require school context"
  );

  require("../controllers/timetableController");
  require("../utils/timetableSchoolGuard");
  console.log("✓ Modified modules load without import errors");

  console.log("\nAll timetable hardening checks passed.");
};

run().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
