const express = require("express");
const router = express.Router();

const {
  authenticate,
  isAdminLike
} = require("../middleware/auth");

const {
  processPromotion
} = require("../controllers/promotionController");

router.get(
  "/:studentId",
  authenticate,
  isAdminLike,
  processPromotion
);

module.exports = router;