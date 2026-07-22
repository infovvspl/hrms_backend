const pool = require("../config/database");
const bcrypt = require("bcryptjs");
const { generateOfferLetter, generateExperienceLetter, generateRelievingLetter } = require("../utils/documentGenerator");

const getHrAndCeoSignatures = async (client, companyId) => {
  let hrSignature = null;
  let ceoSignature = null;

  try {
    // 1. Query HR signatures by designation
    let res = await client.query(
      `SELECT d.signatures 
       FROM users u
       JOIN documents d ON u.document_id = d.id
       JOIN designations des ON u.designation_id = des.id
       WHERE u.company_id = $1 AND (des.title ILIKE '%HR%' OR des.title ILIKE '%Human%')
       ORDER BY u.id ASC LIMIT 1`,
      [companyId]
    );

    if (res.rows.length > 0) {
      hrSignature = res.rows[0].signatures;
    } else {
      // Fallback to role name
      res = await client.query(
        `SELECT d.signatures 
         FROM users u
         JOIN documents d ON u.document_id = d.id
         JOIN roles r ON u.role_id = r.id
         WHERE u.company_id = $1 AND r.role_name ILIKE '%HR%'
         ORDER BY u.id ASC LIMIT 1`,
        [companyId]
      );
      if (res.rows.length > 0) {
        hrSignature = res.rows[0].signatures;
      }
    }

    // 2. Query CEO signatures by designation
    res = await client.query(
      `SELECT d.signatures 
       FROM users u
       JOIN documents d ON u.document_id = d.id
       JOIN designations des ON u.designation_id = des.id
       WHERE u.company_id = $1 AND (des.title ILIKE '%CEO%' OR des.title ILIKE '%Chief%' OR des.title ILIKE '%Executive%' OR des.title ILIKE '%Director%' OR des.title ILIKE '%Owner%' OR des.title ILIKE '%President%')
       ORDER BY u.id ASC LIMIT 1`,
      [companyId]
    );

    if (res.rows.length > 0) {
      ceoSignature = res.rows[0].signatures;
    } else {
      // Fallback to role name
      res = await client.query(
        `SELECT d.signatures 
         FROM users u
         JOIN documents d ON u.document_id = d.id
         JOIN roles r ON u.role_id = r.id
         WHERE u.company_id = $1 AND (r.role_name ILIKE '%CEO%' OR r.role_name ILIKE '%Admin%' OR r.role_name ILIKE '%Owner%')
         ORDER BY u.id ASC LIMIT 1`,
        [companyId]
      );
      if (res.rows.length > 0) {
        ceoSignature = res.rows[0].signatures;
      }
    }
  } catch (error) {
    console.error("Error fetching HR/CEO signatures:", error);
  }

  return [
    { label: "HR Manager", signature_path: hrSignature },
    { label: "Chief Executive Officer", signature_path: ceoSignature }
  ];
};


