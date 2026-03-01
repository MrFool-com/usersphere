const rateLimit = require("express-rate-limit");

// =============================================
// Helper: standard rate limit response
// =============================================
const handler = (message) => (req, res) => {
  res.status(429).json({ message });
};

// =============================================
// LOGIN — 5 attempts per 15 minutes
// =============================================
exports.loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: handler("Too many login attempts. Please try again after 15 minutes."),
});

// =============================================
// SIGNUP — 3 attempts per hour
// =============================================
exports.signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  handler: handler("Too many signup attempts. Please try again after an hour."),
});

// =============================================
// OTP VERIFY — 5 attempts per 10 minutes
// =============================================
exports.otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: handler("Too many OTP attempts. Please request a new code and try again."),
});

// =============================================
// FORGOT PASSWORD — 3 attempts per hour
// =============================================
exports.forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  handler: handler("Too many password reset requests. Please try again after an hour."),
});