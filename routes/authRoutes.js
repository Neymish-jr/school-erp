const express = require("express");
const router = express.Router();

const {
  registerUser,
  loginUser
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

module.exports = router;