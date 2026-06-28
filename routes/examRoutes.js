const express = require("express");
const router = express.Router();

const asyncHandler = require("../middleware/asyncHandler");
const { authenticate, isAdminLike } = require("../middleware/auth");
const { validateRequest } = require("../middleware/validation");
const examSchema = require("../validators/examValidator");

const {
  createExam,
  getExams
} = require("../controllers/examController");

router.post("/", authenticate, isAdminLike, validateRequest(examSchema), asyncHandler(createExam));

router.get("/", authenticate, asyncHandler(getExams));

module.exports = router;