const express = require("express");
const router = express.Router();

const asyncHandler = require("../middleware/asyncHandler");
const { authenticate } = require("../middleware/auth");
const { getReportCard } = require("../controllers/reportCardController");

router.get("/:studentId", authenticate, asyncHandler(getReportCard));

module.exports = router;