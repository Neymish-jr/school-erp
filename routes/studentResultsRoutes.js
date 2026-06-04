const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const { validateRequest } = require("../middleware/validation");
const studentResultsSchema = require("../validators/studentResultsValidator");
const {
  createStudentResult,
  getStudentResults,
} = require("../controllers/studentResultsController");
const { authenticate, isTeacherOrAdmin } = require("../middleware/auth");

router.post(
  "/",
  authenticate,
  isTeacherOrAdmin,
  validateRequest(studentResultsSchema),
  asyncHandler(createStudentResult)
);

router.get("/", authenticate, isTeacherOrAdmin, asyncHandler(getStudentResults));

module.exports = router;
