const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const { authenticate } = require("../middleware/auth");
const authorize = require("../middleware/authorize");
const {
  getAssignments,
  getEventById,
  getTeacherTimeline,
  getTeacherServiceBook,
  getTeacherTransferHistory,
  getTeacherDesignationHistory,
  getTeacherTenure,
} = require("../controllers/staffServiceHistoryController");

router.get(
  "/",
  authenticate,
  authorize("staff_service_history.read"),
  asyncHandler(getAssignments)
);
router.get(
  "/teacher/:teacherId/service-book",
  authenticate,
  authorize("staff_service_history.service_book.read"),
  asyncHandler(getTeacherServiceBook)
);
router.get(
  "/teacher/:teacherId/transfer-history",
  authenticate,
  authorize("staff_service_history.transfer.read"),
  asyncHandler(getTeacherTransferHistory)
);
router.get(
  "/teacher/:teacherId/designation-history",
  authenticate,
  authorize("staff_service_history.designation.read"),
  asyncHandler(getTeacherDesignationHistory)
);
router.get(
  "/teacher/:teacherId/tenure",
  authenticate,
  authorize("staff_service_history.tenure.read"),
  asyncHandler(getTeacherTenure)
);
router.get(
  "/teacher/:teacherId",
  authenticate,
  authorize("staff_service_history.read"),
  asyncHandler(getTeacherTimeline)
);
router.get(
  "/:id",
  authenticate,
  authorize("staff_service_history.read"),
  asyncHandler(getEventById)
);

module.exports = router;