// =================================
// CREATE EMPLOYEE
// =================================
exports.createEmployee = async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      branch_id,
      role_id,
      department_id,
      designation_id,
      employment_type,
      first_name,
      middle_name,
      last_name,
      email,
      work_email,
      password,
      mobile,
      work_phone_number,
      dob,
      doj,
      present_address1,
      present_address2,
      present_city,
      present_country,
      present_state,
      present_pincode,
      permanent_address1,
      permanent_address2,
      permanent_city,
      permanent_country,
      permanent_state,
      permanent_pincode,
      aadhaar_number,
      voter_id,
      pan_number,
      passport_number,
      uan_number,
      pf_number,
      image,
      current_experience,
      total_experience,
      employment_status,
      reporting_manager,
      gender,
      marital_status,
      area_of_expertise,
      building_name,
      floor_number,
      extension,
      seat_number,
      doe,
      status,
      // Document fields
      aadhar_card,
      voter_card,
      passport,
      pan_card,
      pancard,
      experience_letter,
      relieveing_letter,
      signatures,
      resume
    } = req.body;

    const resolvedPancard = pancard || pan_card;

    const company_id = req.user.company_id;
    const creator_id = req.user.id;

    // Check if the creator exists in users table (since fk_users_created_by references users(id))
    let created_by = null;
    if (creator_id) {
      const checkCreator = await pool.query("SELECT id FROM users WHERE id = $1", [creator_id]);
      if (checkCreator.rows.length > 0) {
        created_by = creator_id;
      }
    }

    // Validation
    if (!first_name || !last_name || !email || !password || employment_type === undefined) {
      return res.status(400).json({
        success: false,
        message: "First name, last name, email, password and employment type are required",
      });
    }

    // Check unique constraints
    const emailCheck = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ success: false, message: "Personal email already exists" });
    }

    if (work_email) {
      const workEmailCheck = await pool.query("SELECT id FROM users WHERE work_email = $1", [work_email]);
      if (workEmailCheck.rows.length > 0) {
        return res.status(400).json({ success: false, message: "Work email already exists" });
      }
    }

    if (aadhaar_number) {
      const aadhaarCheck = await pool.query("SELECT id FROM users WHERE aadhaar_number = $1", [aadhaar_number]);
      if (aadhaarCheck.rows.length > 0) {
        return res.status(400).json({ success: false, message: "Aadhaar number already exists" });
      }
    }

    if (voter_id) {
      const voterCheck = await pool.query("SELECT id FROM users WHERE voter_id = $1", [voter_id]);
      if (voterCheck.rows.length > 0) {
        return res.status(400).json({ success: false, message: "Voter ID already exists" });
      }
    }

    if (pan_number) {
      const panCheck = await pool.query("SELECT id FROM users WHERE pan_number = $1", [pan_number]);
      if (panCheck.rows.length > 0) {
        return res.status(400).json({ success: false, message: "PAN number already exists" });
      }
    }

    if (passport_number) {
      const passportCheck = await pool.query("SELECT id FROM users WHERE passport_number = $1", [passport_number]);
      if (passportCheck.rows.length > 0) {
        return res.status(400).json({ success: false, message: "Passport number already exists" });
      }
    }

    if (uan_number) {
      const uanCheck = await pool.query("SELECT id FROM users WHERE uan_number = $1", [uan_number]);
      if (uanCheck.rows.length > 0) {
        return res.status(400).json({ success: false, message: "UAN number already exists" });
      }
    }

    if (pf_number) {
      const pfCheck = await pool.query("SELECT id FROM users WHERE pf_number = $1", [pf_number]);
      if (pfCheck.rows.length > 0) {
        return res.status(400).json({ success: false, message: "PF number already exists" });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Resolve building, floor, extension, and seat if they are passed as strings/names
    let resolvedBuildingId = null;
    if (building_name) {
      // 1. Try matching by building_name string first
      const check = await pool.query("SELECT id FROM building WHERE building_name = $1", [building_name]);
      if (check.rows.length > 0) {
        resolvedBuildingId = check.rows[0].id;
      } else if (!isNaN(building_name)) {
        // 2. Fall back to matching by ID if building_name is a number
        const checkId = await pool.query("SELECT id FROM building WHERE id = $1", [building_name]);
        if (checkId.rows.length > 0) resolvedBuildingId = parseInt(building_name, 10);
      }
      // 3. Create if it doesn't exist
      if (!resolvedBuildingId) {
        const insert = await pool.query("INSERT INTO building (building_name, created_by) VALUES ($1, $2) RETURNING id", [building_name, created_by]);
        resolvedBuildingId = insert.rows[0].id;
      }
    }

    let resolvedFloorId = null;
    if (floor_number) {
      // 1. Try matching by floor_name string first under resolved building
      if (resolvedBuildingId) {
        const check = await pool.query("SELECT id FROM floor WHERE floor_name = $1 AND building_id = $2", [String(floor_number), resolvedBuildingId]);
        if (check.rows.length > 0) {
          resolvedFloorId = check.rows[0].id;
        }
      }
      // 2. Fall back to matching by ID if floor_number is a number
      if (!resolvedFloorId && !isNaN(floor_number)) {
        const checkId = await pool.query("SELECT id FROM floor WHERE id = $1", [floor_number]);
        if (checkId.rows.length > 0) resolvedFloorId = parseInt(floor_number, 10);
      }
      // 3. Create if it doesn't exist
      if (!resolvedFloorId && resolvedBuildingId) {
        let floorBranchId = branch_id;
        if (!floorBranchId) {
          const branchCheck = await pool.query("SELECT id FROM branch WHERE company_id = $1 LIMIT 1", [company_id]);
          if (branchCheck.rows.length > 0) floorBranchId = branchCheck.rows[0].id;
        }
        if (floorBranchId) {
          const insert = await pool.query("INSERT INTO floor (branch_id, building_id, floor_name, created_by) VALUES ($1, $2, $3, $4) RETURNING id", [floorBranchId, resolvedBuildingId, String(floor_number), created_by]);
          resolvedFloorId = insert.rows[0].id;
        }
      }
    }

    let resolvedExtensionId = null;
    if (extension) {
      // 1. Try matching by extension_number string first (globally unique)
      const check = await pool.query("SELECT id FROM extension WHERE extension_number = $1", [String(extension)]);
      if (check.rows.length > 0) {
        resolvedExtensionId = check.rows[0].id;
      } else if (!isNaN(extension)) {
        // 2. Fall back to matching by ID if extension is a number
        const checkId = await pool.query("SELECT id FROM extension WHERE id = $1", [extension]);
        if (checkId.rows.length > 0) resolvedExtensionId = parseInt(extension, 10);
      }
      // 3. Create if it doesn't exist under resolved floor
      if (!resolvedExtensionId && resolvedFloorId) {
        const insert = await pool.query("INSERT INTO extension (floor_number, extension_number, created_by) VALUES ($1, $2, $3) RETURNING id", [resolvedFloorId, String(extension), created_by]);
        resolvedExtensionId = insert.rows[0].id;
      }
    }

    let resolvedSeatId = null;
    if (seat_number) {
      // 1. Try matching by seat_number string first under resolved extension
      if (resolvedExtensionId) {
        const check = await pool.query("SELECT id FROM seat WHERE seat_number = $1 AND extension_id = $2", [String(seat_number), resolvedExtensionId]);
        if (check.rows.length > 0) {
          resolvedSeatId = check.rows[0].id;
        }
      }
      // 2. Fall back to matching by ID if seat_number is a number
      if (!resolvedSeatId && !isNaN(seat_number)) {
        const checkId = await pool.query("SELECT id FROM seat WHERE id = $1", [seat_number]);
        if (checkId.rows.length > 0) resolvedSeatId = parseInt(seat_number, 10);
      }
      // 3. Create if it doesn't exist
      if (!resolvedSeatId && resolvedExtensionId) {
        const insert = await pool.query("INSERT INTO seat (extension_id, seat_number, created_by) VALUES ($1, $2, $3) RETURNING id", [resolvedExtensionId, String(seat_number), created_by]);
        resolvedSeatId = insert.rows[0].id;
      }
    }

    // Start Transaction
    await client.query("BEGIN");

    // 1. Insert documents first
    const docResult = await client.query(
      `
      INSERT INTO documents (
        aadhar_card, voter_card, passport, pancard, 
        offer_letter, experience_letter, relieveing_letter, signatures, resume,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
      `,
      [
        aadhar_card || null,
        voter_card || null,
        passport || null,
        resolvedPancard || null,
        null, // Offer letter not generated automatically on onboard
        experience_letter || null,
        relieveing_letter || null,
        signatures || null,
        resume || null,
        created_by
      ]
    );

    const document_id = docResult.rows[0].id;

    // Calculate the next company_employee_id for this company
    const nextSeqRes = await client.query(
      "SELECT COALESCE(MAX(company_employee_id), 0) + 1 AS next_id FROM users WHERE company_id = $1",
      [company_id]
    );
    const company_employee_id = nextSeqRes.rows[0].next_id;

    // 2. Insert user with document_id and company_employee_id
    const userResult = await client.query(
      `
      INSERT INTO users (
        company_employee_id, branch_id, role_id, department_id, document_id, designation_id, company_id,
        employment_type, first_name, middle_name, last_name, email, work_email,
        password, mobile, work_phone_number, dob, doj,
        present_address1, present_address2, present_city, present_country, present_state, present_pincode,
        permanent_address1, permanent_address2, permanent_city, permanent_country, permanent_state, permanent_pincode,
        aadhaar_number, voter_id, pan_number, passport_number, uan_number, pf_number, image,
        current_experience, total_experience, employment_status, reporting_manager,
        gender, marital_status, area_of_expertise, building_name, floor_number, extension, seat_number,
        doe, status, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
        $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36,
        $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51
      )
      RETURNING *
      `,
      [
        company_employee_id,
        branch_id || null,
        role_id || null,
        department_id || null,
        document_id,
        designation_id || null,
        company_id,
        employment_type,
        first_name,
        middle_name || null,
        last_name,
        email,
        work_email || null,
        hashedPassword,
        mobile || null,
        work_phone_number || null,
        dob || null,
        doj || null,
        present_address1 || null,
        present_address2 || null,
        present_city || null,
        present_country || null,
        present_state || null,
        present_pincode || null,
        permanent_address1 || null,
        permanent_address2 || null,
        permanent_city || null,
        permanent_country || null,
        permanent_state || null,
        permanent_pincode || null,
        aadhaar_number || null,
        voter_id || null,
        pan_number || null,
        passport_number || null,
        uan_number || null,
        pf_number || null,
        image || null,
        current_experience || 0,
        total_experience || 0,
        employment_status || "Active",
        reporting_manager || null,
        gender || null,
        marital_status || null,
        area_of_expertise || null,
        resolvedBuildingId || null,
        resolvedFloorId || null,
        resolvedExtensionId || null,
        resolvedSeatId || null,
        doe || null,
        status || null,
        created_by
      ]
    );

    const createdUser = userResult.rows[0];

    // 3. Update document with user_id
    await client.query(
      `
      UPDATE documents
      SET user_id = $1
      WHERE id = $2
      `,
      [createdUser.id, document_id]
    );

    await client.query("COMMIT");

    delete createdUser.password;

    res.status(201).json({
      success: true,
      message: "Employee created successfully",
      employee: {
        ...createdUser,
        documents: {
          id: document_id,
          aadhar_card: aadhar_card || null,
          voter_card: voter_card || null,
          passport: passport || null,
          pan_card: resolvedPancard || null,
          pancard: resolvedPancard || null,
          offer_letter: null,
          experience_letter: experience_letter || null,
          relieveing_letter: relieveing_letter || null,
          signatures: signatures || null
        }
      }
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("CREATE EMPLOYEE ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Server Error",
    });
  } finally {
    client.release();
  }
};

// =================================
// GET ALL EMPLOYEES
// =================================
exports.getEmployees = async (req, res) => {
  try {
    const company_id = req.user.company_id;

    const result = await pool.query(
      `
      SELECT 
        u.*,
        c.company_name as company_name,
        d.aadhar_card,
        d.voter_card,
        d.passport,
        d.pancard as pan_card,
        d.pancard,
        d.offer_letter,
        d.experience_letter,
        d.relieveing_letter,
        d.signatures,
        d.resume,
        b.name as branch_name,
        r.role_name,
        dept.department_name,
        desg.title as designation_title,
        build.building_name as building_display_name,
        flr.floor_name as floor_display_name,
        ext.extension_number as extension_display_number,
        st.seat_number as seat_display_number,
        CONCAT(mgr.first_name, ' ', mgr.last_name) as reporting_manager_name,
        ash.shift_id as shift_id,
        sh.shift_name as shift_name
      FROM users u
      LEFT JOIN company c ON u.company_id = c.id
      LEFT JOIN documents d ON u.document_id = d.id
      LEFT JOIN branch b ON u.branch_id = b.id
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN departments dept ON u.department_id = dept.id
      LEFT JOIN designations desg ON u.designation_id = desg.id
      LEFT JOIN building build ON u.building_name = build.id
      LEFT JOIN floor flr ON u.floor_number = flr.id
      LEFT JOIN extension ext ON u.extension = ext.id
      LEFT JOIN seat st ON u.seat_number = st.id
      LEFT JOIN users mgr ON u.reporting_manager = mgr.id
      LEFT JOIN assign_shift ash ON u.id = ash.user_id
      LEFT JOIN shift sh ON ash.shift_id = sh.id
      WHERE u.company_id = $1
      ORDER BY u.id DESC
      `,
      [company_id]
    );

    // Remove passwords from results
    const employees = result.rows.map(row => {
      const emp = { ...row };
      delete emp.password;
      return emp;
    });

    res.status(200).json({
      success: true,
      employees,
    });
  } catch (error) {
    console.error("GET EMPLOYEES ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// =================================
// GET EMPLOYEE BY ID
// =================================
exports.getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;
    const company_id = req.user.company_id;

    const result = await pool.query(
      `
      SELECT 
        u.*,
        c.company_name as company_name,
        d.aadhar_card,
        d.voter_card,
        d.passport,
        d.pancard as pan_card,
        d.pancard,
        d.offer_letter,
        d.experience_letter,
        d.relieveing_letter,
        d.signatures,
        b.name as branch_name,
        r.role_name,
        dept.department_name,
        desg.title as designation_title,
        build.building_name as building_display_name,
        flr.floor_name as floor_display_name,
        ext.extension_number as extension_display_number,
        st.seat_number as seat_display_number,
        CONCAT(mgr.first_name, ' ', mgr.last_name) as reporting_manager_name,
        ash.shift_id as shift_id,
        sh.shift_name as shift_name
      FROM users u
      LEFT JOIN company c ON u.company_id = c.id
      LEFT JOIN documents d ON u.document_id = d.id
      LEFT JOIN branch b ON u.branch_id = b.id
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN departments dept ON u.department_id = dept.id
      LEFT JOIN designations desg ON u.designation_id = desg.id
      LEFT JOIN building build ON u.building_name = build.id
      LEFT JOIN floor flr ON u.floor_number = flr.id
      LEFT JOIN extension ext ON u.extension = ext.id
      LEFT JOIN seat st ON u.seat_number = st.id
      LEFT JOIN users mgr ON u.reporting_manager = mgr.id
      LEFT JOIN assign_shift ash ON u.id = ash.user_id
      LEFT JOIN shift sh ON ash.shift_id = sh.id
      WHERE u.id = $1 AND u.company_id = $2
      `,
      [id, company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    const employee = result.rows[0];
    delete employee.password;

    res.status(200).json({
      success: true,
      employee,
    });
  } catch (error) {
    console.error("GET EMPLOYEE BY ID ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// =================================
// UPDATE EMPLOYEE
// =================================
exports.updateEmployee = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const company_id = req.user.company_id;
    const updater_id = req.user.id;

    // Check if the updater exists in users table (since fk_users_updated_by references users(id))
    let updated_by = null;
    if (updater_id) {
      const checkUpdater = await pool.query("SELECT id FROM users WHERE id = $1", [updater_id]);
      if (checkUpdater.rows.length > 0) {
        updated_by = updater_id;
      }
    }

    const {
      branch_id,
      role_id,
      department_id,
      designation_id,
      employment_type,
      first_name,
      middle_name,
      last_name,
      email,
      work_email,
      password,
      mobile,
      work_phone_number,
      dob,
      doj,
      present_address1,
      present_address2,
      present_city,
      present_country,
      present_state,
      present_pincode,
      permanent_address1,
      permanent_address2,
      permanent_city,
      permanent_country,
      permanent_state,
      permanent_pincode,
      aadhaar_number,
      voter_id,
      pan_number,
      passport_number,
      uan_number,
      pf_number,
      image,
      current_experience,
      total_experience,
      employment_status,
      reporting_manager,
      gender,
      marital_status,
      area_of_expertise,
      emergency_contact_name,
      emergency_contact_relation,
      emergency_contact_phone,
      building_name,
      floor_number,
      extension,
      seat_number,
      doe,
      status,
      // Document fields
      aadhar_card,
      voter_card,
      passport,
      pan_card,
      pancard,
      experience_letter,
      relieveing_letter,
      signatures,
      resume
    } = req.body;

    const resolvedPancard = pancard || pan_card;

    // Check if employee exists and belongs to company
    const existingResult = await pool.query(
      "SELECT document_id, password FROM users WHERE id = $1 AND company_id = $2",
      [id, company_id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    const currentEmployee = existingResult.rows[0];
    let document_id = currentEmployee.document_id;

    // Unique checks (excluding self)
    if (email) {
      const emailCheck = await pool.query("SELECT id FROM users WHERE email = $1 AND id <> $2", [email, id]);
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ success: false, message: "Personal email already exists" });
      }
    }

    if (work_email) {
      const workEmailCheck = await pool.query("SELECT id FROM users WHERE work_email = $1 AND id <> $2", [work_email, id]);
      if (workEmailCheck.rows.length > 0) {
        return res.status(400).json({ success: false, message: "Work email already exists" });
      }
    }

    if (aadhaar_number) {
      const aadhaarCheck = await pool.query("SELECT id FROM users WHERE aadhaar_number = $1 AND id <> $2", [aadhaar_number, id]);
      if (aadhaarCheck.rows.length > 0) {
        return res.status(400).json({ success: false, message: "Aadhaar number already exists" });
      }
    }

    if (voter_id) {
      const voterCheck = await pool.query("SELECT id FROM users WHERE voter_id = $1 AND id <> $2", [voter_id, id]);
      if (voterCheck.rows.length > 0) {
        return res.status(400).json({ success: false, message: "Voter ID already exists" });
      }
    }

    if (pan_number) {
      const panCheck = await pool.query("SELECT id FROM users WHERE pan_number = $1 AND id <> $2", [pan_number, id]);
      if (panCheck.rows.length > 0) {
        return res.status(400).json({ success: false, message: "PAN number already exists" });
      }
    }

    if (passport_number) {
      const passportCheck = await pool.query("SELECT id FROM users WHERE passport_number = $1 AND id <> $2", [passport_number, id]);
      if (passportCheck.rows.length > 0) {
        return res.status(400).json({ success: false, message: "Passport number already exists" });
      }
    }

    if (uan_number) {
      const uanCheck = await pool.query("SELECT id FROM users WHERE uan_number = $1 AND id <> $2", [uan_number, id]);
      if (uanCheck.rows.length > 0) {
        return res.status(400).json({ success: false, message: "UAN number already exists" });
      }
    }

    if (pf_number) {
      const pfCheck = await pool.query("SELECT id FROM users WHERE pf_number = $1 AND id <> $2", [pf_number, id]);
      if (pfCheck.rows.length > 0) {
        return res.status(400).json({ success: false, message: "PF number already exists" });
      }
    }

    // Determine final password to save
    let finalPassword = currentEmployee.password;
    if (password) {
      finalPassword = await bcrypt.hash(password, 10);
    }

    // Resolve building, floor, extension, and seat if they are passed as strings/names
    let resolvedBuildingId = undefined;
    if (building_name !== undefined) {
      if (building_name === null || building_name === "") {
        resolvedBuildingId = null;
      } else {
        // 1. Try matching by building_name string first
        const check = await pool.query("SELECT id FROM building WHERE building_name = $1", [building_name]);
        if (check.rows.length > 0) {
          resolvedBuildingId = check.rows[0].id;
        } else if (!isNaN(building_name)) {
          // 2. Fall back to matching by ID if building_name is a number
          const checkId = await pool.query("SELECT id FROM building WHERE id = $1", [building_name]);
          if (checkId.rows.length > 0) resolvedBuildingId = parseInt(building_name, 10);
        }
        // 3. Create if it doesn't exist
        if (resolvedBuildingId === undefined && building_name) {
          const insert = await pool.query("INSERT INTO building (building_name, created_by) VALUES ($1, $2) RETURNING id", [building_name, updated_by]);
          resolvedBuildingId = insert.rows[0].id;
        }
      }
    }

    let resolvedFloorId = undefined;
    if (floor_number !== undefined) {
      if (floor_number === null || floor_number === "") {
        resolvedFloorId = null;
      } else {
        const bId = resolvedBuildingId !== undefined ? resolvedBuildingId : (await pool.query("SELECT building_name FROM users WHERE id = $1", [id])).rows[0]?.building_name;
        if (bId) {
          // 1. Try matching by floor_name string first under building
          const check = await pool.query("SELECT id FROM floor WHERE floor_name = $1 AND building_id = $2", [String(floor_number), bId]);
          if (check.rows.length > 0) {
            resolvedFloorId = check.rows[0].id;
          }
        }
        // 2. Fall back to matching by ID if floor_number is a number
        if (resolvedFloorId === undefined && !isNaN(floor_number)) {
          const checkId = await pool.query("SELECT id FROM floor WHERE id = $1", [floor_number]);
          if (checkId.rows.length > 0) resolvedFloorId = parseInt(floor_number, 10);
        }
        // 3. Create if it doesn't exist
        if (resolvedFloorId === undefined && floor_number && bId) {
          let floorBranchId = branch_id;
          if (!floorBranchId) {
            const userBranchRes = await pool.query("SELECT branch_id FROM users WHERE id = $1", [id]);
            floorBranchId = userBranchRes.rows[0]?.branch_id;
          }
          if (!floorBranchId) {
            const branchCheck = await pool.query("SELECT id FROM branch WHERE company_id = $1 LIMIT 1", [company_id]);
            if (branchCheck.rows.length > 0) floorBranchId = branchCheck.rows[0].id;
          }
          if (floorBranchId) {
            const insert = await pool.query("INSERT INTO floor (branch_id, building_id, floor_name, created_by) VALUES ($1, $2, $3, $4) RETURNING id", [floorBranchId, bId, String(floor_number), updated_by]);
            resolvedFloorId = insert.rows[0].id;
          }
        }
      }
    }

    let resolvedExtensionId = undefined;
    if (extension !== undefined) {
      if (extension === null || extension === "") {
        resolvedExtensionId = null;
      } else {
        // 1. Try matching by extension_number string first (globally unique)
        const check = await pool.query("SELECT id FROM extension WHERE extension_number = $1", [String(extension)]);
        if (check.rows.length > 0) {
          resolvedExtensionId = check.rows[0].id;
        } else if (!isNaN(extension)) {
          // 2. Fall back to matching by ID if extension is a number
          const checkId = await pool.query("SELECT id FROM extension WHERE id = $1", [extension]);
          if (checkId.rows.length > 0) resolvedExtensionId = parseInt(extension, 10);
        }
        // 3. Create if it doesn't exist under floor
        if (resolvedExtensionId === undefined && extension) {
          const fId = resolvedFloorId !== undefined ? resolvedFloorId : (await pool.query("SELECT floor_number FROM users WHERE id = $1", [id])).rows[0]?.floor_number;
          if (fId) {
            const insert = await pool.query("INSERT INTO extension (floor_number, extension_number, created_by) VALUES ($1, $2, $3) RETURNING id", [fId, String(extension), updated_by]);
            resolvedExtensionId = insert.rows[0].id;
          }
        }
      }
    }

    let resolvedSeatId = undefined;
    if (seat_number !== undefined) {
      if (seat_number === null || seat_number === "") {
        resolvedSeatId = null;
      } else {
        const extId = resolvedExtensionId !== undefined ? resolvedExtensionId : (await pool.query("SELECT extension FROM users WHERE id = $1", [id])).rows[0]?.extension;
        if (extId) {
          // 1. Try matching by seat_number string first under extension
          const check = await pool.query("SELECT id FROM seat WHERE seat_number = $1 AND extension_id = $2", [String(seat_number), extId]);
          if (check.rows.length > 0) {
            resolvedSeatId = check.rows[0].id;
          }
        }
        // 2. Fall back to matching by ID if seat_number is a number
        if (resolvedSeatId === undefined && !isNaN(seat_number)) {
          const checkId = await pool.query("SELECT id FROM seat WHERE id = $1", [seat_number]);
          if (checkId.rows.length > 0) resolvedSeatId = parseInt(seat_number, 10);
        }
        // 3. Create if it doesn't exist
        if (resolvedSeatId === undefined && seat_number && extId) {
          const insert = await pool.query("INSERT INTO seat (extension_id, seat_number, created_by) VALUES ($1, $2, $3) RETURNING id", [extId, String(seat_number), updated_by]);
          resolvedSeatId = insert.rows[0].id;
        }
      }
    }

    await client.query("BEGIN");

    // Fetch current user details to construct final employee info for offer letter generation
    const userSelect = await client.query(
      `SELECT first_name, middle_name, last_name, email, mobile, doj, company_id, branch_id, role_id, department_id, designation_id, employment_type 
       FROM users WHERE id = $1`,
      [id]
    );
    const currentUser = userSelect.rows[0];

    const finalEmployee = {
      first_name: first_name !== undefined ? first_name : currentUser.first_name,
      middle_name: middle_name !== undefined ? middle_name : currentUser.middle_name,
      last_name: last_name !== undefined ? last_name : currentUser.last_name,
      email: email !== undefined ? email : currentUser.email,
      mobile: mobile !== undefined ? mobile : currentUser.mobile,
      doj: doj !== undefined ? doj : currentUser.doj,
      company_id: company_id !== undefined ? company_id : currentUser.company_id,
      branch_id: branch_id !== undefined ? branch_id : currentUser.branch_id,
      role_id: role_id !== undefined ? role_id : currentUser.role_id,
      department_id: department_id !== undefined ? department_id : currentUser.department_id,
      designation_id: designation_id !== undefined ? designation_id : currentUser.designation_id,
      employment_type: employment_type !== undefined ? employment_type : currentUser.employment_type
    };

    // Get current offer letter if it exists
    let currentOfferLetter = null;
    if (document_id) {
      const docSelect = await client.query("SELECT offer_letter FROM documents WHERE id = $1", [document_id]);
      if (docSelect.rows.length > 0) {
        currentOfferLetter = docSelect.rows[0].offer_letter;
      }
    }

    // Resolve offer letter
    let resolvedOfferLetter = currentOfferLetter;

    if (!resolvedOfferLetter) {
      resolvedOfferLetter = await generateOfferLetter(client, finalEmployee);
    }

    // 1. Handle documents update/create
    if (document_id) {
      // Update existing document
      await client.query(
        `
        UPDATE documents
        SET 
          aadhar_card = COALESCE($1, aadhar_card),
          voter_card = COALESCE($2, voter_card),
          passport = COALESCE($3, passport),
          pancard = COALESCE($4, pancard),
          offer_letter = COALESCE($5, offer_letter),
          experience_letter = COALESCE($6, experience_letter),
          relieveing_letter = COALESCE($7, relieveing_letter),
          signatures = COALESCE($8, signatures),
          resume = COALESCE($9, resume),
          updated_by = $10,
          updated_at = NOW()
        WHERE id = $11
        `,
        [
          aadhar_card !== undefined ? aadhar_card : null,
          voter_card !== undefined ? voter_card : null,
          passport !== undefined ? passport : null,
          resolvedPancard !== undefined ? resolvedPancard : null,
          resolvedOfferLetter !== undefined ? resolvedOfferLetter : null,
          experience_letter !== undefined ? experience_letter : null,
          relieveing_letter !== undefined ? relieveing_letter : null,
          signatures !== undefined ? signatures : null,
          resume !== undefined ? resume : null,
          updated_by,
          document_id
        ]
      );
    } else {
      // Create document record if missing
      const docResult = await client.query(
        `
        INSERT INTO documents (
          user_id, aadhar_card, voter_card, passport, pancard, 
          offer_letter, experience_letter, relieveing_letter, signatures, resume,
          created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id
        `,
        [
          id,
          aadhar_card || null,
          voter_card || null,
          passport || null,
          resolvedPancard || null,
          resolvedOfferLetter || null,
          experience_letter || null,
          relieveing_letter || null,
          signatures || null,
          resume || null,
          updated_by
        ]
      );
      document_id = docResult.rows[0].id;
    }

    // 2. Update users table
    const userResult = await client.query(
      `
      UPDATE users
      SET
        branch_id = COALESCE($1, branch_id),
        role_id = COALESCE($2, role_id),
        department_id = COALESCE($3, department_id),
        document_id = COALESCE($4, document_id),
        designation_id = COALESCE($5, designation_id),
        employment_type = COALESCE($6, employment_type),
        first_name = COALESCE($7, first_name),
        middle_name = COALESCE($8, middle_name),
        last_name = COALESCE($9, last_name),
        email = COALESCE($10, email),
        work_email = COALESCE($11, work_email),
        password = $12,
        mobile = COALESCE($13, mobile),
        work_phone_number = COALESCE($14, work_phone_number),
        dob = COALESCE($15, dob),
        doj = COALESCE($16, doj),
        present_address1 = COALESCE($17, present_address1),
        present_address2 = COALESCE($18, present_address2),
        present_city = COALESCE($19, present_city),
        present_country = COALESCE($20, present_country),
        present_state = COALESCE($21, present_state),
        present_pincode = COALESCE($22, present_pincode),
        permanent_address1 = COALESCE($23, permanent_address1),
        permanent_address2 = COALESCE($24, permanent_address2),
        permanent_city = COALESCE($25, permanent_city),
        permanent_country = COALESCE($26, permanent_country),
        permanent_state = COALESCE($27, permanent_state),
        permanent_pincode = COALESCE($28, permanent_pincode),
        aadhaar_number = COALESCE($29, aadhaar_number),
        voter_id = COALESCE($30, voter_id),
        pan_number = COALESCE($31, pan_number),
        passport_number = COALESCE($32, passport_number),
        uan_number = COALESCE($33, uan_number),
        pf_number = COALESCE($34, pf_number),
        image = COALESCE($35, image),
        current_experience = COALESCE($36, current_experience),
        total_experience = COALESCE($37, total_experience),
        employment_status = COALESCE($38, employment_status),
        reporting_manager = COALESCE($39, reporting_manager),
        gender = COALESCE($40, gender),
        marital_status = COALESCE($41, marital_status),
        area_of_expertise = COALESCE($42, area_of_expertise),
        building_name = COALESCE($43, building_name),
        floor_number = COALESCE($44, floor_number),
        extension = COALESCE($45, extension),
        seat_number = COALESCE($46, seat_number),
        doe = COALESCE($47, doe),
        status = COALESCE($48, status),
        emergency_contact_name = COALESCE($49, emergency_contact_name),
        emergency_contact_relation = COALESCE($50, emergency_contact_relation),
        emergency_contact_phone = COALESCE($51, emergency_contact_phone),
        updated_by = $52,
        updated_at = NOW()
      WHERE id = $53 AND company_id = $54
      RETURNING *
      `,
      [
        branch_id !== undefined ? branch_id : null,
        role_id !== undefined ? role_id : null,
        department_id !== undefined ? department_id : null,
        document_id,
        designation_id !== undefined ? designation_id : null,
        employment_type !== undefined ? employment_type : null,
        first_name || null,
        middle_name !== undefined ? middle_name : null,
        last_name || null,
        email || null,
        work_email !== undefined ? work_email : null,
        finalPassword,
        mobile !== undefined ? mobile : null,
        work_phone_number !== undefined ? work_phone_number : null,
        dob !== undefined ? dob : null,
        doj !== undefined ? doj : null,
        present_address1 !== undefined ? present_address1 : null,
        present_address2 !== undefined ? present_address2 : null,
        present_city !== undefined ? present_city : null,
        present_country !== undefined ? present_country : null,
        present_state !== undefined ? present_state : null,
        present_pincode !== undefined ? present_pincode : null,
        permanent_address1 !== undefined ? permanent_address1 : null,
        permanent_address2 !== undefined ? permanent_address2 : null,
        permanent_city !== undefined ? permanent_city : null,
        permanent_country !== undefined ? permanent_country : null,
        permanent_state !== undefined ? permanent_state : null,
        permanent_pincode !== undefined ? permanent_pincode : null,
        aadhaar_number !== undefined ? aadhaar_number : null,
        voter_id !== undefined ? voter_id : null,
        pan_number !== undefined ? pan_number : null,
        passport_number !== undefined ? passport_number : null,
        uan_number !== undefined ? uan_number : null,
        pf_number !== undefined ? pf_number : null,
        image !== undefined ? image : null,
        current_experience !== undefined ? current_experience : null,
        total_experience !== undefined ? total_experience : null,
        employment_status || null,
        reporting_manager !== undefined ? reporting_manager : null,
        gender !== undefined ? gender : null,
        marital_status !== undefined ? marital_status : null,
        area_of_expertise !== undefined ? area_of_expertise : null,
        resolvedBuildingId !== undefined ? resolvedBuildingId : null,
        resolvedFloorId !== undefined ? resolvedFloorId : null,
        resolvedExtensionId !== undefined ? resolvedExtensionId : null,
        resolvedSeatId !== undefined ? resolvedSeatId : null,
        doe !== undefined ? doe : null,
        status !== undefined ? status : null,
        emergency_contact_name !== undefined ? emergency_contact_name : null,
        emergency_contact_relation !== undefined ? emergency_contact_relation : null,
        emergency_contact_phone !== undefined ? emergency_contact_phone : null,
        updated_by,
        id,
        company_id
      ]
    );

    await client.query("COMMIT");

    // Fetch the updated employee details with joins
    const updatedUserResult = await client.query(
      `
      SELECT 
        u.*,
        c.company_name as company_name,
        d.aadhar_card,
        d.voter_card,
        d.passport,
        d.pancard as pan_card,
        d.pancard,
        d.offer_letter,
        d.experience_letter,
        d.relieveing_letter,
        d.signatures,
        b.name as branch_name,
        r.role_name,
        dept.department_name,
        desg.title as designation_title,
        build.building_name as building_display_name,
        flr.floor_name as floor_display_name,
        ext.extension_number as extension_display_number,
        st.seat_number as seat_display_number,
        CONCAT(mgr.first_name, ' ', mgr.last_name) as reporting_manager_name
      FROM users u
      LEFT JOIN company c ON u.company_id = c.id
      LEFT JOIN documents d ON u.document_id = d.id
      LEFT JOIN branch b ON u.branch_id = b.id
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN departments dept ON u.department_id = dept.id
      LEFT JOIN designations desg ON u.designation_id = desg.id
      LEFT JOIN building build ON u.building_name = build.id
      LEFT JOIN floor flr ON u.floor_number = flr.id
      LEFT JOIN extension ext ON u.extension = ext.id
      LEFT JOIN seat st ON u.seat_number = st.id
      LEFT JOIN users mgr ON u.reporting_manager = mgr.id
      WHERE u.id = $1 AND u.company_id = $2
      `,
      [id, company_id]
    );

    const updatedUser = updatedUserResult.rows[0];
    if (updatedUser) {
      delete updatedUser.password;
    }

    res.status(200).json({
      success: true,
      message: "Employee updated successfully",
      employee: updatedUser
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("UPDATE EMPLOYEE ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Server Error",
    });
  } finally {
    client.release();
  }
};

// =================================
// DELETE EMPLOYEE
// =================================
exports.deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const company_id = req.user.company_id;

    // Delete user (and ON DELETE CASCADE automatically deletes referencing documents)
    const result = await pool.query(
      `
      DELETE FROM users
      WHERE id = $1 AND company_id = $2
      RETURNING *
      `,
      [id, company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Employee deleted successfully",
    });
  } catch (error) {
    console.error("DELETE EMPLOYEE ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// =================================
// GENERATE EMPLOYEE OFFER LETTER
// =================================
// Shared Puppeteer HTML-to-PDF helper
// async function htmlToPdfBase64(htmlContent) {
//   const puppeteer = require("puppeteer");
//   const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-setuid-sandbox"] });
//   try {
//     const page = await browser.newPage();
//     await page.setContent(htmlContent, { waitUntil: "networkidle0" });
//     const pdfBuffer = await page.pdf({
//       format: "A4",
//       printBackground: true,
//       margin: { top: "0px", right: "0px", bottom: "0px", left: "0px" }
//     });
//     return Buffer.from(pdfBuffer);
//   } finally {
//     await browser.close();
//   }
// }

const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const htmlToPdf = async (html, employeeId) => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setContent(html, {
    waitUntil: "networkidle0",
  });

  const uploadDir = path.join(__dirname, "../../uploads/offer_letters");

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const fileName = `offer_letter_${employeeId}_${Date.now()}.pdf`;
  const filePath = path.join(uploadDir, fileName);

  await page.pdf({
    path: filePath,
    format: "A4",
    printBackground: true,
  });

  await browser.close();

  // Path to store in DB
  return `/uploads/offer_letters/${fileName}`;
};

const htmlToExperiencePdf = async (html, employeeId) => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });

  const uploadDir = path.join(__dirname, "../../uploads/experience_letters");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const fileName = `experience_letter_${employeeId}_${Date.now()}.pdf`;
  const filePath = path.join(uploadDir, fileName);

  await page.pdf({ path: filePath, format: "A4", printBackground: true });
  await browser.close();

  return `/uploads/experience_letters/${fileName}`;
};

const htmlToRelievingPdf = async (html, employeeId) => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });

  const uploadDir = path.join(__dirname, "../../uploads/relieving_letters");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const fileName = `relieving_letter_${employeeId}_${Date.now()}.pdf`;
  const filePath = path.join(uploadDir, fileName);

  await page.pdf({ path: filePath, format: "A4", printBackground: true });
  await browser.close();

  return `/uploads/relieving_letters/${fileName}`;
};
// exports.generateEmployeeOfferLetter = async (req, res) => {
//   const client = await pool.connect();
//   try {
//     const { id } = req.params;
//     const company_id = req.user.company_id;
//     const user_id = req.user.id;

