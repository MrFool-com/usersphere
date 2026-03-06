// ══════════════════════════════════════════════════════
// CODELENS — routes/review.js
// ══════════════════════════════════════════════════════
const express   = require("express");
const router    = express.Router();
const rateLimit = require("express-rate-limit");
const { verifyToken }                 = require("../middleware/auth");
const { reviewCode, fetchGitHubCode } = require("../controllers/reviewController");

// ─── REVIEW-SPECIFIC RATE LIMITER ─────────────────────────────────────────
const reviewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: "Review limit reached. Max 20 reviews per 15 minutes."
  }
});

// ─── GITHUB FETCH RATE LIMITER ────────────────────────────────────────────
const githubLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  message: {
    success: false,
    message: "GitHub fetch limit reached. Please wait."
  }
});

// POST /api/cl/review/code  → Submit code for review (Protected)
router.post("/code",   verifyToken, reviewLimiter, reviewCode);

// POST /api/cl/review/github  → Fetch code from GitHub (Protected)
router.post("/github", verifyToken, githubLimiter, fetchGitHubCode);

module.exports = router;