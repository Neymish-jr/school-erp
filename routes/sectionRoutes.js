const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const { authenticate } = require("../middleware/auth");
const authorize = require("../middleware/authorize");
const { validateRequest } = require("../middleware/validation");
const sectionSchema = require("../validators/sectionValidator");

const {
  createSection,
  getSections
} = require("../controllers/sectionController");

router.post(
  "/",
  authenticate,
  authorize("section.create"),
  validateRequest(sectionSchema),
  asyncHandler(createSection)
);

router.get("/", authenticate, authorize("section.read"), asyncHandler(getSections));

module.exports = router;
