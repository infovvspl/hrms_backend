const pool = require("../config/database");

// =================================
// CREATE LOGIN HISTORY (log a login event)
// =================================
exports.createLoginHistory = async (req, res) => {
  try {
    const {
      user_id,
      login_at,
      logout_at,
      ipaddress,
      device_info,
      os,
      browser,
      longitude,
      lattitude,
      login_status,
      failure_reason,
      session_id,
    } = req.body;

    console.log("createLoginHistory", req.body);


    let clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";
    if (clientIp.includes(",")) {
      clientIp = clientIp.split(",")[0].trim();
    }
    if (clientIp.startsWith("::ffff:")) {
      clientIp = clientIp.substring(7);
    }
    if (clientIp === "::1") {
      clientIp = "127.0.0.1";
    }
    const ipToStore = ipaddress && ipaddress !== "Unknown" ? ipaddress : clientIp;

    const result = await pool.query(
      `
      INSERT INTO login_history
        (user_id, login_at, logout_at, ipaddress, device_info, os, browser, longitude, lattitude,
         login_status, failure_reason, session_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
      `,
      [
        user_id || null,
        login_at || new Date(),
        logout_at || null,
        ipToStore || null,
        device_info || null,
        os || null,
        browser || null,
        longitude || null,
        lattitude || null,
        login_status || "success",
        failure_reason || null,
        session_id || null,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Login history created successfully",
      login_history: result.rows[0],
    });
  } catch (error) {
    console.error("createLoginHistory error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =================================
// GET ALL LOGIN HISTORY (company-scoped via user)
// =================================
exports.getLoginHistory = async (req, res) => {
  try {
    const company_id = req.user.company_id;

    const result = await pool.query(
      `
      SELECT
        lh.id,
        lh.user_id,
        u.first_name,
        u.last_name,
        u.email,
        lh.login_at,
        lh.logout_at,
        lh.ipaddress,
        lh.device_info,
        lh.os,
        lh.browser,
        lh.longitude,
        lh.lattitude,
        lh.login_status,
        lh.failure_reason,
        lh.session_id,
        lh.created_at
      FROM login_history lh
      LEFT JOIN users u ON lh.user_id = u.id
      WHERE u.company_id = $1 OR lh.user_id IS NULL
      ORDER BY lh.created_at DESC
      `,
      [company_id]
    );

    res.status(200).json({
      success: true,
      login_history: result.rows,
    });
  } catch (error) {
    console.error("getLoginHistory error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =================================
// GET LOGIN HISTORY BY USER ID
// =================================
exports.getLoginHistoryByUser = async (req, res) => {
  try {
    const { user_id } = req.params;
    const company_id = req.user.company_id;

    const result = await pool.query(
      `
      SELECT
        lh.id,
        lh.user_id,
        u.first_name,
        u.last_name,
        u.email,
        lh.login_at,
        lh.logout_at,
        lh.ipaddress,
        lh.device_info,
        lh.os,
        lh.browser,
        lh.longitude,
        lh.lattitude,
        lh.login_status,
        lh.failure_reason,
        lh.session_id,
        lh.created_at
      FROM login_history lh
      LEFT JOIN users u ON lh.user_id = u.id
      WHERE lh.user_id = $1 AND u.company_id = $2
      ORDER BY lh.created_at DESC
      `,
      [user_id, company_id]
    );

    res.status(200).json({
      success: true,
      login_history: result.rows,
    });
  } catch (error) {
    console.error("getLoginHistoryByUser error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =================================
// GET SINGLE LOGIN HISTORY BY ID
// =================================
exports.getLoginHistoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT
        lh.id,
        lh.user_id,
        u.first_name,
        u.last_name,
        u.email,
        lh.login_at,
        lh.logout_at,
        lh.ipaddress,
        lh.device_info,
        lh.os,
        lh.browser,
        lh.longitude,
        lh.lattitude,
        lh.login_status,
        lh.failure_reason,
        lh.session_id,
        lh.created_at
      FROM login_history lh
      LEFT JOIN users u ON lh.user_id = u.id
      WHERE lh.id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Login history record not found",
      });
    }

    res.status(200).json({
      success: true,
      login_history: result.rows[0],
    });
  } catch (error) {
    console.error("getLoginHistoryById error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =================================
// UPDATE LOGOUT TIME (set logout_at)
// =================================
exports.updateLogoutTime = async (req, res) => {
  try {
    const { id } = req.params;
    const { logout_at } = req.body;

    const result = await pool.query(
      `
      UPDATE login_history
      SET logout_at = $1
      WHERE id = $2
      RETURNING *
      `,
      [logout_at || new Date(), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Login history record not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Logout time updated successfully",
      login_history: result.rows[0],
    });
  } catch (error) {
    console.error("updateLogoutTime error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =================================
// DELETE LOGIN HISTORY BY ID
// =================================
exports.deleteLoginHistory = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      DELETE FROM login_history
      WHERE id = $1
      RETURNING *
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Login history record not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Login history deleted successfully",
    });
  } catch (error) {
    console.error("deleteLoginHistory error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
