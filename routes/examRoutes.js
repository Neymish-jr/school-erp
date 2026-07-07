const express = require("express");
const router = express.Router();

const asyncHandler = require("../middleware/asyncHandler");
const { authenticate } = require("../middleware/auth");
const authorize = require("../middleware/authorize");
const { validateRequest } = require("../middleware/validation");
const examSchema = require("../validators/examValidator");

const {
  createExam,
  getExams
} = require("../controllers/examController");

router.post(
  "/",
  authenticate,
  authorize("exam.create"),
  validateRequest(examSchema),
  asyncHandler(createExam)
);

router.get("/", authenticate, authorize("exam.read"), asyncHandler(getExams));

module.exports = router;
