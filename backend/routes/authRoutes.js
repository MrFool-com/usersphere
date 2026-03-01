const express = require("express");
const router  = express.Router();

const {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
  verifyOtp
} = require("../controllers/authController");

const {
  loginLimiter,
  signupLimiter,
  otpLimiter,
  forgotPasswordLimiter,
} = require("../middleware/rateLimiter");

router.post("/register",              signupLimiter,         registerUser);
router.post("/login",                 loginLimiter,          loginUser);
router.post("/verify-otp",            otpLimiter,            verifyOtp);
router.post("/forgot-password",       forgotPasswordLimiter, forgotPassword);
router.post("/reset-password/:token",                        resetPassword);

module.exports = router;