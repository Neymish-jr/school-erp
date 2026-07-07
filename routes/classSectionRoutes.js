const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const { authenticate } = require("../middleware/auth");
const authorize = require("../middleware/authorize");
const { validateRequest } = require("../middleware/validation");
const classSectionSchema = require("../validators/classSectionValidator");

const {
  getClassSections,
  createClassSection,
  updateClassSection,
  deleteClassSection,
} = require("../controllers/classSectionController");

router.get("/", authenticate, authorize("class_section.read"), asyncHandler(getClassSections));
router.post(
  "/",
  authenticate,
  authorize("class_section.create"),
  validateRequest(classSectionSchema),
  asyncHandler(createClassSection)
);
router.put(
  "/:id",
  authenticate,
  authorize("class_section.update"),
  validateRequest(classSectionSchema),
  asyncHandler(updateClassSection)
);
router.delete(
  "/:id",
  authenticate,
  authorize("class_section.delete"),
  asyncHandler(deleteClassSection)
);

module.exports = router;
