const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const { authenticate, isAdminLike } = require("../middleware/auth");
const {
  getAssignments,
  getEventById,
  getTeacherTimeline,
  getTeacherServiceBook,
  getTeacherTransferHistory,
  getTeacherDesignationHistory,
  getTeacherTenure,
} = require("../controllers/staffServiceHistoryController");

router.use(authenticate, isAdminLike);

router.get("/", asyncHandler(getAssignments));
router.get("/teacher/:teacherId/service-book", asyncHandler(getTeacherServiceBook));
router.get("/teacher/:teacherId/transfer-history", asyncHandler(getTeacherTransferHistory));
router.get("/teacher/:teacherId/designation-history", asyncHandler(getTeacherDesignationHistory));
router.get("/teacher/:teacherId/tenure", asyncHandler(getTeacherTenure));
router.get("/teacher/:teacherId", asyncHandler(getTeacherTimeline));
router.get("/:id", asyncHandler(getEventById));

module.exports = router;
