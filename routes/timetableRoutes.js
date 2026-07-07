const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const { authenticate } = require("../middleware/auth");
const authorize = require("../middleware/authorize");
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
  authorize("timetable.create"),
  validateRequest(timetableSchema),
  asyncHandler(createTimetable)
);

router.get("/", authenticate, authorize("timetable.read"), asyncHandler(getAllTimetables));
router.get(
  "/class/:classSectionId",
  authenticate,
  authorize("timetable.read_by_class"),
  asyncHandler(getTimetableByClass)
);
router.delete("/:id", authenticate, authorize("timetable.delete"), asyncHandler(deleteTimetable));

module.exports = router;
