const express = require("express");
const router = express.Router();
const User = require("../models/User");
const AdminLog = require("../models/AdminLog");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const mongoose = require("mongoose");

// ===============================
// ADMIN STATS
// ===============================
router.get("/stats", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
const totalAdmins = await User.countDocuments({ role: "admin" });
const totalSuperAdmins = await User.countDocuments({ role: "superadmin" });
const totalLogs = await AdminLog.countDocuments();

const dbStatus = mongoose.connection.readyState === 1
  ? "All systems operational"
  : "Database connection issue";

res.json({
  system: {
    status: dbStatus
  },
  
  stats: {
    totalUsers,
    totalAdmins,
    totalSuperAdmins,
    totalLogs
  }
});

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ===============================
// GET ALL USERS
// ===============================
router.get("/users", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ===============================
// DELETE USER
// ===============================
router.delete("/users/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    // no one can delete himself
    if (req.user.id === req.params.id) {
      return res.status(400).json({
        message: "You cannot delete your own account"
      });
    }

    const targetUser = await User.findById(req.params.id);

    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // ADMIN restrictions
    if (req.user.role === "admin") {
      if (targetUser.role !== "user") {
        return res.status(403).json({
          message: "Admins can delete users only"
        });
      }
    }

    // SUPERADMIN can delete user + admin (but not himself, already checked)

    await User.findByIdAndDelete(req.params.id);

    await AdminLog.create({
      adminId: req.user.id,
      action: "Deleted user",
      targetUserId: req.params.id
    });

    res.json({ message: "User deleted successfully" });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});


// ===============================
// CHANGE ROLE (🔥 THIS WAS MISSING)
// ===============================
router.patch(
  "/users/:id/role",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { role } = req.body;

      if (!["user", "admin", "superadmin"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      // no one can change own role
      if (req.user.id === req.params.id) {
        return res.status(400).json({
          message: "You cannot change your own role"
        });
      }

      const targetUser = await User.findById(req.params.id);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // ADMIN restrictions
      if (req.user.role === "admin") {
        // admin cannot touch superadmin
        if (targetUser.role === "superadmin") {
          return res.status(403).json({
            message: "Admins cannot change superadmin role"
          });
        }

        // admin also cannot assign superadmin
        if (role === "superadmin") {
          return res.status(403).json({
            message: "Admins cannot promote to superadmin"
          });
        }
      }

      // SUPERADMIN: full power (except self already blocked)

      targetUser.role = role;
      await targetUser.save();

      await AdminLog.create({
        adminId: req.user.id,
        action: `Changed role to ${role}`,
        targetUserId: targetUser._id
      });

      res.json({ message: "Role updated successfully" });

    } catch (err) {
      res.status(500).json({ message: "Server error" });
    }
  }
);


// ===============================
// GET ADMIN LOGS
// ===============================
router.get("/logs", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    let query = {};

    // agar normal admin hai → sirf apne logs
    if (req.user.role === "admin") {
      query.adminId = req.user.id;
    }

    // superadmin ke liye query empty rahegi → sab logs

    const logs = await AdminLog.find(query)
      .populate("adminId", "name email role")
      .populate("targetUserId", "name email role")
      .sort({ createdAt: -1 });

    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ===============================
// EXPORT ADMIN LOGS (CSV)
// ===============================
const { Parser } = require("json2csv");

router.get("/logs/export", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    console.log("NEW EXPORT ROUTE HIT", req.query);
    const { from, to, adminId, action, search, limit } = req.query;

   let matchStage = {};

    // NORMAL ADMIN → sirf apne logs
    if (req.user.role === "admin") {
      matchStage.adminId = new mongoose.Types.ObjectId(req.user.id);
    }

    // SUPERADMIN + dropdown filter
    if (adminId && req.user.role === "superadmin") {
      matchStage.adminId = new mongoose.Types.ObjectId(adminId);
    }


    // action filter
    if (action) {
      matchStage.action = action;
    }

    // date filter
    if (from || to) {
      matchStage.createdAt = {};
      if (from) matchStage.createdAt.$gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        matchStage.createdAt.$lte = end;
      }
    }

    const pipeline = [
      { $match: matchStage },

      {
        $lookup: {
          from: "users",
          localField: "adminId",
          foreignField: "_id",
          as: "admin"
        }
      },

      {
        $lookup: {
          from: "users",
          localField: "targetUserId",
          foreignField: "_id",
          as: "targetUser"
        }
      },

      {
        $unwind: {
          path: "$admin",
          preserveNullAndEmptyArrays: true
        }
      },

      {
        $unwind: {
          path: "$targetUser",
          preserveNullAndEmptyArrays: true
        }
      }
    ];

    // SEARCH LOGIC (MAIN PART)
    if (search && search.trim()) {

      const safeSearch = search.trim();

      pipeline.push({
        $match: {
          $or: [
            { "admin.name": { $regex: safeSearch, $options: "i" } },
            { "admin.email": { $regex: safeSearch, $options: "i" } },
            { "targetUser.email": { $regex: safeSearch, $options: "i" } }
          ]
        }
      });

    }


    pipeline.push({
      $sort: { createdAt: -1 }
    });

    if (limit) {
      pipeline.push({
        $limit: parseInt(limit)
      });
    }

    const logs = await AdminLog.aggregate(pipeline);

    const data = logs.map(log => ({
      admin: log.admin?.name || "Admin",
      adminEmail: log.admin?.email || "-",
      action: log.action,
      targetUser: log.targetUser?.email || "-",
      time: new Date(log.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
    }));

    const fields = ["admin", "adminEmail", "action", "targetUser", "time"];

    const parser = new Parser({ fields });
    const csv = parser.parse(data);

    res.header("Content-Type", "text/csv");
    res.attachment("admin-logs.csv");
    res.send(csv);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Export failed" });
  }
});

module.exports = router;
