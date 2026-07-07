const express = require("express");
const router = express.Router();
const {
  authenticate,
} = require("../middleware/auth");
const authorize = require("../middleware/authorize");
const asyncHandler = require("../middleware/asyncHandler");

const {
  getStudents,
  createStudent,
  getStudentById,
  updateStudent,
  deleteStudent
} = require("../controllers/studentController");

router.get(
  "/",
  authenticate,
  authorize("student.read"),
  asyncHandler(getStudents)
);

router.get(
  "/:id",
  authenticate,
  authorize("student.read"),
  asyncHandler(getStudentById)
);

router.post(
  "/",
  authenticate,
  authorize("student.create"),
  asyncHandler(createStudent)
);

router.put(
  "/:id",
  authenticate,
  authorize("student.update"),
  asyncHandler(updateStudent)
);

router.delete(
  "/:id",
  authenticate,
  authorize("student.delete"),
  asyncHandler(deleteStudent)
);

module.exports = router;
