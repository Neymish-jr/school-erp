const express = require("express");
const router = express.Router();

const { authenticate } = require("../middleware/auth");
const authorize = require("../middleware/authorize");

const {
  processPromotion
} = require("../controllers/promotionController");

router.get(
  "/:studentId",
  authenticate,
  authorize("student.promotion.execute"),
  processPromotion
);

module.exports = router;
