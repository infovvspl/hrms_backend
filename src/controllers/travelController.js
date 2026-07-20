const pool = require("../config/database");

// =====================================
// EMPLOYEE: SUBMIT TRAVEL REIMBURSEMENT
// =====================================
exports.createTravel = async (req, res) => {
  try {
    const { travel_from, travel_to, purpose, total_amount, bill } = req.body;
    const user_id = req.user.id; // From authmiddleware

    if (!travel_from || !travel_to || !total_amount) {
      return res.status(400).json({
        success: false,
        message: "travel_from, travel_to, and total_amount are required",
      });
    }

    // Save travel reimbursement to database
    const result = await pool.query(
      `INSERT INTO travel (user_id, travel_from, travel_to, purpose, total_amount, bill, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'Pending')
       RETURNING *`,
      [user_id, travel_from, travel_to, purpose || null, total_amount, bill || null]
    );

    res.status(201).json({
      success: true,
      message: "Travel reimbursement request submitted successfully",
      travel: result.rows[0],
    });
  } catch (error) {
    console.error("createTravel error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================
// EMPLOYEE: GET OWN TRAVEL REIMBURSEMENTS
// =====================================
exports.getMyTravelRequests = async (req, res) => {
  try {
    const user_id = req.user.id;

    const result = await pool.query(
      `SELECT t.*, 
              CONCAT(u.first_name, ' ', u.last_name) as approver_name
       FROM travel t
       LEFT JOIN users u ON t.approved_by = u.id
       WHERE t.user_id = $1
       ORDER BY t.created_at DESC`,
      [user_id]
    );

    res.status(200).json({
      success: true,
      travelRequests: result.rows,
    });
  } catch (error) {
    console.error("getMyTravelRequests error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================
// COMPANY / HR: GET ALL EMPLOYEE TRAVEL REQUESTS
// =====================================
exports.getCompanyTravelRequests = async (req, res) => {
  try {
    const company_id = req.user.company_id;

    const result = await pool.query(
      `SELECT t.*,
              CONCAT(u.first_name, ' ', u.last_name) AS employee_name,
              u.email AS employee_email,
              u.company_employee_id,
              CONCAT(app.first_name, ' ', app.last_name) AS approver_name
       FROM travel t
       JOIN users u ON t.user_id = u.id
       LEFT JOIN users app ON t.approved_by = app.id
       WHERE u.company_id = $1
       ORDER BY t.created_at DESC`,
      [company_id]
    );

    res.status(200).json({
      success: true,
      travelRequests: result.rows,
    });
  } catch (error) {
    console.error("getCompanyTravelRequests error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================
// COMPANY / HR: APPROVE / REJECT TRAVEL REQUEST
// =====================================
exports.updateTravelStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const approver_id = req.user.id; // Current user ID (HR or Company Admin)

    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value. Must be 'Approved' or 'Rejected'",
      });
    }

    const result = await pool.query(
      `UPDATE travel
       SET status = $1, approved_by = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [status, approver_id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Travel request not found",
      });
    }

    res.status(200).json({
      success: true,
      message: `Travel request ${status.toLowerCase()} successfully`,
      travel: result.rows[0],
    });
  } catch (error) {
    console.error("updateTravelStatus error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
