const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const { authenticate } = require("../middleware/auth");
const authorize = require("../middleware/authorize");
const { validateRequest } = require("../middleware/validation");
const classSchema = require("../validators/classValidator");

const {
  getClasses,
  createClass
} = require("../controllers/classController");

router.post(
  "/",
  authenticate,
  authorize("class.create"),
  validateRequest(classSchema),
  asyncHandler(createClass)
);

router.get("/", authenticate, authorize("class.read"), asyncHandler(getClasses));

module.exports = router;
