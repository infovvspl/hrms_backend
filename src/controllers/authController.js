const pool = require("../config/database");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const generateToken = require("../utils/generateToken");

// ================= EMAIL LOGIN =================
exports.login = async (req, res) => {
  try {
    const { email, password, longitude, latitude } = req.body;

    // ================= CHECK COMPANY =================
    const companyRes = await pool.query(
      "SELECT * FROM company WHERE email = $1",
      [email]
    );

    const company = companyRes.rows[0];

    if (!company) {
      // Check if employee/user
      const userRes = await pool.query(
        `SELECT u.*, r.role_name 
         FROM users u
         LEFT JOIN roles r ON u.role_id = r.id
         WHERE u.work_email = $1 OR u.email = $1`,
        [email]
      );
      const user = userRes.rows[0];

      if (!user) {
        return res.status(400).json({
          success: false,
          message: "Account not found",
        });
      }

      // Check user password
      if (!user.password) {
        return res.status(400).json({
          success: false,
          message: "Account password not configured",
        });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: "Invalid Credentials",
        });
      }



      // Generate token for employee
      const tokenPayload = {
        id: user.id,
        company_id: user.company_id,
        email: user.email,
        work_email: user.work_email,
        role_id: user.role_id,
        role_name: user.role_name || "Employee",
        role: "employee",
        login_type: "email",
      };

      const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });

      return res.status(200).json({
        success: true,
        message: "Employee Login Successful",
        token,
        role: "employee",
        employee: {
          id: user.id,
          company_id: user.company_id,
          company_employee_id: user.company_employee_id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          work_email: user.work_email,
          role_id: user.role_id,
          role_name: user.role_name || "Employee",
          login_type: "email",
        },
      });
    }

    // ================= PASSWORD CHECK FOR COMPANY =================
    const targetPassword = company.password;

    // Only block email login if the account has NO password (pure Google account)
    if (!targetPassword) {
      return res.status(400).json({
        success: false,
        message: "Please continue with Google",
      });
    }

    // ================= EMAIL VERIFIED CHECK =================
    if (!company.is_verified) {
      return res.status(400).json({
        success: false,
        message: "Please verify your email first",
      });
    }

    const isMatch = await bcrypt.compare(password, targetPassword);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid Credentials",
      });
    }

    // ================= UPDATE LOGIN TYPE / TIMESTAMP =================
    await pool.query(
      `
      UPDATE company
      SET
        login_type = 'email',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      `,
      [company.id]
    );

    // Update local object to reflect the database update
    company.login_type = 'email';



    // ================= GENERATE TOKEN =================
    const tokenPayload = {
      id: company.id,
      company_id: company.id,
      email: company.email,
      role: "company",
      login_type: company.login_type || "email",
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    // ================= SUCCESS RESPONSE =================
    const responsePayload = {
      success: true,
      message: "Login Successful",
      token,
      role: "company",
      company: {
        id: company.id,
        company_name: company.company_name,
        email: company.email,
        phone: company.phone,
        address1: company.address1,
        address2: company.address2,
        city: company.city,
        country: company.country,
        state: company.state,
        pincode: company.pincode,
        logo: company.logo,
        gst_no: company.gst_no,
        cin_number: company.cin_number,
        registration_number: company.registration_number,
        login_type: company.login_type,
        is_verified: company.is_verified,
        created_at: company.created_at,
      },
    };

    res.status(200).json(responsePayload);
  } catch (error) {
    console.log("LOGIN ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// ================= LOGOUT =================
exports.logout = async (req, res) => {
  try {
    res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    console.error("LOGOUT ERROR:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};