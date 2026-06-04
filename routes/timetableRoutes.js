const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const { authenticate, isAdmin, isTeacherOrAdmin } = require("../middleware/auth");
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
  isAdmin,
  validateRequest(timetableSchema),
  asyncHandler(createTimetable)
);

router.get("/", authenticate, isTeacherOrAdmin, asyncHandler(getAllTimetables));
router.get(
  "/class/:classSectionId",
  authenticate,
  isTeacherOrAdmin,
  asyncHandler(getTimetableByClass)
);
router.delete("/:id", authenticate, isAdmin, asyncHandler(deleteTimetable));

module.exports = router;
