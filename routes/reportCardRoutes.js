const express = require("express");
const router = express.Router();

const asyncHandler = require("../middleware/asyncHandler");
const { authenticate } = require("../middleware/auth");
const authorize = require("../middleware/authorize");
const { getReportCard } = require("../controllers/reportCardController");

router.get(
  "/:studentId",
  authenticate,
  authorize("report_card.read"),
  asyncHandler(getReportCard)
);

module.exports = router;
