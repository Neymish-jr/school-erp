const express = require("express");
const {
  getAllStaffPosts,
  getStaffPostById,
  createStaffPost,
  updateStaffPost,
  deleteStaffPost,
} = require("../controllers/staffPostController");
const { protect, authorize } = require("../middleware/auth");
const { validate } = require("../middleware/validation");
const {
  createStaffPostValidation,
  updateStaffPostValidation,
  getStaffPostByIdValidation,
  deleteStaffPostValidation,
} = require("../validators/staffPostValidator");

const router = express.Router();

router
  .route("/")
  .get(protect, authorize(["admin", "staff"]), getAllStaffPosts)
  .post(protect, authorize(["admin"]), validate(createStaffPostValidation), createStaffPost);

router
  .route("/:id")
  .get(protect, authorize(["admin", "staff"]), validate(getStaffPostByIdValidation), getStaffPostById)
  .put(protect, authorize(["admin"]), validate(updateStaffPostValidation), updateStaffPost)
  .delete(protect, authorize(["admin"]), validate(deleteStaffPostValidation), deleteStaffPost);

module.exports = router;
