const pool = require("../config/database");

// =====================================
// GET SHIFTS FOR COMPANY
// =====================================
exports.getShifts = async (req, res) => {
  try {
    const company_id = req.user.company_id;

    const result = await pool.query(
      `SELECT * FROM shift WHERE company_id = $1 ORDER BY id ASC`,
      [company_id]
    );

    res.status(200).json({
      success: true,
      shifts: result.rows,
    });
  } catch (error) {
    console.error("GET SHIFTS ERROR:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// =====================================
// GET ATTENDANCE LOGS FOR COMPANY
// =====================================
exports.getAttendanceLogs = async (req, res) => {
  try {
    const company_id = req.user.company_id;

    let result;
    if (req.user.role === "employee") {
      result = await pool.query(
        `
        SELECT 
          a.id,
          a.user_id,
          a.shift_id,
          a.punch_in_at,
          a.punch_out_at,
          a.punch_in_type,
         
          a.punch_in_longitude,
          a.punch_in_latitude,
     
          a.punch_out_type,
        
          a.punch_out_longitude,
          a.punch_out_latitude,
   
          a.total_time,
          COALESCE(a.punch_in_type, 'biometric') as punch_type,
          a.created_at,
          a.updated_at,
          CONCAT(u.first_name, ' ', u.last_name) as employee_name,
          u.company_employee_id as employee_code,
          dept.department_name as department,
          COALESCE(s_curr.shift_name, s.shift_name) as shift_name,
          COALESCE(s_curr.start_time, s.start_time) as shift_start_time,
          COALESCE(s_curr.end_time, s.end_time) as shift_end_time
        FROM attendance a
        JOIN users u ON a.user_id = u.id
        LEFT JOIN departments dept ON u.department_id = dept.id
        LEFT JOIN assign_shift ash ON u.id = ash.user_id
        LEFT JOIN shift s_curr ON ash.shift_id = s_curr.id
        LEFT JOIN shift s ON a.shift_id = s.id
        WHERE u.company_id = $1 AND a.user_id = $2
        ORDER BY a.punch_in_at DESC
        `,
        [company_id, req.user.id]
      );
    } else {
      result = await pool.query(
        `
        SELECT 
          a.id,
          a.user_id,
          a.shift_id,
          a.punch_in_at,
          a.punch_out_at,
          a.punch_in_type,
          a.punch_in_longitude,
  
          a.punch_in_latitude,
        
          a.punch_out_type,
          a.punch_out_longitude,
      
          a.punch_out_latitude,
       
          a.total_time,
          COALESCE(a.punch_in_type, 'biometric') as punch_type,
          a.created_at,
          a.updated_at,
          CONCAT(u.first_name, ' ', u.last_name) as employee_name,
          u.company_employee_id as employee_code,
          dept.department_name as department,
          COALESCE(s_curr.shift_name, s.shift_name) as shift_name,
          COALESCE(s_curr.start_time, s.start_time) as shift_start_time,
          COALESCE(s_curr.end_time, s.end_time) as shift_end_time
        FROM attendance a
        JOIN users u ON a.user_id = u.id
        LEFT JOIN departments dept ON u.department_id = dept.id
        LEFT JOIN assign_shift ash ON u.id = ash.user_id
        LEFT JOIN shift s_curr ON ash.shift_id = s_curr.id
        LEFT JOIN shift s ON a.shift_id = s.id
        WHERE u.company_id = $1
        ORDER BY a.punch_in_at DESC
        `,
        [company_id]
      );
    }

    res.status(200).json({
      success: true,
      logs: result.rows,
    });
  } catch (error) {
    console.error("GET ATTENDANCE ERROR:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// =====================================
// PUNCH IN / OUT (BIOMETRIC SCAN)
// =====================================
exports.punchAttendance = async (req, res) => {
  const client = await pool.connect();
  try {
    let { user_id, shift_id, punch_time, punch_type, longitude, latitude } = req.body;
    const company_id = req.user.company_id;

    if (req.user.role === "employee") {
      user_id = req.user.id;
    }

    if (!user_id || !shift_id) {
      return res.status(400).json({ success: false, message: "user_id and shift_id are required" });
    }

    // Verify user belongs to the company
    const userCheck = await client.query(
      "SELECT id FROM users WHERE id = $1 AND company_id = $2",
      [user_id, company_id]
    );
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Employee not found in company" });
    }

    await client.query("BEGIN");

    // Check for open punch (where punch_out_at is null)
    const openPunchRes = await client.query(
      `SELECT id, punch_in_at FROM attendance 
       WHERE user_id = $1 AND punch_out_at IS NULL 
       ORDER BY punch_in_at DESC LIMIT 1`,
      [user_id]
    );

    const now = punch_time ? new Date(punch_time) : new Date();

    if (openPunchRes.rows.length > 0) {
      // Punch Out
      const punchId = openPunchRes.rows[0].id;
      const punchInAt = new Date(openPunchRes.rows[0].punch_in_at);
      
      // Calculate total_time
      let totalTimeStr = null;
      const diffMs = now - punchInAt;
      if (diffMs >= 0) {
        const diffHrs = Math.floor(diffMs / 3600000);
        const diffMins = Math.floor((diffMs % 3600000) / 60000);
        const diffSecs = Math.floor((diffMs % 60000) / 1000);
        totalTimeStr = `${String(diffHrs).padStart(2, '0')}:${String(diffMins).padStart(2, '0')}:${String(diffSecs).padStart(2, '0')}`;
      }

      const result = await client.query(
        `UPDATE attendance 
         SET 
           punch_out_at = $1, 
           punch_out_type = $2, 
           punch_out_longitude = $3, 
           punch_out_latitude = $4, 
           total_time = $5, 
           updated_by = $6, 
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $7 RETURNING *`,
        [
          now,
          punch_type || 'biometric',
          longitude ? String(longitude) : null,
          latitude ? String(latitude) : null,
          totalTimeStr,
          req.user.id,
          punchId
        ]
      );
      await client.query("COMMIT");
      return res.status(200).json({
        success: true,
        message: "Punched out successfully",
        log: result.rows[0]
      });
    } else {
      // Punch In
      const result = await client.query(
        `INSERT INTO attendance (
          user_id, 
          shift_id, 
          punch_in_at, 
          punch_out_at, 
          punch_in_type, 
          punch_in_longitude, 
          punch_in_latitude, 
      
          created_by
         )
         VALUES ($1, $2, $3, NULL, $4, $5, $6, $7) RETURNING *`,
        [
          user_id,
          shift_id,
          now,
          punch_type || 'biometric',
          longitude ? String(longitude) : null,
          latitude ? String(latitude) : null,
          req.user.id
        ]
      );
      await client.query("COMMIT");
      return res.status(201).json({
        success: true,
        message: "Punched in successfully",
        log: result.rows[0]
      });
    }
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("PUNCH ATTENDANCE ERROR:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  } finally {
    client.release();
  }
};

// =====================================
// ASSIGN SHIFT TO EMPLOYEE
// =====================================
exports.assignShift = async (req, res) => {
  const client = await pool.connect();
  try {
    const { user_id, shift_id } = req.body;
    const company_id = req.user.company_id;

    if (!user_id || !shift_id) {
      return res.status(400).json({ success: false, message: "user_id and shift_id are required" });
    }

    // Verify user belongs to the company
    const userCheck = await client.query(
      "SELECT id FROM users WHERE id = $1 AND company_id = $2",
      [user_id, company_id]
    );
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Employee not found in company" });
    }

    // Verify shift belongs to company
    const shiftCheck = await client.query(
      "SELECT id FROM shift WHERE id = $1 AND company_id = $2",
      [shift_id, company_id]
    );
    if (shiftCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Shift not found in company" });
    }

    await client.query("BEGIN");

    // Remove existing assignments to avoid duplicates
    await client.query("DELETE FROM assign_shift WHERE user_id = $1", [user_id]);

    const result = await client.query(
      `INSERT INTO assign_shift (user_id, shift_id, created_by)
       VALUES ($1, $2, $3) RETURNING *`,
      [user_id, shift_id, req.user.id]
    );

    await client.query("COMMIT");

    res.status(200).json({
      success: true,
      message: "Shift assigned successfully",
      assignment: result.rows[0]
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("ASSIGN SHIFT ERROR:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  } finally {
    client.release();
  }
};

// =====================================
// GET SHIFT ASSIGNMENTS FOR COMPANY
// =====================================
exports.getShiftAssignments = async (req, res) => {
  try {
    const company_id = req.user.company_id;

    const result = await pool.query(
      `
      SELECT 
        u.id as user_id,
        CONCAT(u.first_name, ' ', u.last_name) as employee_name,
        u.email as employee_email,
        u.company_employee_id as employee_code,
        s.id as shift_id,
        s.shift_name as shift_name,
        s.start_time as shift_start_time,
        s.end_time as shift_end_time
      FROM users u
      LEFT JOIN assign_shift ash ON u.id = ash.user_id
      LEFT JOIN shift s ON ash.shift_id = s.id
      WHERE u.company_id = $1
      ORDER BY u.id DESC
      `,
      [company_id]
    );

    res.status(200).json({
      success: true,
      assignments: result.rows,
    });
  } catch (error) {
    console.error("GET SHIFT ASSIGNMENTS ERROR:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// =====================================
// ADD MANUAL ATTENDANCE
// =====================================
exports.addManualAttendance = async (req, res) => {
  const client = await pool.connect();
  try {
    const { user_id, shift_id, punch_in_at, punch_out_at } = req.body;
    const company_id = req.user.company_id;

    if (!user_id || !shift_id || !punch_in_at || !punch_out_at) {
      return res.status(400).json({
        success: false,
        message: "user_id, shift_id, punch_in_at and punch_out_at are required"
      });
    }

    // Verify employee belongs to company
    const userCheck = await client.query(
      "SELECT id FROM users WHERE id = $1 AND company_id = $2",
      [user_id, company_id]
    );
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Employee not found in company" });
    }

    // Verify shift belongs to company
    const shiftCheck = await client.query(
      "SELECT id FROM shift WHERE id = $1 AND company_id = $2",
      [shift_id, company_id]
    );
    if (shiftCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Shift not found in company" });
    }

    // Calculate total time
    const pIn = new Date(punch_in_at);
    const pOut = new Date(punch_out_at);
    let totalTimeStr = null;
    const diffMs = pOut - pIn;
    if (diffMs >= 0) {
      const diffHrs = Math.floor(diffMs / 3600000);
      const diffMins = Math.floor((diffMs % 3600000) / 60000);
      const diffSecs = Math.floor((diffMs % 60000) / 1000);
      totalTimeStr = `${String(diffHrs).padStart(2, '0')}:${String(diffMins).padStart(2, '0')}:${String(diffSecs).padStart(2, '0')}`;
    }

    await client.query("BEGIN");

    const result = await client.query(
      `INSERT INTO attendance (
        user_id, 
        shift_id, 
        punch_in_at, 
        punch_out_at, 
        punch_in_type, 
        punch_out_type, 
        total_time, 
        created_by
       )
       VALUES ($1, $2, $3, $4, 'manual', 'manual', $5, $6) RETURNING *`,
      [user_id, shift_id, pIn, pOut, totalTimeStr, req.user.id]
    );

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      message: "Manual attendance added successfully",
      log: result.rows[0]
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("ADD MANUAL ATTENDANCE ERROR:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  } finally {
    client.release();
  }
};
