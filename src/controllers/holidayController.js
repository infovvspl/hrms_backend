const pool = require("../config/database");

// =================================
// CREATE HOLIDAY
// =================================
exports.createHoliday = async (req, res) => {
  try {
    const { name, from_date, to_date, is_optional } = req.body;
    const company_id = req.user.company_id;
    let created_by = req.user.id;

    // Verify if created_by user exists in DB to prevent foreign key constraint violations
    if (created_by) {
      const userCheck = await pool.query("SELECT id FROM users WHERE id = $1", [created_by]);
      if (userCheck.rows.length === 0) {
        created_by = null;
      }
    }

    if (!name || !from_date || !to_date) {
      return res.status(400).json({
        success: false,
        message: "Name, from_date and to_date are required",
      });
    }

    // Find first available ID
    const idResult = await pool.query(`
      SELECT COALESCE(
        (
          SELECT MIN(h1.id + 1)
          FROM holiday h1
          LEFT JOIN holiday h2
          ON h1.id + 1 = h2.id
          WHERE h2.id IS NULL
        ),
        1
      ) AS next_id
    `);
    const nextId = idResult.rows[0].next_id;

    const result = await pool.query(
      `
      INSERT INTO holiday
      (id, company_id, name, from_date, to_date, created_by, is_optional)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
      `,
      [nextId, company_id, name, from_date, to_date, created_by, is_optional || false]
    );

    res.status(201).json({
      success: true,
      message: "Holiday created successfully",
      holiday: result.rows[0],
    });
  } catch (error) {
    console.error("createHoliday error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =================================
// GET ALL HOLIDAYS
// =================================
exports.getHolidays = async (req, res) => {
  try {
    const company_id = req.user.company_id;

    const result = await pool.query(
      `
      SELECT id, name, from_date, to_date, is_optional, created_at
      FROM holiday
      WHERE company_id = $1
      ORDER BY from_date ASC
      `,
      [company_id]
    );

    res.status(200).json({
      success: true,
      holidays: result.rows,
    });
  } catch (error) {
    console.error("getHolidays error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =================================
// UPDATE HOLIDAY
// =================================
exports.updateHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, from_date, to_date, is_optional } = req.body;
    let updated_by = req.user.id;
    const company_id = req.user.company_id;

    // Verify if updated_by user exists in DB to prevent foreign key constraint violations
    if (updated_by) {
      const userCheck = await pool.query("SELECT id FROM users WHERE id = $1", [updated_by]);
      if (userCheck.rows.length === 0) {
        updated_by = null;
      }
    }

    if (!name || !from_date || !to_date) {
      return res.status(400).json({
        success: false,
        message: "Name, from_date and to_date are required",
      });
    }

    const result = await pool.query(
      `
      UPDATE holiday
      SET name = $1, from_date = $2, to_date = $3, is_optional = $4, updated_by = $5, updated_at = NOW()
      WHERE id = $6 AND company_id = $7
      RETURNING *
      `,
      [name, from_date, to_date, is_optional || false, updated_by, id, company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Holiday not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Holiday updated successfully",
      holiday: result.rows[0],
    });
  } catch (error) {
    console.error("updateHoliday error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =================================
// DELETE HOLIDAY
// =================================
exports.deleteHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const company_id = req.user.company_id;

    const result = await pool.query(
      `
      DELETE FROM holiday
      WHERE id = $1 AND company_id = $2
      RETURNING *
      `,
      [id, company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Holiday not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Holiday deleted successfully",
    });
  } catch (error) {
    console.error("deleteHoliday error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
