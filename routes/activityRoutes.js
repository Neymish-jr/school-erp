const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const asyncHandler = require("../middleware/asyncHandler");
const { validateRequest } = require("../middleware/validation");
const { authenticate } = require("../middleware/auth");
const authorize = require("../middleware/authorize");
const {
  activitySchema,
  activityUpdateSchema,
  activityStatusSchema,
  activityRejectSchema,
} = require("../validators/activityValidator");
const {
  getActivities,
  getActivityDashboard,
  getActivityById,
  getActivityTimeline,
  createActivity,
  updateActivity,
  getActivityAllocationAvailability,
  submitActivity,
  approveActivity,
  rejectActivity,
  completeActivity,
  updateActivityStatus,
  uploadActivityFile,
} = require("../controllers/activityController");

router.get(
  "/dashboard",
  authenticate,
  authorize("finance.activity.read_dashboard"),
  asyncHandler(getActivityDashboard)
);
router.get("/", authenticate, authorize("finance.activity.read"), asyncHandler(getActivities));

router.post(
  "/",
  authenticate,
  authorize("finance.activity.create"),
  validateRequest(activitySchema),
  asyncHandler(createActivity)
);

router.get(
  "/allocation/:allocationId/budget-availability",
  authenticate,
  authorize("finance.activity.read"),
  asyncHandler(getActivityAllocationAvailability)
);

router.get(
  "/:id/timeline",
  authenticate,
  authorize("finance.activity.read_timeline"),
  asyncHandler(getActivityTimeline)
);
router.get("/:id", authenticate, authorize("finance.activity.read"), asyncHandler(getActivityById));

router.put(
  "/:id",
  authenticate,
  authorize("finance.activity.update"),
  validateRequest(activityUpdateSchema),
  asyncHandler(updateActivity)
);

router.put(
  "/:id/submit",
  authenticate,
  authorize("finance.activity.submit"),
  asyncHandler(submitActivity)
);
router.put(
  "/:id/approve",
  authenticate,
  authorize("finance.activity.approve"),
  asyncHandler(approveActivity)
);
router.put(
  "/:id/reject",
  authenticate,
  authorize("finance.activity.reject"),
  validateRequest(activityRejectSchema),
  asyncHandler(rejectActivity)
);
router.put(
  "/:id/complete",
  authenticate,
  authorize("finance.activity.complete"),
  asyncHandler(completeActivity)
);

router.put(
  "/:id/status",
  authenticate,
  authorize("finance.activity.update_status"),
  validateRequest(activityStatusSchema, { useTextResponse: true }),
  asyncHandler(updateActivityStatus)
);

router.post(
  "/:id/upload",
  authenticate,
  authorize("finance.activity.upload"),
  upload.single("file"),
  asyncHandler(uploadActivityFile)
);

module.exports = router;
