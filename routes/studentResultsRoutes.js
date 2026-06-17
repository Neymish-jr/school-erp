const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const { validateRequest } = require("../middleware/validation");
const studentResultsSchema = require("../validators/studentResultsValidator");
const {
  createStudentResult,
  getStudentResults,
} = require("../controllers/studentResultsController");
const { authenticate, isTeacherOrAdminLike } = require("../middleware/auth");

router.post(
  "/",
  authenticate,
  isTeacherOrAdminLike,
  validateRequest(studentResultsSchema),
  asyncHandler(createStudentResult)
);

router.get("/", authenticate, isTeacherOrAdminLike, asyncHandler(getStudentResults));

module.exports = router;