//     // Fetch the employee to make sure they exist and belong to the HR's company
//     const employeeRes = await client.query(
//       `SELECT u.*, d.id as doc_id, d.offer_letter 
//        FROM users u 
//        LEFT JOIN documents d ON u.document_id = d.id 
//        WHERE u.id = $1 AND u.company_id = $2`,
//       [id, company_id]
//     );

//     if (employeeRes.rows.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: "Employee not found in your company"
//       });
//     }

//     const employee = employeeRes.rows[0];

//     // Generate HTML then convert to PDF base64 via Puppeteer
//     await client.query("BEGIN");

//     const offerHtml = await generateOfferLetter(client, {
//       first_name: employee.first_name,
//       middle_name: employee.middle_name,
//       last_name: employee.last_name,
//       email: employee.email,
//       mobile: employee.mobile,
//       doj: employee.doj,
//       company_id: employee.company_id,
//       branch_id: employee.branch_id,
//       role_id: employee.role_id,
//       employment_type: employee.employment_type,
//       department_id: employee.department_id,
//       designation_id: employee.designation_id
//     });
//     const offer_letter = await htmlToPdf(offerHtml);

//     let document_id = employee.document_id;

//     if (document_id) {
//       // Update existing document with new offer letter
//       await client.query(
//         `UPDATE documents 
//          SET offer_letter = $1, updated_by = $2, updated_at = NOW() 
//          WHERE id = $3`,
//         [offer_letter, user_id, document_id]
//       );
//     } else {
//       // Create new document record
//       const docRes = await client.query(
//         `INSERT INTO documents (offer_letter, created_by) 
//          VALUES ($1, $2) 
//          RETURNING id`,
//         [offer_letter, user_id]
//       );
//       document_id = docRes.rows[0].id;

