const jwt = require("jsonwebtoken");

const generateToken = (company) => {
  return jwt.sign(
    {
      id: company.id,
      company_id: company.id, 
      company_name: company.company_name,
      email: company.email,
      login_type: company.login_type || "email",
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
};

module.exports = generateToken;