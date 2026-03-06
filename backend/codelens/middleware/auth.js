// ══════════════════════════════════════════════════════
// CODELENS — middleware/auth.js
// ══════════════════════════════════════════════════════
const jwt = require("jsonwebtoken");

/**
 * JWT Auth Middleware
 * Same JWT_SECRET as UserSphere — koi bhi logged-in
 * UserSphere user CodeLens API use kar sakta hai
 */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access denied. No token provided. Please login via UserSphere."
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, email, role, iat, exp }
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please login again."
      });
    }
    return res.status(403).json({
      success: false,
      message: "Invalid token. Access forbidden."
    });
  }
};

module.exports = { verifyToken };