//       // Update user with document_id
//       await client.query(
//         `UPDATE users SET document_id = $1 WHERE id = $2`,
//         [document_id, id]
//       );
//     }

//     await client.query("COMMIT");

//     return res.status(200).json({
//       success: true,
//       message: "Offer letter generated successfully",
//       offer_letter
//     });

//   } catch (error) {
//     await client.query("ROLLBACK");
//     console.error("Generate Offer Letter Error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to generate offer letter",
//       error: error.message
//     });
//   } finally {
//     client.release();
//   }
// };

exports.generateEmployeeOfferLetter = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const company_id = req.user.company_id;
    const user_id = req.user.id;

    const template = req.body.template ? parseInt(req.body.template) : 1;

    const employeeRes = await client.query(
      `SELECT u.*, d.id as doc_id,
              sd.basic, sd.hra, sd.da, sd.ta, sd.allowance, sd.pf, sd.esic, sd.tax
       FROM users u
       LEFT JOIN documents d ON u.document_id = d.id
       LEFT JOIN salary_details sd ON u.id = sd.user_id
       WHERE u.id = $1 AND u.company_id = $2`,
      [id, company_id]
    );

    if (employeeRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Employee not found in your company",
      });
    }

    const employee = employeeRes.rows[0];

    const basic = parseFloat(employee.basic || 0);
    const hra = parseFloat(employee.hra || 0);
    const da = parseFloat(employee.da || 0);
    const ta = parseFloat(employee.ta || 0);
    const allowance = parseFloat(employee.allowance || 0);
    const pf = parseFloat(employee.pf || 0);
    const esic = parseFloat(employee.esic || 0);
    const tax = parseFloat(employee.tax || 0);
    const netSalary = (basic + hra + da + ta + allowance) - (pf + esic + tax);

    const signaturesArray = await getHrAndCeoSignatures(client, company_id);

    await client.query("BEGIN");

    const offerHtml = await generateOfferLetter(client, {
      first_name: employee.first_name,
      middle_name: employee.middle_name,
      last_name: employee.last_name,
      email: employee.email,
      mobile: employee.mobile,
      doj: employee.doj,
      company_id: employee.company_id,
      branch_id: employee.branch_id,
      role_id: employee.role_id,
      employment_type: employee.employment_type,
      department_id: employee.department_id,
      designation_id: employee.designation_id,
      signatures: signaturesArray,
      present_address1: employee.present_address1,
      present_address2: employee.present_address2,
      present_city: employee.present_city,
      present_state: employee.present_state,
      present_pincode: employee.present_pincode,
      gender: employee.gender,
      emergency_contact_name: employee.emergency_contact_name,
      emergency_contact_relation: employee.emergency_contact_relation,
      salary: netSalary,
      template: template
    });
    // Save PDF and get path
    const offer_letter = await htmlToPdf(offerHtml, employee.id);

    let document_id = employee.document_id;

    if (document_id) {
      await client.query(
        `UPDATE documents
         SET offer_letter = $1,
             updated_by = $2,
             updated_at = NOW()
         WHERE id = $3`,
        [offer_letter, user_id, document_id]
      );
    } else {
      const docRes = await client.query(
        `INSERT INTO documents (offer_letter, created_by)
         VALUES ($1, $2)
         RETURNING id`,
        [offer_letter, user_id]
      );

      document_id = docRes.rows[0].id;

      await client.query(
        `UPDATE users
         SET document_id = $1
         WHERE id = $2`,
        [document_id, id]
      );
    }

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "Offer letter generated successfully",
      offer_letter,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Generate Offer Letter Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate offer letter",
      error: error.message,
    });
  } finally {
    client.release();
  }
};


