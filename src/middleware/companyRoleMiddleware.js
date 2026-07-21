/**
 * Middleware to strictly check if the user is a Company Admin.
 */
const checkCompanyRole = (req, res, next) => {
  if (req.user && req.user.role === "company") {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: "Access Denied: This action requires Company Admin privileges.",
  });
};

module.exports = checkCompanyRole;
