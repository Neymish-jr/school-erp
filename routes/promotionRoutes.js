const express = require("express");
const router = express.Router();

const {
  processPromotion
} = require("../controllers/promotionController");

router.get("/:studentId", processPromotion);

module.exports = router;