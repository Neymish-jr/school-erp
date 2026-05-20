const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const { validateRequest } = require("../middleware/validation");
const {
  activitySchema,
  activityStatusSchema
} = require("../validators/activityValidator");
const {
  getActivities,
  createActivity,
  updateActivityStatus,
  uploadActivityFile
} = require("../controllers/activityController");


router.get("/", getActivities);


router.post(
  "/",
  validateRequest(activitySchema),
  createActivity
);


router.put(
  "/:id/status",
  validateRequest(activityStatusSchema, { useTextResponse: true }),
  updateActivityStatus
);
router.post("/:id/upload", upload.single("file"), uploadActivityFile);

module.exports = router;