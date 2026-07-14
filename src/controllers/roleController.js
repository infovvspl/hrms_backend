const pool = require("../config/database");

// ======================
// CREATE ROLE
// ======================
exports.createRole = async (req, res) => {
  try {
    const { role_name } = req.body;

    const company_id = req.user.company_id;
    const created_by = req.user.id;

    // Find first available ID (fill deleted gaps)
    const idResult = await pool.query(`
      WITH RECURSIVE nums AS (
        SELECT 1 AS id
        UNION ALL
        SELECT id + 1
        FROM nums
        WHERE id < (SELECT COALESCE(MAX(id),0) + 1 FROM roles)
      )
      SELECT MIN(nums.id) AS next_id
      FROM nums
      LEFT JOIN roles r ON nums.id = r.id
      WHERE r.id IS NULL;
    `);

    const nextId = idResult.rows[0].next_id;

    const result = await pool.query(
      `
      INSERT INTO roles
      (
        id,
        company_id,
        role_name,
        created_by
      )
      VALUES ($1,$2,$3,$4)
      RETURNING *
      `,
      [
        nextId,
        company_id,
        role_name,
        created_by
      ]
    );

    res.status(201).json({
      success: true,
      role: result.rows[0]
    });

  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ======================
// GET ALL ROLES
// ======================
exports.getRoles = async (req, res) => {
  try {

    const company_id = req.user.company_id;

    const result = await pool.query(
      `
      SELECT *
      FROM roles
      WHERE company_id=$1
      ORDER BY id DESC
      `,
      [company_id]
    );

    res.status(200).json({
      success: true,
      roles: result.rows
    });

  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ======================
// UPDATE ROLE
// ======================
exports.updateRole = async (req, res) => {
  try {

    const { id } = req.params;
    const { role_name } = req.body;

    const updated_by = req.user.id;

    const result = await pool.query(
      `
      UPDATE roles
      SET
        role_name=$1,
        updated_by=$2,
        updated_at=CURRENT_TIMESTAMP
      WHERE id=$3
      RETURNING *
      `,
      [
        role_name,
        updated_by,
        id
      ]
    );

    res.status(200).json({
      success: true,
      role: result.rows[0]
    });

  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ======================
// DELETE ROLE
// ======================
exports.deleteRole = async (req, res) => {
  try {

    const { id } = req.params;

    await pool.query(
      `
      DELETE FROM roles
      WHERE id=$1
      `,
      [id]
    );

    res.status(200).json({
      success: true,
      message: "Role deleted successfully"
    });

  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};