// =======================
// GET PROFILE
// =======================
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password -emailOtp -emailOtpExpire -resetPasswordToken -resetPasswordExpire");
    if (!user) return res.status(404).json({ message: "User not found." });
    res.json({ user });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

const User   = require("../models/User");
const bcrypt = require("bcryptjs");

// =======================
// UPDATE NAME
// =======================
exports.updateName = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ message: "Name must be at least 2 characters." });
    }

    await User.findByIdAndUpdate(req.user.id, { name: name.trim() });

    res.json({ message: "Name updated successfully." });
  } catch (error) {
    console.error("Update name error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// =======================
// UPDATE PASSWORD
// =======================
exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "All fields are required." });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: "New password must be at least 8 characters." });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect." });
    }

    // Same password check
    const isSame = await bcrypt.compare(newPassword, user.password);
    if (isSame) {
      return res.status(400).json({ message: "New password must be different from current." });
    }

    // Hash & save
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("Update password error:", error);
    res.status(500).json({ message: "Server error." });
  }
};