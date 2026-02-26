const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const User = require("../models/User");
const AdminLog = require("../models/AdminLog");

router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // 1️⃣ user details
    const user = await User.findById(userId)
      .select("name role createdAt lastLogin");

    // 2️⃣ recent admin actions on this user
    const activities = await AdminLog.find({
      targetUserId: userId
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("action createdAt");

    const totalActivities = await AdminLog.countDocuments({
      targetUserId: userId
    });

    res.json({
      user,
      recentActivities: activities,
      totalActivities
    });

  } catch (err) {
    res.status(500).json({ message: "Dashboard load failed" });
  }
});


module.exports = router;
