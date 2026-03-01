const express = require("express");
const router  = express.Router();
const authMiddleware   = require("../middleware/authMiddleware");
const profileController = require("../controllers/profileController");

router.get("/me", authMiddleware, (req, res) => {
  res.json({
    message: "Protected data",
    user: req.user
  });
});

// ===== PROFILE ROUTES =====
router.get("/profile/me",             authMiddleware, profileController.getProfile);
router.put("/profile/update-name",     authMiddleware, profileController.updateName);
router.put("/profile/update-password", authMiddleware, profileController.updatePassword);

module.exports = router;