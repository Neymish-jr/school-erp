const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const { authenticate } = require("../middleware/auth");
const { validateRequest } = require("../middleware/validation");
const classSectionSchema = require("../validators/classSectionValidator");

const {
  getClassSections,
  createClassSection,
  updateClassSection,
  deleteClassSection,
} = require("../controllers/classSectionController");

router.get("/", authenticate, asyncHandler(getClassSections));
router.post(
  "/",
  authenticate,
  validateRequest(classSectionSchema),
  asyncHandler(createClassSection)
);
router.put(
  "/:id",
  authenticate,
  validateRequest(classSectionSchema),
  asyncHandler(updateClassSection)
);
router.delete("/:id", authenticate, asyncHandler(deleteClassSection));

module.exports = router;
