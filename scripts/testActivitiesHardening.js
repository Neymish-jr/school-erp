/**
 * Verify Activities Module P1 hardening (RC).
 * Usage: node backend/scripts/testActivitiesHardening.js
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
  console.log("Activities Module Hardening tests\n");

  const activityRoutes = read("routes/activityRoutes.js");
  const activityController = read("controllers/activityController.js");
  const activityService = read("services/activityService.js");
  const activityValidator = read("validators/activityValidator.js");
  const activityStatus = read("constants/activityStatus.js");
  const activitiesPage = fs.readFileSync(
    path.join(__dirname, "..", "..", "frontend", "src", "pages", "activities", "Activities.jsx"),
    "utf8"
  );
  const activityDetailPage = fs.readFileSync(
    path.join(
      __dirname,
      "..",
      "..",
      "frontend",
      "src",
      "pages",
      "activities",
      "ActivityDetail.jsx"
    ),
    "utf8"
  );
  const activitiesApi = fs.readFileSync(
    path.join(__dirname, "..", "..", "frontend", "src", "api", "activities.js"),
    "utf8"
  );

  assert(
    activityRoutes.includes('authorize("finance.activity.update")') &&
      activityRoutes.includes("activityUpdateSchema") &&
      activityRoutes.includes("updateActivity"),
    "PUT /api/activities/:id must use finance.activity.update with validation"
  );
  assert(
    activityRoutes.includes("budget-availability") &&
      activityRoutes.includes("getActivityAllocationAvailability"),
    "budget availability endpoint must be registered"
  );
  console.log("✓ P1-1: draft edit API wired with finance.activity.update");

  assert(
    activityService.includes("updateActivity") &&
      activityService.includes("EDITABLE_ACTIVITY_STATUSES") &&
      activityService.includes("Only draft or rejected activities can be edited"),
    "service must restrict edits to draft/rejected"
  );
  console.log("✓ P1-1: editable status enforcement");

  assert(
    !activityDetailPage.includes("Promise.all") &&
      activityDetailPage.includes("timelineUnavailable") &&
      activityDetailPage.includes("Timeline is not available for your role"),
    "detail page must load timeline safely without breaking the page"
  );
  console.log("✓ P1-3: office staff detail page degrades timeline gracefully");

  assert(
    activityService.includes("assertActivityBudgetWithinAllocation") &&
      activityService.includes("getActivityAllocationAvailability") &&
      activityService.includes("expense_committed") &&
      activityService.includes("activity_committed"),
    "backend must validate allocated_budget against allocation availability"
  );
  assert(
    activitiesPage.includes("fetchActivityAllocationAvailability") &&
      activitiesPage.includes("Available for this allocation"),
    "frontend must validate/show allocation availability"
  );
  console.log("✓ P1-4: budget validation backend + frontend");

  assert(
    activityService.includes("SUBMITTABLE_ACTIVITY_STATUSES") &&
      activityService.includes("Only draft or rejected activities can be submitted") &&
      activityService.includes("rejection_remarks = NULL"),
    "rejected activities must be resubmittable"
  );
  assert(
    activitiesPage.includes("Resubmit") &&
      activityDetailPage.includes("Resubmit"),
    "UI must expose resubmit for rejected activities"
  );
  console.log("✓ P1-5: rejected edit + resubmit workflow");

  assert(
    activitiesApi.includes("updateActivity") &&
      activitiesApi.includes("fetchActivityAllocationAvailability"),
    "API client must expose update and budget availability"
  );

  require("../controllers/activityController");
  require("../routes/activityRoutes");
  require("../services/activityService");
  console.log("✓ Modified modules load without import errors");

  console.log("\nAll activities hardening checks passed.");
};

run().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
