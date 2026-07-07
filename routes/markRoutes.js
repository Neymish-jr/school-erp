const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const { validateRequest } = require("../middleware/validation");
const markSchema = require("../validators/markValidator");

const {
  createMark,
  getMarks
} = require("../controllers/markController");

const { authenticate } = require("../middleware/auth");
const authorize = require("../middleware/authorize");

router.post(
  "/",
  authenticate,
  authorize("mark.create"),
  validateRequest(markSchema),
  asyncHandler(createMark)
);

router.get("/", authenticate, authorize("mark.read"), asyncHandler(getMarks));

module.exports = router;
