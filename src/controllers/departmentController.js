const pool = require("../config/database");

// =================================
// CREATE DEPARTMENT
// =================================
exports.createDepartment = async (req, res) => {
  try {
    const { department_name, department_head } = req.body;

    const company_id = req.user.company_id;
    const created_by = req.user.id;

    if (!department_name) {
      return res.status(400).json({
        success: false,
        message: "Department name is required",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO departments
      (
        company_id,
        department_name,
        department_head,
        created_by
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [company_id, department_name, department_head || null, created_by]
    );

    res.status(201).json({
      success: true,
      department: result.rows[0],
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// =================================
// GET ALL DEPARTMENTS
// =================================
exports.getDepartments = async (req, res) => {
  try {
    const company_id = req.user.company_id;

    const result = await pool.query(
      `
      SELECT
        id,
        department_name,
        department_head,
        created_by,
        updated_by,
        created_at,
        updated_at
      FROM departments
      WHERE company_id = $1
      ORDER BY id DESC
      `,
      [company_id]
    );

    res.status(200).json({
      success: true,
      departments: result.rows,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// =================================
// UPDATE DEPARTMENT
// =================================
exports.updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { department_name, department_head } = req.body;

    const company_id = req.user.company_id;
    const updated_by = req.user.id;

    if (!department_name) {
      return res.status(400).json({
        success: false,
        message: "Department name is required",
      });
    }

    const result = await pool.query(
      `
      UPDATE departments
      SET
        department_name = $1,
        department_head = $2,
        updated_by = $3,
        updated_at = NOW()
      WHERE id = $4
      AND company_id = $5
      RETURNING *
      `,
      [department_name, department_head || null, updated_by, id, company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    res.status(200).json({
      success: true,
      department: result.rows[0],
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// =================================
// DELETE DEPARTMENT
// =================================
exports.deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const company_id = req.user.company_id;

    const result = await pool.query(
      `
      DELETE FROM departments
      WHERE id = $1
      AND company_id = $2
      RETURNING *
      `,
      [id, company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Department deleted successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

