const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const authorize = require("../middleware/authorize");
const { getCashbook } = require("../controllers/cashbookController");

router.get(
  "/",
  authenticate,
  authorize("finance.cashbook_legacy.read"),
  getCashbook
);

module.exports = router;
