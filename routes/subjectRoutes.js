const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const { authenticate } = require("../middleware/auth");
const authorize = require("../middleware/authorize");
const { validateRequest } = require("../middleware/validation");
const subjectSchema = require("../validators/subjectValidator");

const {
  createSubject,
  getSubjects,
  updateSubject,
  deleteSubject,
} = require("../controllers/subjectController");

router.post(
  "/",
  authenticate,
  authorize("subject.create"),
  validateRequest(subjectSchema),
  asyncHandler(createSubject)
);

router.get("/", authenticate, authorize("subject.read"), asyncHandler(getSubjects));

router.put(
  "/:id",
  authenticate,
  authorize("subject.update"),
  validateRequest(subjectSchema),
  asyncHandler(updateSubject)
);

router.delete(
  "/:id",
  authenticate,
  authorize("subject.delete"),
  asyncHandler(deleteSubject)
);

module.exports = router;
