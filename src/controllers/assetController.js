const pool = require("../config/database");

// ============================================================
// ==================== ASSET CRUD ==========================
// ============================================================

// =================================
// CREATE ASSET
// =================================
exports.createAsset = async (req, res) => {
  try {
    const { asset_name, branch_id, purchase_date, vendor_name, price, bill } =
      req.body;
    const created_by = req.user.id;

    if (!asset_name) {
      return res
        .status(400)
        .json({ success: false, message: "Asset name is required" });
    }

    const result = await pool.query(
      `INSERT INTO asset
        (asset_name, branch_id, purchase_date, vendor_name, price, bill, created_by, updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$7)
       RETURNING *`,
      [asset_name, branch_id || null, purchase_date || null, vendor_name || null, price || 0, bill || null, created_by]
    );

    res.status(201).json({
      success: true,
      message: "Asset created successfully",
      asset: result.rows[0],
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// =================================
// GET ALL ASSETS (filtered by company)
// =================================
exports.getAssets = async (req, res) => {
  try {
    const company_id = req.user.company_id;

    const result = await pool.query(
      `SELECT a.*, b.name AS branch_name
       FROM asset a
       LEFT JOIN branch b ON a.branch_id = b.id
       WHERE (b.company_id = $1 OR a.branch_id IS NULL)
       ORDER BY a.id DESC`,
      [company_id]
    );

    res.status(200).json({ success: true, assets: result.rows });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// =================================
// GET SINGLE ASSET
// =================================
exports.getAsset = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT a.*, b.name AS branch_name
       FROM asset a
       LEFT JOIN branch b ON a.branch_id = b.id
       WHERE a.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Asset not found" });
    }

    res.status(200).json({ success: true, asset: result.rows[0] });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// =================================
// UPDATE ASSET
// =================================
exports.updateAsset = async (req, res) => {
  try {
    const { id } = req.params;
    const { asset_name, branch_id, purchase_date, vendor_name, price, bill } =
      req.body;
    const updated_by = req.user.id;

    const result = await pool.query(
      `UPDATE asset
       SET asset_name=$1, branch_id=$2, purchase_date=$3, vendor_name=$4, price=$5, bill=$6,
           updated_by=$7, updated_at=NOW()
       WHERE id=$8
       RETURNING *`,
      [asset_name, branch_id || null, purchase_date || null, vendor_name || null, price || 0, bill || null, updated_by, id]
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Asset not found" });
    }

    res.status(200).json({
      success: true,
      message: "Asset updated successfully",
      asset: result.rows[0],
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// =================================
// DELETE ASSET
// =================================
exports.deleteAsset = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM asset WHERE id=$1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Asset not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "Asset deleted successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
// ==================== ASSET ASSIGN CRUD ===================
// ============================================================

// =================================
// ASSIGN ASSET TO USER
// =================================
exports.assignAsset = async (req, res) => {
  try {
    const { user_id, asset_id } = req.body;
    const created_by = req.user.id;

    if (!user_id || !asset_id) {
      return res
        .status(400)
        .json({ success: false, message: "user_id and asset_id are required" });
    }

    // Check if asset is already assigned
    const existing = await pool.query(
      "SELECT id FROM asset_assign WHERE asset_id=$1",
      [asset_id]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Asset is already assigned to someone",
      });
    }

    const result = await pool.query(
      `INSERT INTO asset_assign (user_id, asset_id, created_by, updated_by)
       VALUES ($1,$2,$3,$3)
       RETURNING *`,
      [user_id, asset_id, created_by]
    );

    res.status(201).json({
      success: true,
      message: "Asset assigned successfully",
      assignment: result.rows[0],
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// =================================
// GET ALL ASSIGNMENTS
// =================================
exports.getAssignments = async (req, res) => {
  try {
    const company_id = req.user.company_id;

    const result = await pool.query(
      `SELECT aa.*,
              a.asset_name,
              a.vendor_name,
              a.price,
              CONCAT(u.first_name, ' ', u.last_name) AS employee_name,
              u.email AS employee_email
       FROM asset_assign aa
       JOIN asset a ON aa.asset_id = a.id
       JOIN users u ON aa.user_id = u.id
       WHERE u.company_id = $1
       ORDER BY aa.id DESC`,
      [company_id]
    );

    res.status(200).json({ success: true, assignments: result.rows });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// =================================
// UPDATE ASSIGNMENT
// =================================
exports.updateAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, asset_id } = req.body;
    const updated_by = req.user.id;

    const result = await pool.query(
      `UPDATE asset_assign
       SET user_id=$1, asset_id=$2, updated_by=$3, updated_at=NOW()
       WHERE id=$4
       RETURNING *`,
      [user_id, asset_id, updated_by, id]
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Assignment not found" });
    }

    res.status(200).json({
      success: true,
      message: "Assignment updated successfully",
      assignment: result.rows[0],
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// =================================
// DELETE ASSIGNMENT (Unassign)
// =================================
exports.deleteAssignment = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM asset_assign WHERE id=$1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Assignment not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "Asset unassigned successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
// ==================== ASSET REPAIR CRUD ===================
// ============================================================

// =================================
// CREATE REPAIR RECORD
// =================================
exports.createRepair = async (req, res) => {
  try {
    const { asset_id, repair_date, vendor_name, repair_price, description } =
      req.body;
    const repair_done_by = req.user.id;

    if (!asset_id) {
      return res
        .status(400)
        .json({ success: false, message: "asset_id is required" });
    }

    const result = await pool.query(
      `INSERT INTO asset_repair
        (asset_id, repair_date, vendor_name, repair_price, description, repair_done_by)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [asset_id, repair_date || null, vendor_name || null, repair_price || 0, description || null, repair_done_by]
    );

    res.status(201).json({
      success: true,
      message: "Repair record created successfully",
      repair: result.rows[0],
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// =================================
// GET ALL REPAIRS
// =================================
exports.getRepairs = async (req, res) => {
  try {
    const company_id = req.user.company_id;

    const result = await pool.query(
      `SELECT ar.*,
              a.asset_name,
              CONCAT(u.first_name, ' ', u.last_name) AS repaired_by_name
       FROM asset_repair ar
       JOIN asset a ON ar.asset_id = a.id
       LEFT JOIN users u ON ar.repair_done_by = u.id
       LEFT JOIN branch b ON a.branch_id = b.id
       WHERE b.company_id = $1 OR a.branch_id IS NULL
       ORDER BY ar.id DESC`,
      [company_id]
    );

    res.status(200).json({ success: true, repairs: result.rows });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// =================================
// UPDATE REPAIR
// =================================
exports.updateRepair = async (req, res) => {
  try {
    const { id } = req.params;
    const { asset_id, repair_date, vendor_name, repair_price, description } =
      req.body;
    const repair_done_by = req.user.id;

    const result = await pool.query(
      `UPDATE asset_repair
       SET asset_id=$1, repair_date=$2, vendor_name=$3, repair_price=$4,
           description=$5, repair_done_by=$6, updated_at=NOW()
       WHERE id=$7
       RETURNING *`,
      [asset_id, repair_date || null, vendor_name || null, repair_price || 0, description || null, repair_done_by, id]
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Repair record not found" });
    }

    res.status(200).json({
      success: true,
      message: "Repair record updated successfully",
      repair: result.rows[0],
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// =================================
// DELETE REPAIR
// =================================
exports.deleteRepair = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM asset_repair WHERE id=$1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Repair record not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "Repair record deleted successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};
