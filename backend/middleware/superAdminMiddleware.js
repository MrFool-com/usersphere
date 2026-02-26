const superAdminMiddleware = (req, res, next) => {
  if (!req.user || req.user.role !== "superadmin") {
    return res.status(403).json({
      message: "Super admin access only"
    });
  }

  next();
};

module.exports = superAdminMiddleware;
