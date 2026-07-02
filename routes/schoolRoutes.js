const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const { authenticate } = require("../middleware/auth");
const authorize = require("../middleware/authorize");
const { listSchools } = require("../controllers/schoolController");

router.get(
  "/",
  authenticate,
  authorize("system.school.read"),
  asyncHandler(listSchools)
);

module.exports = router;
