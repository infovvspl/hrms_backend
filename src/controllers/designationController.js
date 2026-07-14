const pool = require("../config/database"); // your postgres pool

// CREATE
// CREATE
exports.createDesignation = async (req, res) => {
  try {
    console.log("REQ.USER:", req.user);
    console.log("BODY:", req.body);

    const { title } = req.body;
    const company_id = req.user.company_id;
    const created_by = req.user.id;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Designation title is required",
      });
    }

    // Find first available ID
    const idResult = await pool.query(`
      SELECT COALESCE(
        (
          SELECT MIN(d1.id + 1)
          FROM designations d1
          LEFT JOIN designations d2
          ON d1.id + 1 = d2.id
          WHERE d2.id IS NULL
        ),
        1
      ) AS next_id
    `);

    const nextId = idResult.rows[0].next_id;

    // Insert designation
    const result = await pool.query(
      `
      INSERT INTO designations
      (
        id,
        company_id,
        title,
        created_by
      )
      VALUES
      ($1, $2, $3, $4)
      RETURNING *
      `,
      [nextId, company_id, title, created_by],
    );

    res.status(201).json({
      success: true,
      message: "Designation created successfully",
      designation: result.rows[0],
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// READ
exports.getDesignations = async (req, res) => {
  try {
    const company_id = req.user.company_id;

    const result = await pool.query(
      `SELECT * FROM designations WHERE company_id=$1 ORDER BY id DESC`,
      [company_id],
    );

    res.json({ designations: result.rows });
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
};

// UPDATE
exports. updateDesignation = async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    const updated_by = req.user.id;

    const result = await pool.query(
      `UPDATE designations
       SET title=$1, updated_by=$2, updated_at=CURRENT_TIMESTAMP
       WHERE id=$3
       RETURNING *`,
      [title, updated_by, id],
    );

    res.json({ designation: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
};

// DELETE
exports.deleteDesignation = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(`DELETE FROM designations WHERE id=$1`, [id]);

    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
};
