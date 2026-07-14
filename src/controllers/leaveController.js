const pool = require("../config/database");

// Helper to calculate days inclusive
const calculateDays = (from_date, to_date) => {
  const from = new Date(from_date);
  const to = new Date(to_date);
  const diffTime = Math.abs(to - from);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

// Helper to initialize remaining leaves for all employees and leave types in a company
const initializeRemainingLeaves = async (company_id) => {
  try {
    // 1. Get all employees in the company with gender
    const usersRes = await pool.query(
      "SELECT id, gender FROM users WHERE company_id = $1",
      [company_id]
    );
    const users = usersRes.rows;

    // 2. Get all leave types in the company
    const leaveTypesRes = await pool.query(
      "SELECT id, name, total_leave FROM leave_types WHERE company_id = $1",
      [company_id]
    );
    const leaveTypes = leaveTypesRes.rows;

    if (users.length === 0 || leaveTypes.length === 0) return;

    // 3. Check each combination and insert if missing
    for (const user of users) {
      const userGender = user.gender ? user.gender.toLowerCase() : "";

      for (const lt of leaveTypes) {
        const existRes = await pool.query(
          "SELECT id FROM remaining_leave WHERE user_id = $1 AND leave_types = $2",
          [user.id, lt.id]
        );

        if (existRes.rows.length === 0) {
          let totalVal = lt.total_leave !== null ? Number(lt.total_leave) : 0;
          
          const ltName = lt.name.toLowerCase();
          if (ltName.includes("paternity") && userGender === "female") {
            totalVal = 0;
          } else if (ltName.includes("maternity") && userGender === "male") {
            totalVal = 0;
          }

          // Find next available ID for remaining_leave
          const idResult = await pool.query(`
            SELECT COALESCE(
              (
                SELECT MIN(rl1.id + 1)
                FROM remaining_leave rl1
                LEFT JOIN remaining_leave rl2
                ON rl1.id + 1 = rl2.id
                WHERE rl2.id IS NULL
              ),
              1
            ) AS next_id
          `);
          const nextId = idResult.rows[0].next_id;

          await pool.query(
            `INSERT INTO remaining_leave (id, user_id, leave_types, credit_leave, balance_leave, total_leave)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [nextId, user.id, lt.id, totalVal, totalVal, totalVal]
          );
        }
      }
    }
  } catch (error) {
    console.error("Error in initializeRemainingLeaves:", error);
  }
};

// Helper to automatically recalculate leave balances for a company
const recalculateCompanyBalances = async (company_id) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Ensure remaining leaves are initialized
    await initializeRemainingLeaves(company_id);

    // Get all users in the company with gender
    const usersRes = await client.query("SELECT id, gender FROM users WHERE company_id = $1", [company_id]);
    const usersMap = {};
    usersRes.rows.forEach(u => {
      usersMap[u.id] = u.gender ? u.gender.toLowerCase() : "";
    });

    // 2. Reset balance_leave to total_leave for all remaining_leave of this company
    const rls = await client.query(`
      SELECT rl.id, rl.user_id, rl.leave_types, rl.total_leave, lt.name as leave_type_name
      FROM remaining_leave rl
      JOIN leave_types lt ON rl.leave_types = lt.id
      WHERE lt.company_id = $1
    `, [company_id]);

    for (const rl of rls.rows) {
      const userGender = usersMap[rl.user_id] || "";
      const ltName = rl.leave_type_name.toLowerCase();
      
      let finalTotal = Number(rl.total_leave);
      if (ltName.includes("paternity") && userGender === "female") {
        finalTotal = 0;
      } else if (ltName.includes("maternity") && userGender === "male") {
        finalTotal = 0;
      }

      await client.query(`
        UPDATE remaining_leave
        SET balance_leave = $1, total_leave = $2, credit_leave = $3
        WHERE id = $4
      `, [finalTotal, finalTotal, finalTotal, rl.id]);
    }

    // 3. Get all approved leaves for this company
    const approvedLeavesRes = await client.query(`
      SELECT 
        l.user_id, 
        l.leave_types, 
        l.from_date, 
        l.to_date
      FROM leave l
      JOIN leave_types lt ON l.leave_types = lt.id
      WHERE lt.company_id = $1 AND l.status = 'Approved'
    `, [company_id]);

    // 4. For each approved request, subtract the calculated days from balance_leave
    for (const approvedReq of approvedLeavesRes.rows) {
      const days = calculateDays(approvedReq.from_date, approvedReq.to_date);
      
      const userGender = usersMap[approvedReq.user_id] || "";
      const ltRes = await client.query("SELECT name FROM leave_types WHERE id = $1", [approvedReq.leave_types]);
      const ltName = ltRes.rows[0]?.name?.toLowerCase() || "";
      
      if ((ltName.includes("paternity") && userGender === "female") || 
          (ltName.includes("maternity") && userGender === "male")) {
        continue;
      }

      await client.query(`
        UPDATE remaining_leave
        SET balance_leave = balance_leave - $1
        WHERE user_id = $2 AND leave_types = $3
      `, [days, approvedReq.user_id, approvedReq.leave_types]);
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error in recalculateCompanyBalances:", error);
    throw error;
  } finally {
    client.release();
  }
};

// =================================
// GET ALL LEAVE REQUESTS
// =================================
exports.getLeaveRequests = async (req, res) => {
  try {
    const company_id = req.user.company_id;

    // Run initialization first to keep balances up-to-date
    await initializeRemainingLeaves(company_id);

    let result;
    if (req.user.role === "employee") {
      result = await pool.query(
        `
        SELECT 
          l.id, 
          l.user_id, 
          l.leave_types, 
          lt.name as leave_type_name, 
          l.from_date, 
          l.to_date, 
          l.status, 
          l.description, 
          l.approved_by, 
          l.created_at,
          u.first_name, 
          u.last_name,
          u.email as employee_email,
          dept.department_name
        FROM leave l
        JOIN users u ON l.user_id = u.id
        JOIN leave_types lt ON l.leave_types = lt.id
        LEFT JOIN departments dept ON u.department_id = dept.id
        WHERE lt.company_id = $1 AND l.user_id = $2
        ORDER BY l.created_at DESC
        `,
        [company_id, req.user.id]
      );
    } else {
      result = await pool.query(
        `
        SELECT 
          l.id, 
          l.user_id, 
          l.leave_types, 
          lt.name as leave_type_name, 
          l.from_date, 
          l.to_date, 
          l.status, 
          l.description, 
          l.approved_by, 
          l.created_at,
          u.first_name, 
          u.last_name,
          u.email as employee_email,
          dept.department_name
        FROM leave l
        JOIN users u ON l.user_id = u.id
        JOIN leave_types lt ON l.leave_types = lt.id
        LEFT JOIN departments dept ON u.department_id = dept.id
        WHERE lt.company_id = $1
        ORDER BY l.created_at DESC
        `,
        [company_id]
      );
    }

    res.status(200).json({
      success: true,
      leaveRequests: result.rows,
    });
  } catch (error) {
    console.error("getLeaveRequests error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =================================
// CREATE LEAVE REQUEST
// =================================
exports.createLeaveRequest = async (req, res) => {
  try {
    let { user_id, leave_types, from_date, to_date, description, status } = req.body;
    const company_id = req.user.company_id;
    const created_by = req.user.id;

    if (req.user.role === "employee") {
      user_id = req.user.id;
      status = "Pending";
    }

    if (!user_id || !leave_types || !from_date || !to_date) {
      return res.status(400).json({
        success: false,
        message: "Employee, Leave Type, From Date, and To Date are required",
      });
    }

    // Find first available ID for leave table
    const idResult = await pool.query(`
      SELECT COALESCE(
        (
          SELECT MIN(l1.id + 1)
          FROM leave l1
          LEFT JOIN leave l2
          ON l1.id + 1 = l2.id
          WHERE l2.id IS NULL
        ),
        1
      ) AS next_id
    `);
    const nextId = idResult.rows[0].next_id;

    const requestStatus = status || "Pending";

    const result = await pool.query(
      `
      INSERT INTO leave
      (id, user_id, leave_types, from_date, to_date, description, status, approved_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
      `,
      [
        nextId,
        user_id,
        leave_types,
        from_date,
        to_date,
        description || "",
        requestStatus,
        requestStatus === "Approved" ? created_by : null
      ]
    );

    const newRequest = result.rows[0];

    // If request was approved immediately, deduct the leaves
    if (requestStatus === "Approved") {
      await initializeRemainingLeaves(company_id);
      const days = calculateDays(from_date, to_date);
      await pool.query(
        `UPDATE remaining_leave 
         SET balance_leave = balance_leave - $1 
         WHERE user_id = $2 AND leave_types = $3`,
        [days, user_id, leave_types]
      );
    }

    res.status(201).json({
      success: true,
      message: "Leave Request created successfully",
      leaveRequest: newRequest,
    });
  } catch (error) {
    console.error("createLeaveRequest error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =================================
// UPDATE LEAVE STATUS (APPROVE / REJECT)
// =================================
exports.updateLeaveStatus = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { status } = req.body;
    const company_id = req.user.company_id;
    const admin_id = req.user.id;

    if (!status || !["Pending", "Approved", "Rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Valid status is required (Pending, Approved, Rejected)",
      });
    }

    await client.query("BEGIN");

    // Fetch the leave request with leave type details to verify company
    const leaveRes = await client.query(
      `SELECT l.*, lt.company_id 
       FROM leave l
       JOIN leave_types lt ON l.leave_types = lt.id
       WHERE l.id = $1 AND lt.company_id = $2`,
      [id, company_id]
    );

    if (leaveRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        message: "Leave request not found",
      });
    }

    const request = leaveRes.rows[0];
    const previousStatus = request.status;

    if (previousStatus === status) {
      await client.query("COMMIT");
      return res.status(200).json({
        success: true,
        message: `Leave request is already ${status}`,
        leaveRequest: request,
      });
    }

    // Compute days
    const days = calculateDays(request.from_date, request.to_date);

    // Make sure remaining_leave has records initialized
    await initializeRemainingLeaves(company_id);

    // Balance update logic
    if (previousStatus !== "Approved" && status === "Approved") {
      // Deduct balance
      await client.query(
        `UPDATE remaining_leave 
         SET balance_leave = balance_leave - $1 
         WHERE user_id = $2 AND leave_types = $3`,
        [days, request.user_id, request.leave_types]
      );
    } else if (previousStatus === "Approved" && status !== "Approved") {
      // Restore balance
      await client.query(
        `UPDATE remaining_leave 
         SET balance_leave = balance_leave + $1 
         WHERE user_id = $2 AND leave_types = $3`,
        [days, request.user_id, request.leave_types]
      );
    }

    // Update status in database
    const updateRes = await client.query(
      `UPDATE leave
       SET status = $1, approved_by = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [status, status === "Approved" ? admin_id : null, id]
    );

    await client.query("COMMIT");

    res.status(200).json({
      success: true,
      message: `Leave request ${status.toLowerCase()} successfully`,
      leaveRequest: updateRes.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("updateLeaveStatus error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  } finally {
    client.release();
  }
};

// =================================
// DELETE LEAVE REQUEST
// =================================
exports.deleteLeaveRequest = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const company_id = req.user.company_id;

    await client.query("BEGIN");

    // Get request details to check if it was approved
    const leaveRes = await client.query(
      `SELECT l.* 
       FROM leave l
       JOIN leave_types lt ON l.leave_types = lt.id
       WHERE l.id = $1 AND lt.company_id = $2`,
      [id, company_id]
    );

    if (leaveRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        message: "Leave request not found",
      });
    }

    const request = leaveRes.rows[0];

    // If it was approved, restore the balance first
    if (request.status === "Approved") {
      const days = calculateDays(request.from_date, request.to_date);
      await client.query(
        `UPDATE remaining_leave 
         SET balance_leave = balance_leave + $1 
         WHERE user_id = $2 AND leave_types = $3`,
        [days, request.user_id, request.leave_types]
      );
    }

    // Delete
    await client.query("DELETE FROM leave WHERE id = $1", [id]);

    await client.query("COMMIT");

    res.status(200).json({
      success: true,
      message: "Leave Request deleted successfully",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("deleteLeaveRequest error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  } finally {
    client.release();
  }
};

// =================================
// GET REMAINING LEAVES (ALL EMPLOYEES)
// =================================
exports.getRemainingLeaves = async (req, res) => {
  try {
    const company_id = req.user.company_id;

    // Automatically recalculate company balances in code before returning
    await recalculateCompanyBalances(company_id);

    let result;
    if (req.user.role === "employee") {
      result = await pool.query(
        `
        SELECT 
          rl.id,
          rl.user_id,
          rl.leave_types as leave_type_id,
          rl.credit_leave,
          rl.balance_leave,
          rl.total_leave,
          u.first_name,
          u.last_name,
          dept.department_name,
          lt.name as leave_type_name,
          lt.credit_type,
          lt.carry_forward
        FROM remaining_leave rl
        JOIN users u ON rl.user_id = u.id
        LEFT JOIN departments dept ON u.department_id = dept.id
        JOIN leave_types lt ON rl.leave_types = lt.id
        WHERE lt.company_id = $1 AND rl.user_id = $2
        ORDER BY lt.id ASC;
        `,
        [company_id, req.user.id]
      );
    } else {
      result = await pool.query(
        `
        SELECT 
          rl.id,
          rl.user_id,
          rl.leave_types as leave_type_id,
          rl.credit_leave,
          rl.balance_leave,
          rl.total_leave,
          u.first_name,
          u.last_name,
          dept.department_name,
          lt.name as leave_type_name,
          lt.credit_type,
          lt.carry_forward
        FROM remaining_leave rl
        JOIN users u ON rl.user_id = u.id
        LEFT JOIN departments dept ON u.department_id = dept.id
        JOIN leave_types lt ON rl.leave_types = lt.id
        WHERE lt.company_id = $1
        ORDER BY u.id ASC, lt.id ASC;
        `,
        [company_id]
      );
    }

    res.status(200).json({
      success: true,
      remainingLeaves: result.rows,
    });
  } catch (error) {
    console.error("getRemainingLeaves error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =================================
// RECALCULATE LEAVE BALANCES
// =================================
exports.recalculateBalances = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    await recalculateCompanyBalances(company_id);
    res.status(200).json({
      success: true,
      message: "Leave balances recalculated successfully!",
    });
  } catch (error) {
    console.error("recalculateBalances error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

