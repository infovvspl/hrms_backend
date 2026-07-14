const pool = require("../config/database");
const bcrypt = require("bcryptjs");

// =================================
// CREATE BRANCH
// =================================
exports.createBranch = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      address1,
      address2,
      city,
      country,
      state,
      pincode,
      longitude,
      latitude,
    } = req.body;

    const company_id = req.user.company_id;
    const created_by = req.user.id;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, Email and Password required",
      });
    }

    const existing = await pool.query("SELECT id FROM branch WHERE email=$1", [
      email,
    ]);

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Branch email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Find first available ID
    const idResult = await pool.query(`
  SELECT COALESCE(
    (
      SELECT MIN(b1.id + 1)
      FROM branch b1
      LEFT JOIN branch b2
      ON b1.id + 1 = b2.id
      WHERE b2.id IS NULL
    ),
    1
  ) AS next_id
`);

    const nextId = idResult.rows[0].next_id;

    // Insert using that ID
    const result = await pool.query(
      `
  INSERT INTO branch
  (
    id,
    company_id,
    name,
    email,
    password,
    phone,
    address1,
    address2,
    city,
    country,
    state,
    pincode,
    longitude,
    latitude,
    created_by
  )
  VALUES
  ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
  RETURNING *
  `,
      [
        nextId,
        company_id,
        name,
        email,
        hashedPassword,
        phone,
        address1,
        address2,
        city,
        country,
        state,
        pincode,
        longitude,
        latitude,
        created_by,
      ],
    );
    res.status(201).json({
      success: true,
      message: "Branch created successfully",
      branch: result.rows[0],
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =================================
// GET ALL BRANCHES
// =================================
exports.getBranches = async (req, res) => {
  try {
    const company_id = req.user.company_id;

    const result = await pool.query(
      `
      SELECT
        id,
        name,
        email,
        phone,
        address1,
        address2,
        city,
        country,
        state,
        pincode,
        longitude,
        latitude,
        created_at
      FROM branch
      WHERE company_id=$1
      ORDER BY id DESC
      `,
      [company_id],
    );

    res.status(200).json({
      success: true,
      branches: result.rows,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =================================
// UPDATE BRANCH
// =================================
exports.updateBranch = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      name,
      email,
      phone,
      address1,
      address2,
      city,
      country,
      state,
      pincode,
      longitude,
      latitude,
    } = req.body;

    const updated_by = req.user.id;

    const result = await pool.query(
      `
      UPDATE branch
      SET
        name=$1,
        email=$2,
        phone=$3,
        address1=$4,
        address2=$5,
        city=$6,
        country=$7,
        state=$8,
        pincode=$9,
        longitude=$10,
        latitude=$11,
        updated_by=$12,
        updated_at=NOW()
      WHERE id=$13
      RETURNING *
      `,
      [
        name,
        email,
        phone,
        address1,
        address2,
        city,
        country,
        state,
        pincode,
        longitude,
        latitude,
        updated_by,
        id,
      ],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Branch not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Branch updated successfully",
      branch: result.rows[0],
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =================================
// DELETE BRANCH
// =================================
exports.deleteBranch = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      DELETE FROM branch
      WHERE id=$1
      RETURNING *
      `,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Branch not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Branch deleted successfully",
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