// =================================
// DOWNLOAD EMPLOYEE OFFER LETTER PDF
// =================================
exports.downloadEmployeeOfferLetterPdf = async (req, res) => {
  try {
    const { id } = req.params;
    const company_id = req.user.company_id;

    const employeeRes = await pool.query(
      `SELECT
          u.first_name,
          u.last_name,
          d.offer_letter
       FROM users u
       LEFT JOIN documents d
         ON u.document_id = d.id
       WHERE u.id = $1
         AND u.company_id = $2`,
      [id, company_id]
    );

    if (employeeRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    const employee = employeeRes.rows[0];

    if (!employee.offer_letter) {
      return res.status(404).json({
        success: false,
        message: "Offer letter has not been generated.",
      });
    }

    // Remove leading slash if present
    const relativePath = employee.offer_letter.replace(/^\/+/, "");

    // Build absolute file path
    const pdfPath = path.join(process.cwd(), relativePath);

    // Check if file exists
    if (!fs.existsSync(pdfPath)) {
      return res.status(404).json({
        success: false,
        message: "Offer letter PDF file not found.",
      });
    }

    const fullName = `${employee.first_name || ""} ${employee.last_name || ""}`
      .trim()
      .replace(/\s+/g, "_");

    return res.download(
      pdfPath,
      `Offer_Letter_${fullName}.pdf`,
      (err) => {
        if (err) {
          console.error("Download Error:", err);

          if (!res.headersSent) {
            return res.status(500).json({
              success: false,
              message: "Failed to download PDF.",
            });
          }
        }
      }
    );

  } catch (error) {
    console.error("Download Offer Letter Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to download offer letter.",
      error: error.message,
    });
  }
};

// =================================
// GENERATE EMPLOYEE EXPERIENCE LETTER
// =================================
exports.generateEmployeeExperienceLetter = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const company_id = req.user.company_id;
    const user_id = req.user.id;

    const employeeRes = await client.query(
      `SELECT u.*, d.id as doc_id, d.experience_letter 
       FROM users u 
       LEFT JOIN documents d ON u.document_id = d.id 
       WHERE u.id = $1 AND u.company_id = $2`,
      [id, company_id]
    );

    if (employeeRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Employee not found in your company" });
    }

    const employee = employeeRes.rows[0];

    const signaturesArray = await getHrAndCeoSignatures(client, company_id);

    await client.query("BEGIN");

    const expHtml = await generateExperienceLetter(client, {
      first_name: employee.first_name,
      middle_name: employee.middle_name,
      last_name: employee.last_name,
      email: employee.email,
      mobile: employee.mobile,
      doj: employee.doj,
      doe: employee.doe,
      company_id: employee.company_id,
      branch_id: employee.branch_id,
      role_id: employee.role_id,
      employment_type: employee.employment_type,
      department_id: employee.department_id,
      designation_id: employee.designation_id,
      current_experience: employee.current_experience,
      total_experience: employee.total_experience,
      signatures: signaturesArray
    });

    const experience_letter = await htmlToExperiencePdf(expHtml, employee.id);

    let document_id = employee.document_id;

    if (document_id) {
      await client.query(
        `UPDATE documents SET experience_letter = $1, updated_by = $2, updated_at = NOW() WHERE id = $3`,
        [experience_letter, user_id, document_id]
      );
    } else {
      const docRes = await client.query(
        `INSERT INTO documents (experience_letter, created_by) VALUES ($1, $2) RETURNING id`,
        [experience_letter, user_id]
      );
      document_id = docRes.rows[0].id;
      await client.query(`UPDATE users SET document_id = $1 WHERE id = $2`, [document_id, id]);
    }

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "Experience letter generated successfully",
      experience_letter
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Generate Experience Letter Error:", error);
    return res.status(500).json({ success: false, message: "Failed to generate experience letter", error: error.message });
  } finally {
    client.release();
  }
};

// =================================
// DOWNLOAD EMPLOYEE EXPERIENCE LETTER PDF
// =================================
exports.downloadEmployeeExperienceLetterPdf = async (req, res) => {
  try {
    const { id } = req.params;
    const company_id = req.user.company_id;

    const employeeRes = await pool.query(
      `SELECT u.first_name, u.last_name, d.experience_letter
       FROM users u
       LEFT JOIN documents d ON u.document_id = d.id
       WHERE u.id = $1 AND u.company_id = $2`,
      [id, company_id]
    );

    if (employeeRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Employee not found." });
    }

    const employee = employeeRes.rows[0];

    if (!employee.experience_letter) {
      return res.status(404).json({ success: false, message: "Experience letter has not been generated." });
    }

    // Remove leading slash if present
    const relativePath = employee.experience_letter.replace(/^\/+/, "");

    // Build absolute file path
    const pdfPath = path.join(process.cwd(), relativePath);

    // Check if file exists
    if (!fs.existsSync(pdfPath)) {
      return res.status(404).json({ success: false, message: "Experience letter PDF file not found." });
    }

    const fullName = `${employee.first_name || ""} ${employee.last_name || ""}`
      .trim()
      .replace(/\s+/g, "_");

    return res.download(pdfPath, `Experience_Letter_${fullName}.pdf`, (err) => {
      if (err) {
        console.error("Download Error:", err);
        if (!res.headersSent) {
          return res.status(500).json({ success: false, message: "Failed to download PDF." });
        }
      }
    });
  } catch (error) {
    console.error("Download Experience Letter PDF Error:", error);
    return res.status(500).json({ success: false, message: "Failed to download experience letter.", error: error.message });
  }
};

