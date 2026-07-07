const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const { authenticate } = require("../middleware/auth");
const authorize = require("../middleware/authorize");
const { validateRequest } = require("../middleware/validation");
const { linkUserTeacherSchema } = require("../validators/userTeacherLinkValidator");
const {
  getUserTeacherLink,
  putUserTeacherLink,
  deleteUserTeacherLink,
} = require("../controllers/userTeacherLinkController");

router.get(
  "/:userId/teacher-link",
  authenticate,
  authorize("user.teacher_link.read"),
  asyncHandler(getUserTeacherLink)
);

router.put(
  "/:userId/teacher-link",
  authenticate,
  authorize("user.teacher_link.update"),
  validateRequest(linkUserTeacherSchema),
  asyncHandler(putUserTeacherLink)
);

router.delete(
  "/:userId/teacher-link",
  authenticate,
  authorize("user.teacher_link.delete"),
  asyncHandler(deleteUserTeacherLink)
);

module.exports = router;
