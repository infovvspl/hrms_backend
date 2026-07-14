const pool = require("../config/database");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const generateToken = require("../utils/generateToken");

// ================= LOGIN LOGGING HELPER =================
const logLoginAttempt = async (user_id, company_id, email, req, status, reason, longitude, latitude, session_id = null) => {
  try {
    const ipaddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
    const ua = req.headers['user-agent'] || "";
    
    // Simple User Agent Parsing
    let os = "Unknown OS";
    if (/windows/i.test(ua)) os = "Windows";
    else if (/macintosh|mac os x/i.test(ua)) os = "macOS";
    else if (/linux/i.test(ua)) os = "Linux";
    else if (/android/i.test(ua)) os = "Android";
    else if (/iphone|ipad|ipod/i.test(ua)) os = "iOS";

    let browser = "Unknown Browser";
    if (/edg/i.test(ua)) browser = "Edge";
    else if (/opr/i.test(ua)) browser = "Opera";
    else if (/chrome|crios/i.test(ua)) browser = "Chrome";
    else if (/firefox|fxios/i.test(ua)) browser = "Firefox";
    else if (/safari/i.test(ua)) browser = "Safari";

    let device_info = "Desktop";
    if (/mobile|android|iphone|ipad|ipod/i.test(ua)) {
      device_info = "Mobile";
    }

    await pool.query(
      `INSERT INTO login_history (
        user_id, company_id, login_at, ipaddress, device_info, os, browser, 
        longitude, lattitude, login_status, failure_reason, session_id
      ) VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        user_id,
        company_id,
        ipaddress,
        device_info,
        os,
        browser,
        longitude || null,
        latitude || null,
        status,
        reason || null,
        session_id
      ]
    );
  } catch (err) {
    console.error("ERROR LOGGING LOGIN ATTEMPT:", err);
  }
};

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
        await logLoginAttempt(null, null, email, req, 'Failed', 'Account not found', longitude, latitude);
        return res.status(400).json({
          success: false,
          message: "Account not found",
        });
      }

      // Check user password
      if (!user.password) {
        await logLoginAttempt(user.id, user.company_id, email, req, 'Failed', 'Account password not configured', longitude, latitude);
        return res.status(400).json({
          success: false,
          message: "Account password not configured",
        });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        await logLoginAttempt(user.id, user.company_id, email, req, 'Failed', 'Invalid Credentials', longitude, latitude);
        return res.status(400).json({
          success: false,
          message: "Invalid Credentials",
        });
      }

      // Generate a unique session ID
      const session_id = require("crypto").randomBytes(16).toString("hex");

      // Log successful login
      await logLoginAttempt(user.id, user.company_id, email, req, 'Success', null, longitude, latitude, session_id);

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
        session_id: session_id,
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
          session_id: session_id,
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
      await logLoginAttempt(null, company.id, email, req, 'Failed', 'Please verify your email first', longitude, latitude);
      return res.status(400).json({
        success: false,
        message: "Please verify your email first",
      });
    }

    const isMatch = await bcrypt.compare(password, targetPassword);

    if (!isMatch) {
      await logLoginAttempt(null, company.id, email, req, 'Failed', 'Invalid Credentials', longitude, latitude);
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

    // Generate session ID for company login
    const session_id = require("crypto").randomBytes(16).toString("hex");
    await logLoginAttempt(null, company.id, email, req, 'Success', null, longitude, latitude, session_id);

    // ================= GENERATE TOKEN =================
    const tokenPayload = {
      id: company.id,
      company_id: company.id,
      email: company.email,
      role: "company",
      login_type: company.login_type || "email",
      session_id: session_id,
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
    const { session_id } = req.user || {};
    if (session_id) {
      await pool.query(
        "UPDATE login_history SET logout_at = CURRENT_TIMESTAMP WHERE session_id = $1",
        [session_id]
      );
    }
    res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    console.error("LOGOUT ERROR:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// ================= GET LOGIN HISTORY =================
exports.getLoginHistory = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) {
      return res.status(400).json({ success: false, message: "Company ID not found in session" });
    }

    if (req.user.role !== "company") {
      return res.status(403).json({ success: false, message: "Access denied. Admin only." });
    }

    const result = await pool.query(
      `SELECT lh.*, 
              u.first_name, u.last_name, u.email as user_email, u.company_employee_id,
              c.company_name, c.email as company_email
       FROM login_history lh
       LEFT JOIN users u ON lh.user_id = u.id
       LEFT JOIN company c ON lh.company_id = c.id
       WHERE lh.company_id = $1
       ORDER BY lh.login_at DESC`,
      [companyId]
    );

    res.status(200).json({ success: true, loginHistory: result.rows });
  } catch (error) {
    console.error("GET LOGIN HISTORY ERROR:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};