// =================================
// GENERATE EMPLOYEE RELIEVING LETTER
// =================================
exports.generateEmployeeRelievingLetter = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const company_id = req.user.company_id;
    const user_id = req.user.id;

    const employeeRes = await client.query(
      `SELECT u.*, d.id as doc_id, d.relieveing_letter 
       FROM users u 
       LEFT JOIN documents d ON u.document_id = d.id 
       WHERE u.id = $1 AND u.company_id = $2`,
      [id, company_id]
    );

    if (employeeRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Employee not found in your company" });
    }

    const employee = employeeRes.rows[0];

    if (!employee.doe) {
      return res.status(400).json({
        success: false,
        message: "Relieving letter cannot be generated because this employee does not have a last working day (exit date) set."
      });
    }

    const signaturesArray = await getHrAndCeoSignatures(client, company_id);

    await client.query("BEGIN");

    const relHtml = await generateRelievingLetter(client, {
      first_name: employee.first_name,
      middle_name: employee.middle_name,
      last_name: employee.last_name,
      email: employee.email,
      mobile: employee.mobile,
      doj: employee.doj,
      doe: employee.doe,
      company_id: employee.company_id,
      branch_id: employee.branch_id,
      role_id: employee.role_id,
      employment_type: employee.employment_type,
      department_id: employee.department_id,
      designation_id: employee.designation_id,
      signatures: signaturesArray
    });
    const relieving_letter = await htmlToRelievingPdf(relHtml, employee.id);

    let document_id = employee.document_id;

    if (document_id) {
      await client.query(
        `UPDATE documents SET relieveing_letter = $1, updated_by = $2, updated_at = NOW() WHERE id = $3`,
        [relieving_letter, user_id, document_id]
      );
    } else {
      const docRes = await client.query(
        `INSERT INTO documents (relieveing_letter, created_by) VALUES ($1, $2) RETURNING id`,
        [relieving_letter, user_id]
      );
      document_id = docRes.rows[0].id;
      await client.query(`UPDATE users SET document_id = $1 WHERE id = $2`, [document_id, id]);
    }

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "Relieving letter generated successfully",
      relieving_letter
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Generate Relieving Letter Error:", error);
    return res.status(500).json({ success: false, message: "Failed to generate relieving letter", error: error.message });
  } finally {
    client.release();
  }
};

// =================================
// DOWNLOAD EMPLOYEE RELIEVING LETTER PDF
// =================================
exports.downloadEmployeeRelievingLetterPdf = async (req, res) => {
  try {
    const { id } = req.params;
    const company_id = req.user.company_id;

    const employeeRes = await pool.query(
      `SELECT u.first_name, u.last_name, d.relieveing_letter
       FROM users u
       LEFT JOIN documents d ON u.document_id = d.id
       WHERE u.id = $1 AND u.company_id = $2`,
      [id, company_id]
    );

    if (employeeRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Employee not found." });
    }

    const employee = employeeRes.rows[0];

    if (!employee.relieveing_letter) {
      return res.status(404).json({ success: false, message: "Relieving letter has not been generated." });
    }

    // Remove leading slash if present
    const relativePath = employee.relieveing_letter.replace(/^\/+/, "");

    // Build absolute file path
    const pdfPath = path.join(process.cwd(), relativePath);

    // Check if file exists
    if (!fs.existsSync(pdfPath)) {
      return res.status(404).json({ success: false, message: "Relieving letter PDF file not found." });
    }

    const fullName = `${employee.first_name || ""} ${employee.last_name || ""}`
      .trim()
      .replace(/\s+/g, "_");

    return res.download(pdfPath, `Relieving_Letter_${fullName}.pdf`, (err) => {
      if (err) {
        console.error("Download Error:", err);
        if (!res.headersSent) {
          return res.status(500).json({ success: false, message: "Failed to download PDF." });
        }
      }
    });
  } catch (error) {
    console.error("Download Relieving Letter PDF Error:", error);
    return res.status(500).json({ success: false, message: "Failed to download relieving letter.", error: error.message });
  }
};

// =================================
// GET HTML VIEW OF LETTERS (NO PDF WRAPPER)
// =================================
exports.getEmployeeOfferLetterHtml = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const company_id = req.user.company_id;

    const template = req.query.template ? parseInt(req.query.template) : 1;

    const employeeRes = await client.query(
      `SELECT u.*,
              sd.basic, sd.hra, sd.da, sd.ta, sd.allowance, sd.pf, sd.esic, sd.tax
       FROM users u
       LEFT JOIN salary_details sd ON u.id = sd.user_id
       WHERE u.id = $1 AND u.company_id = $2`,
      [id, company_id]
    );

    if (employeeRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    const employee = employeeRes.rows[0];

    const basic = parseFloat(employee.basic || 0);
    const hra = parseFloat(employee.hra || 0);
    const da = parseFloat(employee.da || 0);
    const ta = parseFloat(employee.ta || 0);
    const allowance = parseFloat(employee.allowance || 0);
    const pf = parseFloat(employee.pf || 0);
    const esic = parseFloat(employee.esic || 0);
    const tax = parseFloat(employee.tax || 0);
    const netSalary = (basic + hra + da + ta + allowance) - (pf + esic + tax);

    const signaturesArray = await getHrAndCeoSignatures(client, company_id);

    let htmlContent = await generateOfferLetter(client, {
      first_name: employee.first_name,
      middle_name: employee.middle_name,
      last_name: employee.last_name,
      email: employee.email,
      mobile: employee.mobile,
      doj: employee.doj,
      company_id: employee.company_id,
      branch_id: employee.branch_id,
      role_id: employee.role_id,
      employment_type: employee.employment_type,
      department_id: employee.department_id,
      designation_id: employee.designation_id,
      signatures: signaturesArray,
      present_address1: employee.present_address1,
      present_address2: employee.present_address2,
      present_city: employee.present_city,
      present_state: employee.present_state,
      present_pincode: employee.present_pincode,
      gender: employee.gender,
      emergency_contact_name: employee.emergency_contact_name,
      emergency_contact_relation: employee.emergency_contact_relation,
      salary: netSalary,
      template: template
    });

    if (htmlContent && htmlContent.startsWith("data:text/html;base64,")) {
      htmlContent = Buffer.from(htmlContent.split(",")[1], "base64").toString("utf-8");
    }

    return res.status(200).json({ success: true, html: htmlContent });
  } catch (error) {
    console.error("View Offer Letter HTML Error:", error);
    return res.status(500).json({ success: false, message: "Failed to load offer letter view", error: error.message });
  } finally {
    client.release();
  }
};

exports.getEmployeeExperienceLetterHtml = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const company_id = req.user.company_id;

    const employeeRes = await client.query(
      `SELECT u.* 
       FROM users u 
       WHERE u.id = $1 AND u.company_id = $2`,
      [id, company_id]
    );

    if (employeeRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    const employee = employeeRes.rows[0];

    const signaturesArray = await getHrAndCeoSignatures(client, company_id);

    let expHtml = await generateExperienceLetter(client, {
      first_name: employee.first_name,
      middle_name: employee.middle_name,
      last_name: employee.last_name,
      email: employee.email,
      mobile: employee.mobile,
      doj: employee.doj,
      doe: employee.doe,
      company_id: employee.company_id,
      branch_id: employee.branch_id,
      role_id: employee.role_id,
      employment_type: employee.employment_type,
      department_id: employee.department_id,
      designation_id: employee.designation_id,
      current_experience: employee.current_experience,
      total_experience: employee.total_experience,
      signatures: signaturesArray
    });

    if (expHtml && expHtml.startsWith("data:text/html;base64,")) {
      expHtml = Buffer.from(expHtml.split(",")[1], "base64").toString("utf-8");
    }

    return res.status(200).json({ success: true, html: expHtml });
  } catch (error) {
    console.error("View Experience Letter HTML Error:", error);
    return res.status(500).json({ success: false, message: "Failed to load experience letter view", error: error.message });
  } finally {
    client.release();
  }
};

exports.getEmployeeRelievingLetterHtml = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const company_id = req.user.company_id;

    const employeeRes = await client.query(
      `SELECT u.* 
       FROM users u 
       WHERE u.id = $1 AND u.company_id = $2`,
      [id, company_id]
    );

    if (employeeRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    const employee = employeeRes.rows[0];
    if (!employee.doe) {
      return res.status(400).json({
        success: false,
        message: "Relieving letter cannot be viewed because this employee does not have a last working day (exit date) set."
      });
    }

    const signaturesArray = await getHrAndCeoSignatures(client, company_id);

    let relHtml = await generateRelievingLetter(client, {
      first_name: employee.first_name,
      middle_name: employee.middle_name,
      last_name: employee.last_name,
      email: employee.email,
      mobile: employee.mobile,
      doj: employee.doj,
      doe: employee.doe,
      company_id: employee.company_id,
      branch_id: employee.branch_id,
      role_id: employee.role_id,
      employment_type: employee.employment_type,
      department_id: employee.department_id,
      designation_id: employee.designation_id,
      signatures: signaturesArray
    });

    if (relHtml && relHtml.startsWith("data:text/html;base64,")) {
      relHtml = Buffer.from(relHtml.split(",")[1], "base64").toString("utf-8");
    }

    return res.status(200).json({ success: true, html: relHtml });
  } catch (error) {
    console.error("View Relieving Letter HTML Error:", error);
    return res.status(500).json({ success: false, message: "Failed to load relieving letter view", error: error.message });
  } finally {
    client.release();
  }
};

