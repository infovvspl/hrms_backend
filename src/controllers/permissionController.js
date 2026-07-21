const pool = require("../config/database");

// =====================================
// GET ALL PERMISSIONS (AUTO-SEEDS DEFAULTS ON FIRST FETCH)
// =====================================
exports.getPermissions = async (req, res) => {
  try {
    const company_id = req.user.company_id;

    // Check if permissions exist for this company
    let result = await pool.query(
      `SELECT * FROM permissions WHERE company_id = $1 ORDER BY id ASC`,
      [company_id]
    );

    // Auto-seed default permissions if none exist for this company
    if (result.rows.length === 0) {
      const defaultPerms = [
        { name: "Dashboard View", desc: "Access the main company dashboard and summaries" },
        { name: "My Dashboard View", desc: "Access employee personal dashboard" },
        
        { name: "My Profile View", desc: "Access own profile details" },
        { name: "My Attendance View", desc: "Access own attendance records" },
        { name: "My Leaves View", desc: "Access own leave overview" },
        { name: "Apply Leave", desc: "Ability to apply for leave" },
        { name: "My Leave History", desc: "Access own leave history" },
        { name: "My Payroll View", desc: "Access own payroll and payslips" },
        { name: "My Assets View", desc: "Access own assigned assets" },
        { name: "My Travel View", desc: "Access own travel requests" },
        { name: "My Documents View", desc: "Access own documents" },
        { name: "My Login History View", desc: "Access own login history" },
        { name: "Resignation Apply", desc: "Ability to apply for resignation" },

        { name: "Employee List View", desc: "View all employees" },
        { name: "Offer Letters Admin", desc: "Manage offer letters" },
        { name: "Experience Letters Admin", desc: "Manage experience letters" },
        { name: "Relieving Letters Admin", desc: "Manage relieving letters" },
        { name: "Warning Letters Admin", desc: "Manage warning letters" },
        { name: "Termination Letters Admin", desc: "Manage termination letters" },

        { name: "Attendance Admin Dashboard", desc: "View attendance admin dashboard" },
        { name: "Daily Tracking Admin", desc: "Manage daily tracking of employees" },
        { name: "Shifts Admin", desc: "Manage company shifts" },

        { name: "Holidays Admin", desc: "Manage company holidays" },
        { name: "Holiday Calendar View", desc: "View holiday calendar" },

        { name: "Leave Admin Dashboard", desc: "View leave admin dashboard" },
        { name: "Leave Requests Admin", desc: "Manage employee leave requests" },
        { name: "Leave Types Admin", desc: "Manage leave types configuration" },

        { name: "Payroll Admin Dashboard", desc: "View payroll admin dashboard" },
        { name: "Salary Details Admin", desc: "Manage employee salary details" },
        { name: "Payslips Admin", desc: "Manage and generate payslips" },

        { name: "Resume Analyser", desc: "Use resume analyser tool" },
        { name: "Interview Scheduler", desc: "Schedule and manage interviews" },

        { name: "Assets Admin", desc: "Manage company assets" },
        { name: "Travel Admin", desc: "Manage travel requests" },
        { name: "Company Login History", desc: "View company-wide login history" },
];

      for (const p of defaultPerms) {
        await pool.query(
          `INSERT INTO permissions (company_id, name, description) VALUES ($1, $2, $3)`,
          [company_id, p.name, p.desc]
        );
      }

      // Re-fetch
      result = await pool.query(
        `SELECT * FROM permissions WHERE company_id = $1 ORDER BY id ASC`,
        [company_id]
      );
    }

    res.status(200).json({
      success: true,
      permissions: result.rows,
    });
  } catch (error) {
    console.error("getPermissions error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================
// GET MAPPED PERMISSIONS FOR ROLE
// =====================================
exports.getRolePermissions = async (req, res) => {
  try {
    const { roleId } = req.params;

    const result = await pool.query(
      `SELECT permission_id FROM role_permissions WHERE role_id = $1`,
      [roleId]
    );

    res.status(200).json({
      success: true,
      permissions: result.rows.map((r) => r.permission_id),
    });
  } catch (error) {
    console.error("getRolePermissions error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================
// UPDATE MAPPED PERMISSIONS FOR ROLE
// =====================================
exports.updateRolePermissions = async (req, res) => {
  const client = await pool.connect();
  try {
    const { roleId } = req.params;
    const { permission_ids } = req.body; // Array of permission IDs
    const created_by = req.user.id;

    await client.query("BEGIN");

    // 1. Delete all existing mappings for the role
    await client.query(
      `DELETE FROM role_permissions WHERE role_id = $1`,
      [roleId]
    );

    // 2. Insert new mappings if any
    if (permission_ids && permission_ids.length > 0) {
      for (const permId of permission_ids) {
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id, created_by)
           VALUES ($1, $2, $3)`,
          [roleId, permId, created_by]
        );
      }
    }

    await client.query("COMMIT");

    res.status(200).json({
      success: true,
      message: "Role permissions updated successfully",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("updateRolePermissions error:", error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
};

// =====================================
// GET CURRENT USER'S ACTIVE PERMISSIONS
// =====================================
exports.getMyPermissions = async (req, res) => {
  try {
    const { role, id, company_id } = req.user;

    // Company Admin has all permissions seeded
    if (role === "company" || role !== "employee") {
      const result = await pool.query(
        `SELECT name FROM permissions WHERE company_id = $1`,
        [company_id]
      );
      return res.status(200).json({
        success: true,
        permissions: result.rows.map((r) => r.name),
      });
    }

    // Employee - check users table for role_id
    const empResult = await pool.query(
      `SELECT role_id FROM users WHERE id = $1`,
      [id]
    );

    if (empResult.rows.length === 0 || !empResult.rows[0].role_id) {
      return res.status(200).json({
        success: true,
        permissions: [],
      });
    }

    const role_id = empResult.rows[0].role_id;

    // Fetch mapped permissions
    const permsResult = await pool.query(
      `SELECT p.name 
       FROM role_permissions rp
       JOIN permissions p ON rp.permission_id = p.id
       WHERE rp.role_id = $1`,
      [role_id]
    );

    res.status(200).json({
      success: true,
      permissions: permsResult.rows.map((r) => r.name),
    });
  } catch (error) {
    console.error("getMyPermissions error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
