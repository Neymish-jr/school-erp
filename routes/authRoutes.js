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
const loginSchema = require("../validators/loginValidator");

router.post("/register", validateRegister, registerUser);
router.post(
  "/login",
  validateRequest(loginSchema, { useTextResponse: true }),
  loginUser
);

module.exports = router;
