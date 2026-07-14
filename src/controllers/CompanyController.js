const pool = require("../config/database");
const bcrypt = require("bcryptjs");

// ======================================
// GET LOGGED IN COMPANY
// ======================================
exports.getMyCompany = async (req, res) => {
  try {
    console.log("req.companyId =", req.companyId);
    console.log("req.user =", req.user);
    const result = await pool.query(
      `
      SELECT
        c.id,
        c.company_name,
        c.email,
        c.phone,
        c.address1,
        c.address2,
        c.city,
        c.country,
        c.state,
        c.pincode,
        c.logo,
        c.stamp,
        c.gst_no,
        c.cin_number,
        c.registration_number,
        c.profile_pic,
        c.login_type,
        c.company_type AS company_type_id,
        ct.company_type_name AS company_type_name,
        c.sector AS sector_id,
        s.sector_name AS sector_name,
        c.created_at,
        c.updated_at
      FROM company c
      LEFT JOIN company_type ct ON c.company_type = ct.id
      LEFT JOIN sector s ON c.sector = s.id
      WHERE c.id = $1
      `,
      [req.user.company_id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    res.status(200).json({
      success: true,
      company: result.rows[0],
    });
  } catch (error) {
    console.log("Get Company Error:", error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// ======================================
// UPDATE COMPANY PROFILE
// ======================================
exports.updateCompany = async (req, res) => {
  try {
    const {
      company_name,
      phone,
      address1,
      address2,
      city,
      country,
      state,
      company_type,
      sector,
      pincode,
      logo,
      stamp,
      gst_no,
      cin_number,
      registration_number,
      password,
    } = req.body;

    let hashedPassword = null;

    if (password && password.trim() !== "") {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Resolve or create company_type and sector if names/values provided
    let company_type_id = null;
    const company_type_input = company_type ? company_type.toString().trim() : null;
    if (company_type_input) {
      if (!isNaN(parseInt(company_type_input)) && Number.isInteger(parseInt(company_type_input))) {
        company_type_id = parseInt(company_type_input);
      } else {
        const ctRes = await pool.query(
          `INSERT INTO company_type (company_type_name) VALUES ($1)
           ON CONFLICT (company_type_name) DO UPDATE SET company_type_name = EXCLUDED.company_type_name
           RETURNING id`,
          [company_type_input],
        );
        if (ctRes.rows.length) company_type_id = ctRes.rows[0].id;
        else {
          const sel = await pool.query(`SELECT id FROM company_type WHERE company_type_name = $1`, [company_type_input]);
          if (sel.rows.length) company_type_id = sel.rows[0].id;
        }
      }
    }

    let sector_id = null;
    const sector_input = sector ? sector.toString().trim() : null;
    if (sector_input) {
      if (!isNaN(parseInt(sector_input)) && Number.isInteger(parseInt(sector_input))) {
        sector_id = parseInt(sector_input);
      } else {
        const sRes = await pool.query(
          `INSERT INTO sector (sector_name) VALUES ($1)
           ON CONFLICT (sector_name) DO UPDATE SET sector_name = EXCLUDED.sector_name
           RETURNING id`,
          [sector_input],
        );
        if (sRes.rows.length) sector_id = sRes.rows[0].id;
        else {
          const sel = await pool.query(`SELECT id FROM sector WHERE sector_name = $1`, [sector_input]);
          if (sel.rows.length) sector_id = sel.rows[0].id;
        }
      }
    }

    console.log("Resolved company_type_id:", company_type_id, "sector_id:", sector_id);

    const result = await pool.query(
      `
      UPDATE company
      SET
        company_name = COALESCE($1, company_name),
        phone = COALESCE($2, phone),
        address1 = COALESCE($3, address1),
        address2 = COALESCE($4, address2),
        city = COALESCE($5, city),
        country = COALESCE($6, country),
        state = COALESCE($7, state),
        company_type = COALESCE($8, company_type),
        sector = COALESCE($9, sector),
        pincode = COALESCE($10, pincode),
        logo = COALESCE($11, logo),
        gst_no = COALESCE($12, gst_no),
        cin_number = COALESCE($13, cin_number),
        registration_number = COALESCE($14, registration_number),
        password = COALESCE($15, password),
        stamp = COALESCE($16, stamp),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $17
      RETURNING
        id,
        company_name,
        email,
        phone,
        address1,
        address2,
        city,
        country,
        state,
        pincode,
        logo,
        stamp,
        gst_no,
        cin_number,
        registration_number,
        profile_pic,
        login_type,
        updated_at
      `,
      [
        company_name,
        phone,
        address1,
        address2,
        city,
        country,
        state,
        company_type_id,
        sector_id,
        pincode,
        logo,
        gst_no,
        cin_number,
        registration_number,
        hashedPassword,
        stamp,
        req.user.company_id,
      ],
    );

    // Fetch updated company with type/sector names
    const refreshed = await pool.query(
      `
      SELECT
        c.id,
        c.company_name,
        c.email,
        c.phone,
        c.address1,
        c.address2,
        c.city,
        c.country,
        c.state,
        c.pincode,
        c.logo,
        c.stamp,
        c.gst_no,
        c.cin_number,
        c.registration_number,
        c.profile_pic,
        c.login_type,
        c.company_type AS company_type_id,
        ct.company_type_name AS company_type_name,
        c.sector AS sector_id,
        s.sector_name AS sector_name,
        c.updated_at
      FROM company c
      LEFT JOIN company_type ct ON c.company_type = ct.id
      LEFT JOIN sector s ON c.sector = s.id
      WHERE c.id = $1
      `,
      [req.user.company_id],
    );

    res.status(200).json({
      success: true,
      message: "Company profile updated successfully",
      company: refreshed.rows[0],
    });
  } catch (error) {
    console.log("Update Company Error:", error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

exports.getCompanyById = async (companyId) => {
  try {
    const result = await pool.query(
      `
      SELECT
        c.id,
        c.company_name,
        c.email,
        c.phone,
        c.address1,
        c.address2,
        c.city,
        c.country,
        c.state,
        c.pincode,
        c.logo,
        c.stamp,
        c.gst_no,
        c.cin_number,
        c.registration_number,
        c.profile_pic,
        c.login_type,
        c.company_type AS company_type_id,
        ct.company_type_name AS company_type_name,
        c.sector AS sector_id,
        s.sector_name AS sector_name,
        c.created_at,
        c.updated_at
      FROM company c
      LEFT JOIN company_type ct ON c.company_type = ct.id
      LEFT JOIN sector s ON c.sector = s.id
      WHERE c.id = $1
      `,
      [companyId],
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    console.log("Get Company by ID Error:", error);
    throw error;
  }
};

exports.createCompany = async (req, res) => {
  try {
    const {
      company_name,
      email,
      phone,
      address1,
      address2,
      city,
      country,
      state,
      company_type,
      sector,
      pincode,
      logo,
      gst_no,
      cin_number,
      registration_number,
      profile_pic,
      login_type,
      password,
    } = req.body;

    if (!company_name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Company name, email, and password are required",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Resolve or create company_type and sector if names/values provided
    let company_type_id = null;
    const company_type_input = company_type ? company_type.toString().trim() : null;
    if (company_type_input) {
      if (!isNaN(parseInt(company_type_input)) && Number.isInteger(parseInt(company_type_input))) {
        company_type_id = parseInt(company_type_input);
      } else {
        const ctRes = await pool.query(
          `INSERT INTO company_type (company_type_name) VALUES ($1)
           ON CONFLICT (company_type_name) DO UPDATE SET company_type_name = EXCLUDED.company_type_name
           RETURNING id`,
          [company_type_input],
        );
        if (ctRes.rows.length) company_type_id = ctRes.rows[0].id;
        else {
          const sel = await pool.query(`SELECT id FROM company_type WHERE company_type_name = $1`, [company_type_input]);
          if (sel.rows.length) company_type_id = sel.rows[0].id;
        }
      }
    }

    let sector_id = null;
    const sector_input = sector ? sector.toString().trim() : null;
    if (sector_input) {
      if (!isNaN(parseInt(sector_input)) && Number.isInteger(parseInt(sector_input))) {
        sector_id = parseInt(sector_input);
      } else {
        const sRes = await pool.query(
          `INSERT INTO sector (sector_name) VALUES ($1)
           ON CONFLICT (sector_name) DO UPDATE SET sector_name = EXCLUDED.sector_name
           RETURNING id`,
          [sector_input],
        );
        if (sRes.rows.length) sector_id = sRes.rows[0].id;
        else {
          const sel = await pool.query(`SELECT id FROM sector WHERE sector_name = $1`, [sector_input]);
          if (sel.rows.length) sector_id = sel.rows[0].id;
        }
      }
    }

    console.log("Resolved company_type_id:", company_type_id, "sector_id:", sector_id);

    const result = await pool.query(
      `
      INSERT INTO company (
        company_name,
        email,
        phone,
        address1,
        address2,
        city,
        country,
        state,
        company_type,
        sector,
        pincode,
        logo,
        gst_no,
        cin_number,
        registration_number,
        profile_pic,
        login_type,
        password
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
      `,
      [
        company_name,
        email,
        phone,
        address1,
        address2,
        city,
        country,
        state,
        company_type_id,
        sector_id,
        pincode,
        logo,
        gst_no,
        cin_number,
        registration_number,
        profile_pic,
        login_type,
        hashedPassword,
      ],
    );

    // Fetch created company with type/sector names
    const created = await pool.query(
      `
      SELECT
        c.id,
        c.company_name,
        c.email,
        c.phone,
        c.address1,
        c.address2,
        c.city,
        c.country,
        c.state,
        c.pincode,
        c.logo,
        c.gst_no,
        c.cin_number,
        c.registration_number,
        c.profile_pic,
        c.login_type,
        c.company_type AS company_type_id,
        ct.company_type_name AS company_type_name,
        c.sector AS sector_id,
        s.sector_name AS sector_name,
        c.created_at,
        c.updated_at
      FROM company c
      LEFT JOIN company_type ct ON c.company_type = ct.id
      LEFT JOIN sector s ON c.sector = s.id
      WHERE c.id = $1
      `,
      [result.rows[0].id],
    );

    res.status(201).json({
      success: true,
      message: "Company registered successfully",
      company: created.rows[0],
    });
  } catch (error) {
    console.log("Create Company Error:", error);

    if (error.code === "23505") {
      return res.status(400).json({
        success: false,
        message: "Company email already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

