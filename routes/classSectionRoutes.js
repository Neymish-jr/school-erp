const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const { authenticate, isAdminLike } = require("../middleware/auth");
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
  isAdminLike,
  validateRequest(classSectionSchema),
  asyncHandler(createClassSection)
);
router.put(
  "/:id",
  authenticate,
  isAdminLike,
  validateRequest(classSectionSchema),
  asyncHandler(updateClassSection)
);
router.delete("/:id", authenticate, isAdminLike, asyncHandler(deleteClassSection));

module.exports = router;
