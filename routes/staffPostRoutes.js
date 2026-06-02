const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const { authenticate, isAdmin } = require("../middleware/auth");
const { validateRequest } = require("../middleware/validation");
const { staffPostSchema } = require("../validators/staffPostValidator");

const {
  getStaffPosts,
  getStaffPostById,
  createStaffPost,
  updateStaffPost,
  deactivateStaffPost,
} = require("../controllers/staffPostController");

router.get("/", authenticate, asyncHandler(getStaffPosts));
router.get("/:id", authenticate, asyncHandler(getStaffPostById));
router.post(
  "/",
  authenticate,
  isAdmin,
  validateRequest(staffPostSchema),
  asyncHandler(createStaffPost)
);
router.put(
  "/:id",
  authenticate,
  isAdmin,
  validateRequest(staffPostSchema),
  asyncHandler(updateStaffPost)
);
router.delete("/:id", authenticate, isAdmin, asyncHandler(deactivateStaffPost));

module.exports = router;
