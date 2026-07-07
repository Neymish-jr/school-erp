const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const { validateRequest } = require("../middleware/validation");
const studentResultsSchema = require("../validators/studentResultsValidator");
const {
  createStudentResult,
  getStudentResults,
} = require("../controllers/studentResultsController");
const { authenticate } = require("../middleware/auth");
const authorize = require("../middleware/authorize");

router.post(
  "/",
  authenticate,
  authorize("result.create"),
  validateRequest(studentResultsSchema),
  asyncHandler(createStudentResult)
);

router.get(
  "/",
  authenticate,
  authorize("result.read"),
  asyncHandler(getStudentResults)
);

module.exports = router;
