const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const { authenticate, isAdminLike, isTeacherOrAdminLike } = require("../middleware/auth");
const { validateRequest } = require("../middleware/validation");
const timetableSchema = require("../validators/timetableValidator");

const {
  createTimetable,
  getAllTimetables,
  getTimetableByClass,
  deleteTimetable,
} = require("../controllers/timetableController");

router.post(
  "/",
  authenticate,
  isAdminLike,
  validateRequest(timetableSchema),
  asyncHandler(createTimetable)
);

router.get("/", authenticate, isTeacherOrAdminLike, asyncHandler(getAllTimetables));
router.get(
  "/class/:classSectionId",
  authenticate,
  isTeacherOrAdminLike,
  asyncHandler(getTimetableByClass)
);
router.delete("/:id", authenticate, isAdminLike, asyncHandler(deleteTimetable));

module.exports = router;
