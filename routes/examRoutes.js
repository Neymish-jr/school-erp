const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const { authenticate } = require("../middleware/auth");

const {
  createExam,
  getExams
} = require("../controllers/examController");

router.post("/", authenticate, asyncHandler(createExam));

router.get("/", authenticate, asyncHandler(getExams));

module.exports = router;