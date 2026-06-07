const express = require("express");
const router = express.Router();

const asyncHandler = require("../middleware/asyncHandler");
const { authenticate, isAdmin } = require("../middleware/auth");
const { validateRequest } = require("../middleware/validation");

const { staffPostSchema } = require("../validators/staffPostValidator");

const {
  getAllStaffPosts,
  getStaffPostById,
  createStaffPost,
  updateStaffPost,
  deleteStaffPost,
} = require("../controllers/staffPostController");

router.get(
  "/",
  authenticate,
  asyncHandler(getAllStaffPosts)
);

router.get(
  "/:id",
  authenticate,
  asyncHandler(getStaffPostById)
);

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

router.delete(
  "/:id",
  authenticate,
  isAdmin,
  asyncHandler(deleteStaffPost)
);

module.exports = router;