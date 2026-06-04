const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const { authenticate } = require("../middleware/auth");
const roleMiddleware = require("../middleware/roleMiddleware");
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
  roleMiddleware("admin"),
  validateRequest(subjectSchema),
  asyncHandler(createSubject)
);

router.get("/", authenticate, asyncHandler(getSubjects));

router.put(
  "/:id",
  authenticate,
  roleMiddleware("admin"),
  validateRequest(subjectSchema),
  asyncHandler(updateSubject)
);

router.delete(
  "/:id",
  authenticate,
  roleMiddleware("admin"),
  asyncHandler(deleteSubject)
);

module.exports = router;