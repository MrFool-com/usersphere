const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

router.get("/me", authMiddleware, (req, res) => {
  res.json({
    message: "Protected data",
    user: req.user
  });
});

module.exports = router;
