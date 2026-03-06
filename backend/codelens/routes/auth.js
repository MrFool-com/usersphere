// ══════════════════════════════════════════════════════
// CODELENS — routes/auth.js
// ══════════════════════════════════════════════════════
const express = require("express");
const router  = express.Router();
const { loginUser, getMe } = require("../controllers/authController");
const { verifyToken }      = require("../middleware/auth");

// POST /api/cl/auth/login
router.post("/login", loginUser);

// GET /api/cl/auth/me (protected)
router.get("/me", verifyToken, getMe);

module.exports = router;