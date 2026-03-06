// ══════════════════════════════════════════════════════
// CODELENS — controllers/authController.js
// ══════════════════════════════════════════════════════
const User   = require("../../models/User"); // UserSphere ka shared User model
const bcrypt = require("bcryptjs");
const jwt    = require("jsonwebtoken");

// POST /api/cl/auth/login
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password required." });
    }

    // UserSphere ke database se user dhundo
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials." });
    }

    // Password match karo
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials." });
    }

    // Email verified check (UserSphere ka system)
    if (user.isVerified === false) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email first (via UserSphere)."
      });
    }

    // JWT token banao — same secret as UserSphere
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Last login update karo
    user.lastLogin = new Date();
    await user.save();

    return res.status(200).json({
      success: true,
      token,
      user: {
        id:    user._id,
        name:  user.name,
        email: user.email,
        role:  user.role
      }
    });

  } catch (err) {
    console.error("CodeLens Login error:", err.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// GET /api/cl/auth/me (protected)
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    return res.json({ success: true, user });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error." });
  }
};