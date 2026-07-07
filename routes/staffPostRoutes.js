const express = require("express");
const router = express.Router();

const asyncHandler = require("../middleware/asyncHandler");
const { authenticate } = require("../middleware/auth");
const authorize = require("../middleware/authorize");
const { validateRequest } = require("../middleware/validation");

const { staffPostSchema } = require("../validators/staffPostValidator");

const {
  getAllStaffPosts,
  getStaffPostById,
  createStaffPost,
  updateStaffPost,
  deleteStaffPost,
} = require("../controllers/staffPostController");

router.get("/", authenticate, authorize("staff_post.read"), asyncHandler(getAllStaffPosts));

router.get("/:id", authenticate, authorize("staff_post.read"), asyncHandler(getStaffPostById));

router.post(
  "/",
  authenticate,
  authorize("staff_post.create"),
  validateRequest(staffPostSchema),
  asyncHandler(createStaffPost)
);

router.put(
  "/:id",
  authenticate,
  authorize("staff_post.update"),
  validateRequest(staffPostSchema),
  asyncHandler(updateStaffPost)
);

router.delete(
  "/:id",
  authenticate,
  authorize("staff_post.delete"),
  asyncHandler(deleteStaffPost)
);

module.exports = router;
