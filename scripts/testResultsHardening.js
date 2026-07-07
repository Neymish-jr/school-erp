/**
 * Verify Results Module P0 hardening (RC).
 * Usage: node backend/scripts/testResultsHardening.js
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
  console.log("Results Module Hardening tests\n");

  const studentResultsRoutes = read("routes/studentResultsRoutes.js");
  const studentResultsController = read("controllers/studentResultsController.js");
  const reportCardController = read("controllers/reportCardController.js");
  const promotionController = read("controllers/promotionController.js");
  const assessmentResults = read("constants/assessmentResults.js");
  const resultsPage = fs.readFileSync(
    path.join(
      __dirname,
      "..",
      "..",
      "frontend",
      "src",
      "pages",
      "results",
      "Results.jsx"
    ),
    "utf8"
  );

  assert(
    studentResultsRoutes.includes('authorize("result.create")') &&
      studentResultsRoutes.includes('authorize("result.read")') &&
      !studentResultsRoutes.includes("board_exam.result.create") &&
      !studentResultsRoutes.includes("board_exam.result.read"),
    "student-results routes must use result.create and result.read"
  );
  console.log("✓ P0-1: RBAC alignment on student-results routes");

  assert(
    promotionController.includes("FROM student_results sr") &&
      promotionController.match(
        /fetchStudentAssessmentRows[\s\S]*?FROM student_results sr[\s\S]*?FROM marks m/
      ) &&
      promotionController.includes("total_marks AS max_marks"),
    "promotion must read student_results first and fall back to legacy marks"
  );
  console.log("✓ P0-2: promotion compatibility");

  assert(
    assessmentResults.includes("PASS_MARK_PERCENTAGE") &&
      studentResultsController.includes('../constants/assessmentResults') &&
      reportCardController.includes('../constants/assessmentResults') &&
      promotionController.includes('../constants/assessmentResults') &&
      !studentResultsController.includes("percentage >= 40") &&
      !reportCardController.includes("percentage >= 45") &&
      !promotionController.includes("percentage < 40"),
    "pass threshold must come from shared assessmentResults constants"
  );
  assert(
    resultsPage.includes("constants/assessmentResults") &&
      resultsPage.includes("getResultStatus") &&
      !resultsPage.includes("percentage >= 40"),
    "Results UI preview must use shared pass threshold helpers"
  );
  console.log("✓ P0-3: single pass threshold module");

  const {
    PASS_MARK_PERCENTAGE,
    getResultStatus,
    getGrade,
    isPassingPercentage,
  } = require("../constants/assessmentResults");

  assert(PASS_MARK_PERCENTAGE === 40, "PASS_MARK_PERCENTAGE must be 40");
  assert(getResultStatus(40) === "Pass", "40% must pass");
  assert(getResultStatus(39.9) === "Fail", "below threshold must fail");
  assert(getGrade(40) === "C", "minimum passing grade must align with pass threshold");
  assert(isPassingPercentage(40), "isPassingPercentage must match getResultStatus");
  console.log("✓ assessmentResults constants behave consistently");

  require("../routes/studentResultsRoutes");
  require("../controllers/studentResultsController");
  require("../controllers/reportCardController");
  require("../controllers/promotionController");
  console.log("✓ Modified modules load without import errors");

  console.log("\nAll results hardening checks passed.");
};

run().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
