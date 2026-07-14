const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "No token found",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.user = {
      id: decoded.id,
      company_id: decoded.company_id,
      role: decoded.role,
      login_type: decoded.login_type,
      session_id: decoded.session_id,
    };
    req.companyId = decoded.company_id;
    console.log("Decoded Token:", decoded);

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};