const pool = require("../config/database");

// =================================
// CREATE LEAVE TYPE
// =================================
exports.createLeaveType = async (req, res) => {
  try {
    const { name, credit_type, carry_forward, total_leave } = req.body;
    const company_id = req.user.company_id;
    let created_by = req.user.id;

    // Verify if created_by user exists in DB to prevent foreign key constraint violations
    if (created_by) {
      const userCheck = await pool.query("SELECT id FROM users WHERE id = $1", [created_by]);
      if (userCheck.rows.length === 0) {
        created_by = null;
      }
    }

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    // Find first available ID
    const idResult = await pool.query(`
      SELECT COALESCE(
        (
          SELECT MIN(l1.id + 1)
          FROM leave_types l1
          LEFT JOIN leave_types l2
          ON l1.id + 1 = l2.id
          WHERE l2.id IS NULL
        ),
        1
      ) AS next_id
    `);
    const nextId = idResult.rows[0].next_id;

    const result = await pool.query(
      `
      INSERT INTO leave_types
      (id, company_id, name, credit_type, carry_forward, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
      [
        nextId,
        company_id,
        name,
        credit_type || null,
        carry_forward || null,
        created_by,
      ]
    );

    const newLt = result.rows[0];

    // Automatically create remaining_leave rows for all existing employees in the company for this new leave type
    try {
      const usersResult = await pool.query("SELECT id FROM users WHERE company_id = $1", [company_id]);
      const totalVal = total_leave !== undefined ? Number(total_leave) : 0;
      
      for (const u of usersResult.rows) {
        // Find next ID for remaining_leave
        const rlIdRes = await pool.query(`
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
        const rlNextId = rlIdRes.rows[0].next_id;

        await pool.query(
          `INSERT INTO remaining_leave (id, user_id, leave_types, credit_leave, balance_leave, total_leave)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [rlNextId, u.id, newLt.id, totalVal, totalVal, totalVal]
        );
      }
    } catch (err) {
      console.error("Error creating default remaining leaves on leave type creation:", err);
    }

    res.status(201).json({
      success: true,
      message: "Leave Type created successfully",
      leaveType: {
        ...newLt,
        total_leave: total_leave !== undefined ? Number(total_leave) : 0
      },
    });
  } catch (error) {
    console.error("createLeaveType error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =================================
// GET ALL LEAVE TYPES
// =================================
exports.getLeaveTypes = async (req, res) => {
  try {
    const company_id = req.user.company_id;

    const result = await pool.query(
      `
      SELECT lt.*, COALESCE((SELECT MAX(total_leave) FROM remaining_leave WHERE leave_types = lt.id), 0) AS total_leave
      FROM leave_types lt
      WHERE lt.company_id = $1
      ORDER BY lt.id ASC
      `,
      [company_id]
    );

    res.status(200).json({
      success: true,
      leaveTypes: result.rows,
    });
  } catch (error) {
    console.error("getLeaveTypes error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =================================
// UPDATE LEAVE TYPE
// =================================
exports.updateLeaveType = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, credit_type, carry_forward, total_leave } = req.body;
    let updated_by = req.user.id;
    const company_id = req.user.company_id;

    // Verify if updated_by user exists in DB to prevent foreign key constraint violations
    if (updated_by) {
      const userCheck = await pool.query("SELECT id FROM users WHERE id = $1", [updated_by]);
      if (userCheck.rows.length === 0) {
        updated_by = null;
      }
    }

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    const result = await pool.query(
      `
      UPDATE leave_types
      SET name = $1, credit_type = $2, carry_forward = $3, updated_by = $4, updated_at = NOW()
      WHERE id = $5 AND company_id = $6
      RETURNING *
      `,
      [
        name,
        credit_type || null,
        carry_forward || null,
        updated_by,
        id,
        company_id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Leave Type not found",
      });
    }

    // Sync total leave adjustments to employee balances
    if (total_leave !== undefined) {
      const totalVal = Number(total_leave);
      await pool.query(
        `
        UPDATE remaining_leave
        SET 
          balance_leave = balance_leave + ($1 - total_leave),
          credit_leave = credit_leave + ($1 - total_leave),
          total_leave = $1
        WHERE leave_types = $2
        `,
        [totalVal, id]
      );
    }

    res.status(200).json({
      success: true,
      message: "Leave Type updated successfully",
      leaveType: {
        ...result.rows[0],
        total_leave: total_leave !== undefined ? Number(total_leave) : 0
      },
    });
  } catch (error) {
    console.error("updateLeaveType error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =================================
// DELETE LEAVE TYPE
// =================================
exports.deleteLeaveType = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const company_id = req.user.company_id;

    await client.query("BEGIN");

    // 1. Delete employee balances associated with this leave type
    await client.query(
      `DELETE FROM remaining_leave WHERE leave_types = $1`,
      [id]
    );

    // 2. Delete employee leave request logs associated with this leave type
    await client.query(
      `DELETE FROM leave WHERE leave_types = $1`,
      [id]
    );

    // 3. Delete the leave type config itself
    const result = await client.query(
      `
      DELETE FROM leave_types
      WHERE id = $1 AND company_id = $2
      RETURNING *
      `,
      [id, company_id]
    );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        message: "Leave Type not found",
      });
    }

    await client.query("COMMIT");
    res.status(200).json({
      success: true,
      message: "Leave Type deleted successfully",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("deleteLeaveType error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  } finally {
    client.release();
  }
};
