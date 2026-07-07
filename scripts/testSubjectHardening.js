/**
 * Verify Subjects module hardening (safe delete guards).
 * Usage: node backend/scripts/testSubjectHardening.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const fs = require("fs");
const path = require("path");

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const controllerPath = path.join(
  __dirname,
  "..",
  "controllers",
  "subjectController.js"
);
const routesPath = path.join(__dirname, "..", "routes", "subjectRoutes.js");

const run = async () => {
  console.log("Subjects Module Hardening tests\n");

  const controllerSource = fs.readFileSync(controllerPath, "utf8");
  const routesSource = fs.readFileSync(routesPath, "utf8");

  const requiredTables = [
    "teacher_subject_assignments",
    "timetables",
    "student_results",
    "marks",
    "staff_service_history",
  ];

  for (const table of requiredTables) {
    assert(
      controllerSource.includes(table),
      `deleteSubject guard must reference ${table}`
    );
  }
  console.log("✓ deleteSubject checks all required referencing tables");

  assert(
    controllerSource.includes(
      "This subject is already in use and cannot be deleted. Deactivate it instead."
    ),
    "deleteSubject must return the standard in-use conflict message"
  );
  console.log("✓ deleteSubject uses standard 409 conflict message");

  assert(
    !controllerSource.includes("AND is_active = TRUE"),
    "deleteSubject must not limit assignment checks to active rows only"
  );
  console.log("✓ deleteSubject includes historical teacher subject assignments");

  assert(
    routesSource.includes('authorize("subject.delete")'),
    "subject delete route must use subject.delete permission"
  );
  console.log("✓ subjectRoutes delete uses permission-based authorize()");

  const {
    SUBJECT_REFERENCE_TABLES,
    findSubjectReferenceTables,
  } = require("../controllers/subjectController");

  assert(
    SUBJECT_REFERENCE_TABLES.length === requiredTables.length,
    "SUBJECT_REFERENCE_TABLES must list every guard table"
  );
  console.log("✓ SUBJECT_REFERENCE_TABLES exported for maintenance");

  const referencedTables = await findSubjectReferenceTables(-1);
  assert(
    Array.isArray(referencedTables) && referencedTables.length === 0,
    "non-existent subject id should have no references"
  );
  console.log("✓ findSubjectReferenceTables runs against the database");

  console.log("\nAll subject hardening checks passed.");
};

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
