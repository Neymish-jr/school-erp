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
  isSuperAdmin
} = require("../middleware/auth");

const loginSchema = require("../validators/loginValidator");
const asyncHandler = require("../middleware/asyncHandler");

// Only Super Admin can create users
router.post(
  "/register",
  authenticate,
  isSuperAdmin,
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