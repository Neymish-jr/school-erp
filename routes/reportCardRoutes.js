const express = require("express");
const router = express.Router();

const {
  getReportCard
} = require("../controllers/reportCardController");

router.get("/:studentId", getReportCard);

module.exports = router;