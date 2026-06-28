const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const { authenticate, isAdminLike } = require("../middleware/auth");
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
  isAdminLike,
  validateRequest(subjectSchema),
  asyncHandler(createSubject)
);

router.get("/", authenticate, asyncHandler(getSubjects));

router.put(
  "/:id",
  authenticate,
  isAdminLike,
  validateRequest(subjectSchema),
  asyncHandler(updateSubject)
);

router.delete(
  "/:id",
  authenticate,
  isAdminLike,
  asyncHandler(deleteSubject)
);

module.exports = router;
