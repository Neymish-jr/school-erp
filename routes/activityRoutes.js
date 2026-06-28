const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const asyncHandler = require("../middleware/asyncHandler");
const { validateRequest } = require("../middleware/validation");
const {
  authenticate,
  isAdminLike,
  isTeacherOrAdminLike,
} = require("../middleware/auth");
const {
  activitySchema,
  activityStatusSchema,
  activityRejectSchema,
} = require("../validators/activityValidator");
const {
  getActivities,
  getActivityDashboard,
  getActivityById,
  getActivityTimeline,
  createActivity,
  submitActivity,
  approveActivity,
  rejectActivity,
  completeActivity,
  updateActivityStatus,
  uploadActivityFile,
} = require("../controllers/activityController");

router.get("/dashboard", authenticate, asyncHandler(getActivityDashboard));
router.get("/", authenticate, asyncHandler(getActivities));

router.post(
  "/",
  authenticate,
  isTeacherOrAdminLike,
  validateRequest(activitySchema),
  asyncHandler(createActivity)
);

router.get("/:id/timeline", authenticate, asyncHandler(getActivityTimeline));
router.get("/:id", authenticate, asyncHandler(getActivityById));

router.put("/:id/submit", authenticate, isTeacherOrAdminLike, asyncHandler(submitActivity));
router.put("/:id/approve", authenticate, isAdminLike, asyncHandler(approveActivity));
router.put(
  "/:id/reject",
  authenticate,
  isAdminLike,
  validateRequest(activityRejectSchema),
  asyncHandler(rejectActivity)
);
router.put("/:id/complete", authenticate, isTeacherOrAdminLike, asyncHandler(completeActivity));

router.put(
  "/:id/status",
  authenticate,
  isAdminLike,
  validateRequest(activityStatusSchema, { useTextResponse: true }),
  asyncHandler(updateActivityStatus)
);

router.post(
  "/:id/upload",
  authenticate,
  isTeacherOrAdminLike,
  upload.single("file"),
  asyncHandler(uploadActivityFile)
);

module.exports = router;