// =================================
// GET EMPLOYEE WARNING LETTERS
// =================================
exports.getEmployeeWarningLetters = async (req, res) => {
  try {
    const { id } = req.params;
    const company_id = req.user.company_id;

    // Verify employee belongs to this company
    const employeeCheck = await pool.query(
      `SELECT id FROM users WHERE id = $1 AND company_id = $2`,
      [id, company_id]
    );

    if (employeeCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Employee not found in your company" });
    }

    const result = await pool.query(
      `SELECT w.*, 
              CONCAT(u.first_name, ' ', u.last_name) AS issued_by_name
       FROM warning_letter w
       LEFT JOIN users u ON w.issued_by = u.id
       WHERE w.user_id = $1
       ORDER BY w.created_at DESC`,
      [id]
    );

    return res.status(200).json({
      success: true,
      warning_letters: result.rows
    });
  } catch (error) {
    console.error("Get Employee Warning Letters Error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch warning letters", error: error.message });
  }
};

// =================================
// CREATE EMPLOYEE WARNING LETTER (SEND & SAVE)
// =================================
exports.createEmployeeWarningLetter = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const company_id = req.user.company_id;
    const sender_user_id = req.user.id;
    const { subject, description } = req.body;

    if (!subject || !description) {
      return res.status(400).json({ success: false, message: "Subject and Description are required" });
    }

    await client.query("BEGIN");

    // Get employee details
    const employeeRes = await client.query(
      `SELECT first_name, last_name, email FROM users WHERE id = $1 AND company_id = $2`,
      [id, company_id]
    );

    if (employeeRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "Employee not found in your company" });
    }

    const employee = employeeRes.rows[0];

    // Get company details for the warning letter signature and stamp
    const companyRes = await client.query(
      `SELECT company_name, logo, stamp, email, phone, address1, address2, city, state, pincode 
       FROM company 
       WHERE id = $1`,
      [company_id]
    );

    if (companyRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "Company not found" });
    }

    const company = companyRes.rows[0];

    // Insert warning letter into database
    const insertRes = await client.query(
      `INSERT INTO warning_letter (user_id, subject, description, issued_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, subject, description, sender_user_id]
    );

    // Build company address
    const addrParts = [company.address1, company.address2, company.city, company.state].filter(Boolean);
    let companyAddress = "Corporate Headquarters";
    if (addrParts.length > 0) {
      companyAddress = addrParts.join(", ");
      if (company.pincode) companyAddress += ` - ${company.pincode}`;
    }

    // Send the email
    const sendEmail = require("../utils/sendEmail");
    await sendEmail.sendWarningEmail({
      email: employee.email,
      employeeName: `${employee.first_name} ${employee.last_name}`,
      companyName: company.company_name,
      companyLogo: company.logo,
      companyAddress: companyAddress,
      companyEmail: company.email,
      companyPhone: company.phone,
      subject: subject,
      description: description,
      warningDate: new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
      }),
      stamp: company.stamp
    });

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "Warning letter issued and emailed successfully",
      warning_letter: insertRes.rows[0]
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Create Employee Warning Letter Error:", error);
    return res.status(500).json({ success: false, message: "Failed to issue warning letter", error: error.message });
  } finally {
    client.release();
  }
};

const htmlToWarningPdf = async (html, employeeId) => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });

  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: { top: "40px", bottom: "40px", left: "40px", right: "40px" }
  });

  await browser.close();
  return pdfBuffer;
};

exports.downloadEmployeeWarningLetterPdf = async (req, res) => {
  try {
    const { letterId } = req.params;

    const warningRes = await pool.query(
      `SELECT w.*, u.first_name, u.last_name, u.company_employee_id, u.company_id
       FROM warning_letter w
       JOIN users u ON w.user_id = u.id
       WHERE w.id = $1`,
      [letterId]
    );

    if (warningRes.rows.length === 0) {
      return res.status(404).send("Warning letter not found");
    }

    const warning = warningRes.rows[0];

    const companyRes = await pool.query(
      "SELECT company_name, logo, email, phone, address1, address2, city, state, pincode FROM company WHERE id = $1",
      [warning.company_id]
    );
    const company = companyRes.rows[0] || {};

    const addrParts = [company.address1, company.address2, company.city, company.state].filter(Boolean);
    let companyAddress = "Corporate Headquarters";
    if (addrParts.length > 0) {
      companyAddress = addrParts.join(", ");
      if (company.pincode) companyAddress += ` - ${company.pincode}`;
    }

    const getFullUrl = (pathStr) => {
      if (!pathStr) return "";
      if (pathStr.startsWith("http://") || pathStr.startsWith("https://")) return pathStr;
      const cleaned = pathStr.startsWith("/") ? pathStr.substring(1) : pathStr;
      return `http://localhost:5000/${cleaned}`;
    };

    const logoUrl = getFullUrl(company.logo);

    const letterHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <title>Warning Letter - ${warning.first_name} ${warning.last_name}</title>
      <style>
        body { font-family: Arial, Helvetica, sans-serif; color: #333; line-height: 1.6; padding: 40px; }
        .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; text-align: center; }
        .logo { height: 60px; max-height: 60px; margin-bottom: 10px; }
        .company-name { font-size: 20px; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; }
        .company-address { font-size: 12px; color: #555; }
        .letter-content { font-size: 13px; color: #334155; }
        table { border-collapse: collapse; width: 100%; margin: 15px 0; }
        table, th, td { border: 1px solid #cbd5e1; }
        th, td { padding: 8px; text-align: left; }
        th { background-color: #f8fafc; }
      </style>
    </head>
    <body>
      <div class="header">
        ${logoUrl ? '<img class="logo" src="' + logoUrl + '" alt="Logo" />' : ""}
        <div class="company-name">${company.company_name}</div>
        <div class="company-address">${companyAddress} | Email: ${company.email} | Phone: ${company.phone}</div>
      </div>
      <div class="letter-content">
        ${warning.description}
      </div>
    </body>
    </html>
    `;

    const pdfBuffer = await htmlToWarningPdf(letterHtml, warning.user_id);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=warning_letter_${warning.company_employee_id}.pdf`);
    return res.send(pdfBuffer);
  } catch (error) {
    console.error("Download Warning Letter PDF Error:", error);
    return res.status(500).send("Internal Server Error");
  }
};

exports.getLoggedBranding = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const companyId = req.user.company_id;

    // Fetch company info
    const companyRes = await pool.query(
      "SELECT company_name, logo, stamp FROM company WHERE id = $1",
      [companyId]
    );
    const company = companyRes.rows[0] || {};

    const getFullUrl = (pathStr) => {
      if (!pathStr) return "";
      if (pathStr.startsWith("http://") || pathStr.startsWith("https://") || pathStr.startsWith("data:")) return pathStr;
      const cleaned = pathStr.startsWith("/") ? pathStr.substring(1) : pathStr;
      return `http://localhost:5000/${cleaned}`;
    };

    const logoUrl = getFullUrl(company.logo);
    let signatureUrl = "";

    if (role === "company") {
      signatureUrl = getFullUrl(company.stamp || company.logo);
    } else {
      const docRes = await pool.query(
        "SELECT signatures FROM documents WHERE user_id = $1 ORDER BY id DESC LIMIT 1",
        [userId]
      );
      const doc = docRes.rows[0];
      if (doc && doc.signatures) {
        signatureUrl = getFullUrl(doc.signatures);
      } else {
        signatureUrl = getFullUrl(company.stamp || company.logo);
      }
    }

    return res.status(200).json({
      success: true,
      logoUrl: logoUrl || "https://placehold.co/120x60?text=Logo",
      signatureUrl: signatureUrl || "https://placehold.co/100x40?text=Signature"
    });
  } catch (error) {
    console.error("Get Logged Branding Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// GET EMPLOYEE TERMINATION LETTERS
// =================================
exports.getEmployeeTerminationLetters = async (req, res) => {
  try {
    const { id } = req.params;
    const company_id = req.user.company_id;

    // Verify employee belongs to this company
    const employeeCheck = await pool.query(
      `SELECT id FROM users WHERE id = $1 AND company_id = $2`,
      [id, company_id]
    );

    if (employeeCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Employee not found in your company" });
    }

    const result = await pool.query(
      `SELECT t.*, 
              CONCAT(u.first_name, ' ', u.last_name) AS issued_by_name
       FROM termination_letter t
       LEFT JOIN users u ON t.issued_by = u.id
       WHERE t.user_id = $1
       ORDER BY t.created_at DESC`,
      [id]
    );

    return res.status(200).json({
      success: true,
      termination_letters: result.rows
    });
  } catch (error) {
    console.error("Get Employee Termination Letters Error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch termination letters", error: error.message });
  }
};

// =================================
// CREATE EMPLOYEE TERMINATION LETTER (SEND & SAVE)
// =================================
exports.createEmployeeTerminationLetter = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const company_id = req.user.company_id;
    const sender_user_id = req.user.id;
    const { subject, description } = req.body;

    if (!subject || !description) {
      return res.status(400).json({ success: false, message: "Subject and Description are required" });
    }

    await client.query("BEGIN");

    // Get employee details
    const employeeRes = await client.query(
      `SELECT first_name, last_name, email FROM users WHERE id = $1 AND company_id = $2`,
      [id, company_id]
    );

    if (employeeRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "Employee not found in your company" });
    }

    const employee = employeeRes.rows[0];

    // Get company details for the logo, signature, etc.
    const companyRes = await client.query(
      `SELECT company_name, logo, stamp, email, phone, address1, address2, city, state, pincode 
       FROM company 
       WHERE id = $1`,
      [company_id]
    );

    if (companyRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "Company not found" });
    }

    const company = companyRes.rows[0];

    // Insert termination letter into database
    const insertRes = await client.query(
      `INSERT INTO termination_letter (user_id, subject, description, issued_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, subject, description, sender_user_id]
    );

    // Send the email
    const sendEmail = require("../utils/sendEmail");
    await sendEmail.sendTerminationEmail({
      email: employee.email,
      companyName: company.company_name,
      subject: subject,
      description: description,
    });

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "Termination letter issued and emailed successfully",
      termination_letter: insertRes.rows[0]
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Create Employee Termination Letter Error:", error);
    return res.status(500).json({ success: false, message: "Failed to issue termination letter", error: error.message });
  } finally {
    client.release();
  }
};

const htmlToTerminationPdf = async (html, employeeId) => {
  const puppeteer = require("puppeteer");
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });

  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: { top: "40px", bottom: "40px", left: "40px", right: "40px" }
  });

  await browser.close();
  return pdfBuffer;
};

// DOWNLOAD EMPLOYEE TERMINATION LETTER PDF
// =================================
exports.downloadEmployeeTerminationLetterPdf = async (req, res) => {
  try {
    const { letterId } = req.params;

    const terminationRes = await pool.query(
      `SELECT t.*, u.first_name, u.last_name, u.company_employee_id, u.company_id
       FROM termination_letter t
       JOIN users u ON t.user_id = u.id
       WHERE t.id = $1`,
      [letterId]
    );

    if (terminationRes.rows.length === 0) {
      return res.status(404).send("Termination letter not found");
    }

    const termination = terminationRes.rows[0];

    const companyRes = await pool.query(
      "SELECT company_name, logo, email, phone, address1, address2, city, state, pincode FROM company WHERE id = $1",
      [termination.company_id]
    );
    const company = companyRes.rows[0] || {};

    const addrParts = [company.address1, company.address2, company.city, company.state].filter(Boolean);
    let companyAddress = "Corporate Headquarters";
    if (addrParts.length > 0) {
      companyAddress = addrParts.join(", ");
      if (company.pincode) companyAddress += ` - ${company.pincode}`;
    }

    const getFullUrl = (pathStr) => {
      if (!pathStr) return "";
      if (pathStr.startsWith("http://") || pathStr.startsWith("https://")) return pathStr;
      const cleaned = pathStr.startsWith("/") ? pathStr.substring(1) : pathStr;
      return `http://localhost:5000/${cleaned}`;
    };

    const logoUrl = getFullUrl(company.logo);

    const letterHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <title>Termination Letter - ${termination.first_name} ${termination.last_name}</title>
      <style>
        body { font-family: Arial, Helvetica, sans-serif; color: #333; line-height: 1.6; padding: 40px; }
        .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; text-align: center; }
        .logo { height: 60px; max-height: 60px; margin-bottom: 10px; }
        .company-name { font-size: 20px; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; }
        .company-address { font-size: 12px; color: #555; }
        .letter-content { font-size: 13px; color: #334155; }
        table { border-collapse: collapse; width: 100%; margin: 15px 0; }
        table, th, td { border: 1px solid #cbd5e1; }
        th, td { padding: 8px; text-align: left; }
        th { background-color: #f8fafc; }
      </style>
    </head>
    <body>
      <div class="header">
        ${logoUrl ? '<img class="logo" src="' + logoUrl + '" alt="Logo" />' : ""}
        <div class="company-name">${company.company_name}</div>
        <div class="company-address">${companyAddress} | Email: ${company.email} | Phone: ${company.phone}</div>
      </div>
      <div class="letter-content">
        ${termination.description}
      </div>
    </body>
    </html>
    `;

    const pdfBuffer = await htmlToTerminationPdf(letterHtml, termination.user_id);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=termination_letter_${termination.company_employee_id}.pdf`);
    return res.send(pdfBuffer);
  } catch (error) {
    console.error("Download Termination Letter PDF Error:", error);
    return res.status(500).send("Internal Server Error");
  }
};

// =================================
// GET EMPLOYEE RESIGNATION LETTERS
// =================================
exports.getEmployeeResignationLetters = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;
    const role = req.user.role;

    // Security check: employees can only fetch their own resignation letters
    if (role === "employee" && Number(id) !== Number(user_id)) {
      return res.status(403).json({ success: false, message: "Unauthorized access to resignation details" });
    }

    const result = await pool.query(
      `SELECT r.*, 
              CONCAT(u.first_name, ' ', u.last_name) AS employee_name
       FROM resignation_letter r
       JOIN users u ON r.user_id = u.id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC`,
      [id]
    );

    return res.status(200).json({
      success: true,
      resignation_letters: result.rows
    });
  } catch (error) {
    console.error("Get Employee Resignation Letters Error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch resignation letters", error: error.message });
  }
};

