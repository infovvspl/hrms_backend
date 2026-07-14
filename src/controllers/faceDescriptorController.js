const pool = require("../config/database");

// =====================================
// REGISTER / UPDATE FACE DESCRIPTOR
// =====================================
exports.registerFaceDescriptor = async (req, res) => {
  const client = await pool.connect();
  try {
    let { user_id, descriptor } = req.body;
    const company_id = req.user.company_id;

    if (req.user.role === "employee") {
      user_id = req.user.id;
    } else if (!user_id) {
      user_id = req.user.id;
    }

    if (!descriptor || !Array.isArray(descriptor)) {
      return res.status(400).json({
        success: false,
        message: "descriptor array is required",
      });
    }

    // Verify user exists and belongs to same company
    const userCheck = await client.query(
      "SELECT id FROM users WHERE id = $1 AND company_id = $2",
      [user_id, company_id]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found in this company",
      });
    }

    await client.query("BEGIN");

    // Remove existing descriptor if any
    await client.query(
      "DELETE FROM face_descriptor WHERE user_id = $1",
      [user_id]
    );

    // Insert new descriptor
    const result = await client.query(
      `INSERT INTO face_descriptor (user_id, descriptor)
       VALUES ($1, $2)
       RETURNING *`,
      [user_id, descriptor]
    );

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      message: "Face descriptor registered successfully",
      data: result.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("REGISTER FACE DESCRIPTOR ERROR:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  } finally {
    client.release();
  }
};

// =====================================
// GET FACE DESCRIPTOR BY USER ID
// =====================================
exports.getFaceDescriptorByUserId = async (req, res) => {
  try {
    const { user_id } = req.params;
    const company_id = req.user.company_id;

    // Verify user belongs to same company
    const userCheck = await pool.query(
      "SELECT id FROM users WHERE id = $1 AND company_id = $2",
      [user_id, company_id]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found in this company",
      });
    }

    const result = await pool.query(
      "SELECT * FROM face_descriptor WHERE user_id = $1",
      [user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Face descriptor not found for this user",
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("GET FACE DESCRIPTOR ERROR:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// =====================================
// GET ALL FACE DESCRIPTORS FOR COMPANY
// =====================================
exports.getAllFaceDescriptors = async (req, res) => {
  try {
    const company_id = req.user.company_id;

    const result = await pool.query(
      `SELECT fd.*, u.first_name, u.last_name, u.email, u.company_employee_id
       FROM face_descriptor fd
       JOIN users u ON fd.user_id = u.id
       WHERE u.company_id = $1`,
      [company_id]
    );

    res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("GET ALL FACE DESCRIPTORS ERROR:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
