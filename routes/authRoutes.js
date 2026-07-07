const express = require("express");
const router = express.Router();

const {
  registerUser,
  loginUser,
  getMyPermissions,
} = require("../controllers/authController");

const {
  validateRegister,
  validateRequest
} = require("../middleware/validation");

const {
  authenticate,
} = require("../middleware/auth");
const authorize = require("../middleware/authorize");

const loginSchema = require("../validators/loginValidator");
const asyncHandler = require("../middleware/asyncHandler");

// Only Super Admin can create users
router.post(
  "/register",
  authenticate,
  authorize("user.register"),
  validateRegister,
  registerUser
);

router.post(
  "/login",
  validateRequest(loginSchema, { useTextResponse: true }),
  loginUser
);

router.get("/permissions", authenticate, asyncHandler(getMyPermissions));

module.exports = router;