// =================================
// CREATE EMPLOYEE RESIGNATION LETTER (SUBMIT)
// =================================
exports.createEmployeeResignationLetter = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;
    const role = req.user.role;
    const { subject, description } = req.body;

    // Security check: employees can only submit their own resignation letters
    if (role === "employee" && Number(id) !== Number(user_id)) {
      return res.status(403).json({ success: false, message: "Unauthorized to submit resignation for another employee" });
    }

    if (!subject || !description) {
      return res.status(400).json({ success: false, message: "Subject and Description are required" });
    }

    // 1. Fetch employee details and company info
    const employeeRes = await pool.query(
      `SELECT u.first_name, u.last_name, u.email, u.company_id, c.company_name
       FROM users u
       LEFT JOIN company c ON u.company_id = c.id
       WHERE u.id = $1`,
      [id]
    );

    if (employeeRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    const employee = employeeRes.rows[0];

    // 2. Fetch HR Manager details
    const hrManagerRes = await pool.query(
      `SELECT u.work_email, u.email, CONCAT(u.first_name, ' ', u.last_name) AS hr_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.company_id = $1 AND r.role_name = 'HR Manager'
       LIMIT 1`,
      [employee.company_id]
    );

    let hrEmail;
    let hrName = "HR Manager";

    if (hrManagerRes.rows.length > 0) {
      hrEmail = hrManagerRes.rows[0].work_email || hrManagerRes.rows[0].email;
      hrName = hrManagerRes.rows[0].hr_name;
    } else {
      const companyRes = await pool.query(
        `SELECT email, company_name FROM company WHERE id = $1`,
        [employee.company_id]
      );
      if (companyRes.rows.length > 0) {
        hrEmail = companyRes.rows[0].email;
        hrName = `${companyRes.rows[0].company_name} HR`;
      } else {
        hrEmail = "admin@technova.com";
      }
    }

    // 3. Save resignation letter to database
    const result = await pool.query(
      `INSERT INTO resignation_letter (user_id, subject, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [id, subject, description]
    );

    // 4. Send email to HR Manager
    try {
      const sendEmail = require("../utils/sendEmail");
      await sendEmail.sendResignationEmail({
        toEmail: hrEmail,
        employeeName: `${employee.first_name} ${employee.last_name}`,
        employeeEmail: employee.email,
        companyName: employee.company_name || "Zenova HR Partner",
        subject: subject,
        description: description,
      });
    } catch (emailErr) {
      console.error("Resignation email sending failed, but DB record was saved:", emailErr);
    }

    return res.status(201).json({
      success: true,
      message: "Resignation letter submitted and email sent successfully",
      resignation_letter: result.rows[0],
      sent_to: {
        name: hrName,
        email: hrEmail
      }
    });
  } catch (error) {
    console.error("Create Employee Resignation Letter Error:", error);
    return res.status(500).json({ success: false, message: "Failed to submit resignation letter", error: error.message });
  }
};

// =================================
// GET EMPLOYEE'S HR MANAGER
// =================================
exports.getEmployeeHrManager = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;
    const role = req.user.role;

    if (role === "employee" && Number(id) !== Number(user_id)) {
      return res.status(403).json({ success: false, message: "Unauthorized access to employee details" });
    }

    // 1. Get employee's company ID
    const employeeRes = await pool.query(
      `SELECT company_id FROM users WHERE id = $1`,
      [id]
    );

    if (employeeRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    const company_id = employeeRes.rows[0].company_id;

    // 2. Query HR Manager for this company
    const hrManagerRes = await pool.query(
      `SELECT u.work_email, u.email, CONCAT(u.first_name, ' ', u.last_name) AS hr_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.company_id = $1 AND r.role_name = 'HR Manager'
       LIMIT 1`,
      [company_id]
    );

    let hr_name = "HR Manager";
    let email = "";

    if (hrManagerRes.rows.length > 0) {
      hr_name = hrManagerRes.rows[0].hr_name;
      email = hrManagerRes.rows[0].work_email || hrManagerRes.rows[0].email;
    } else {
      // Fallback to company email
      const companyRes = await pool.query(
        `SELECT company_name, email FROM company WHERE id = $1`,
        [company_id]
      );
      if (companyRes.rows.length > 0) {
        hr_name = `${companyRes.rows[0].company_name} HR`;
        email = companyRes.rows[0].email;
      } else {
        email = "admin@technova.com";
      }
    }

    return res.status(200).json({
      success: true,
      hr_manager: {
        name: hr_name,
        email: email
      }
    });
  } catch (error) {
    console.error("Get Employee's HR Manager Error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch HR Manager details", error: error.message });
  }
};

// =================================
// GET ALL COMPANY RESIGNATION LETTERS
// =================================
exports.getAllResignationLetters = async (req, res) => {
  try {
    const role = req.user.role;
    const company_id = req.user.company_id;

    // Security check: only company admins or HR can fetch all resignation letters
    if (role !== "company" && req.user.role_name !== "Super Admin" && req.user.role_name !== "HR Manager") {
      return res.status(403).json({ success: false, message: "Unauthorized access to company resignation letters" });
    }

    const result = await pool.query(
      `SELECT r.*, 
              CONCAT(u.first_name, ' ', u.last_name) AS employee_name,
              u.company_employee_id,
              u.email AS employee_email
       FROM resignation_letter r
       JOIN users u ON r.user_id = u.id
       WHERE u.company_id = $1
       ORDER BY r.created_at DESC`,
      [company_id]
    );

    return res.status(200).json({
      success: true,
      resignation_letters: result.rows
    });
  } catch (error) {
    console.error("Get All Resignation Letters Error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch resignation letters", error: error.message });
  }
};

// =================================
// GET RESIGNATION LETTER BY ID
// =================================
exports.getResignationLetterById = async (req, res) => {
  try {
    const { letterId } = req.params;
    const user_id = req.user.id;
    const role = req.user.role;
    const company_id = req.user.company_id;

    const result = await pool.query(
      `SELECT r.*, 
              CONCAT(u.first_name, ' ', u.last_name) AS employee_name,
              u.company_id
       FROM resignation_letter r
       JOIN users u ON r.user_id = u.id
       WHERE r.id = $1`,
      [letterId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Resignation letter not found" });
    }

    const letter = result.rows[0];

    // Security check: employee can only see their own letter; company can see any letter in their company
    if (role === "employee" && Number(letter.user_id) !== Number(user_id)) {
      return res.status(403).json({ success: false, message: "Unauthorized access to resignation letter" });
    }

    if (role === "company" && Number(letter.company_id) !== Number(company_id)) {
      return res.status(403).json({ success: false, message: "Unauthorized access to resignation letter" });
    }

    return res.status(200).json({
      success: true,
      resignation_letter: letter
    });
  } catch (error) {
    console.error("Get Resignation Letter By ID Error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch resignation letter", error: error.message });
  }
};




