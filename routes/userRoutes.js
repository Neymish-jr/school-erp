const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const { authenticate, isAdminLike } = require("../middleware/auth");
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
  isAdminLike,
  asyncHandler(getUserTeacherLink)
);

router.put(
  "/:userId/teacher-link",
  authenticate,
  isAdminLike,
  validateRequest(linkUserTeacherSchema),
  asyncHandler(putUserTeacherLink)
);

router.delete(
  "/:userId/teacher-link",
  authenticate,
  isAdminLike,
  asyncHandler(deleteUserTeacherLink)
);

module.exports = router;
