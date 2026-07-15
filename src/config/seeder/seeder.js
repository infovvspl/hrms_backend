require("dotenv").config();
const pool = require("../database");
const { generateOfferLetter } = require("../../utils/documentGenerator");

const seedData = async () => {
  const client = await pool.connect();

  const defaultLeaveTypes = [
    { name: "Sick Leave", credit_type: "Monthly", carry_forward: "No", total_leave: 12 },
    { name: "Casual Leave", credit_type: "Monthly", carry_forward: "No", total_leave: 10 },
    { name: "Annual Leave", credit_type: "Yearly", carry_forward: "Yearly", total_leave: 15 },
    { name: "Maternity Leave", credit_type: "Yearly", carry_forward: "No", total_leave: 84 }
  ];
  const companyLeaveTypeIds = {};

  try {
    await client.query("BEGIN");

    // Clear existing data in lookup and user tables to prevent duplicates and constraint violations
    await client.query(
      "TRUNCATE TABLE users, documents, seat, extension, floor, building, designations, departments, roles, branch, shift, assign_shift, attendance, leave_types, remaining_leave, \"leave\", holiday CASCADE"
    );

    // =====================================
    // SECTOR
    // =====================================
    const sectors = [
      "Information Technology",
      "Healthcare",
      "Finance & Banking",
      "Education",
      "Manufacturing",
      "Retail",
      "Real Estate",
      "Logistics & Supply Chain",
      "Telecommunications",
      "Media & Entertainment",
    ];

    const sectorIds = {};
    for (const name of sectors) {
      const res = await client.query(
        `INSERT INTO sector (sector_name) VALUES ($1) ON CONFLICT (sector_name) DO UPDATE SET sector_name = EXCLUDED.sector_name RETURNING id`,
        [name]
      );
      sectorIds[name] = res.rows[0].id;
    }
    console.log("✅ Sectors seeded");

    // =====================================
    // COMPANY TYPE
    // =====================================
    const companyTypes = [
      "Private Limited",
      "Public Limited",
      "Sole Proprietorship",
      "Partnership",
      "LLP",
      "OPC",
      "NGO",
      "Government",
      "Startup",
      "MNC",
    ];

    const companyTypeIds = {};
    for (const name of companyTypes) {
      const res = await client.query(
        `INSERT INTO company_type (company_type_name) VALUES ($1) ON CONFLICT (company_type_name) DO UPDATE SET company_type_name = EXCLUDED.company_type_name RETURNING id`,
        [name]
      );
      companyTypeIds[name] = res.rows[0].id;
    }
    console.log("✅ Company types seeded");

    // =====================================
    // COMPANY
    // =====================================
    const companies = [
      {
        company_name: "TechNova Solutions Pvt Ltd",
        email: "prayoswini08@gmail.com",
        password: "1234",
        phone: "9876543210",
        address1: "12, MG Road",
        address2: "Indiranagar",
        city: "Bengaluru",
        country: "India",
        state: "Karnataka",
        pincode: "560001",
        company_type: companyTypeIds["Private Limited"],
        sector: sectorIds["Information Technology"],
        cin_number: "U72900KA2015PTC082341",
        registration_number: "KA2015082341",
        gst_no: "29AABCT1332L1ZX",
        is_verified: true,
        login_type: "email",
      },
      {
        company_name: "MediCare Health Services",
        email: "parasharpriya487@gmail.com",
        password: "1234",
        phone: "9123456789",
        address1: "45, Anna Salai",
        address2: "T. Nagar",
        city: "Chennai",
        country: "India",
        state: "Tamil Nadu",
        pincode: "600017",
        company_type: companyTypeIds["Public Limited"],
        sector: sectorIds["Healthcare"],
        cin_number: "L85110TN2010PLC075432",
        registration_number: "TN2010075432",
        gst_no: "33AABCM2443L1ZY",
        is_verified: true,
        login_type: "email",
      },
      {
        company_name: "EduSpark Learning LLP",
        email: "tech57585@gmail.com",
        password: "tech@123",
        phone: "9812345678",
        address1: "78, Sector 18",
        address2: "Noida",
        city: "Noida",
        country: "India",
        state: "Uttar Pradesh",
        pincode: "201301",
        company_type: companyTypeIds["LLP"],
        sector: sectorIds["Education"],
        cin_number: "AAI-1234",
        registration_number: "UP2018001234",
        gst_no: "09AABCE3312L1ZZ",
        is_verified: false,
        login_type: "email",
      },
    ];

    const bcrypt = require("bcryptjs");
    const companyIds = [];
    for (const c of companies) {
      const hashedPassword = await bcrypt.hash(c.password, 10);
      const res = await client.query(
        `INSERT INTO company (company_name, email, password, phone, address1, address2, city, country, state, pincode,
          company_type, sector, cin_number, registration_number, gst_no, is_verified, login_type)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         ON CONFLICT (email) DO UPDATE SET company_name = EXCLUDED.company_name, password = EXCLUDED.password
         RETURNING id`,
        [
          c.company_name, c.email, hashedPassword, c.phone,
          c.address1, c.address2, c.city, c.country, c.state, c.pincode,
          c.company_type, c.sector, c.cin_number, c.registration_number,
          c.gst_no, c.is_verified, c.login_type,
        ]
      );
      companyIds.push(res.rows[0].id);
    }
    console.log("✅ Companies seeded");

    // =====================================
    // LEAVE TYPES
    // =====================================
    for (const companyId of companyIds) {
      companyLeaveTypeIds[companyId] = {};
      for (const lt of defaultLeaveTypes) {
        const res = await client.query(
          `INSERT INTO leave_types (company_id, name, credit_type, carry_forward, total_leave)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [companyId, lt.name, lt.credit_type, lt.carry_forward, lt.total_leave]
        );
        companyLeaveTypeIds[companyId][lt.name] = res.rows[0].id;
      }
    }
    console.log("✅ Leave types seeded");

    // =====================================
    // HOLIDAYS
    // =====================================
    const baseHolidays = [
      { name: "New Year's Day", from_date: "2026-01-01", to_date: "2026-01-01", is_optional: false },
      { name: "Republic Day", from_date: "2026-01-26", to_date: "2026-01-26", is_optional: false },
      { name: "Good Friday", from_date: "2026-04-03", to_date: "2026-04-03", is_optional: false },
      { name: "Independence Day", from_date: "2026-08-15", to_date: "2026-08-15", is_optional: false },
      { name: "Gandhi Jayanti", from_date: "2026-10-02", to_date: "2026-10-02", is_optional: false },
      { name: "Diwali", from_date: "2026-11-08", to_date: "2026-11-08", is_optional: false },
      { name: "Christmas Day", from_date: "2026-12-25", to_date: "2026-12-25", is_optional: false },
    ];

    const companySpecificHolidays = {
      1: [ // Medicare (index 1 in companyIds)
        { name: "Pongal", from_date: "2026-01-14", to_date: "2026-01-14", is_optional: false }
      ],
      2: [ // EduSpark (index 2 in companyIds)
        { name: "Dussehra", from_date: "2026-10-20", to_date: "2026-10-20", is_optional: false }
      ]
    };

    for (let index = 0; index < companyIds.length; index++) {
      const companyId = companyIds[index];
      const holidaysToSeed = [...baseHolidays];
      if (companySpecificHolidays[index]) {
        holidaysToSeed.push(...companySpecificHolidays[index]);
      }

      for (const h of holidaysToSeed) {
        await client.query(
          `INSERT INTO holiday (company_id, name, from_date, to_date, is_optional)
           VALUES ($1, $2, $3, $4, $5)`,
          [companyId, h.name, h.from_date, h.to_date, h.is_optional]
        );
      }
    }
    console.log("✅ Holidays seeded");

    // =====================================
    // EMPLOYMENT TYPE
    // =====================================
    const employmentTypes = [
      "Full-Time",
      "Part-Time",
      "Contract",
      "Internship",
      "Freelance",
      "Temporary",
      "Probation",
    ];

    const employmentTypeIds = {};
    for (const name of employmentTypes) {
      const res = await client.query(
        `INSERT INTO employment_type (employment_type_name) VALUES ($1) ON CONFLICT (employment_type_name) DO UPDATE SET employment_type_name = EXCLUDED.employment_type_name RETURNING id`,
        [name]
      );
      employmentTypeIds[name] = res.rows[0].id;
    }
    console.log("✅ Employment types seeded");

    // =====================================
    // BRANCHES
    // =====================================
    const branchData = [
      // TechNova branches
      { company_id: companyIds[0], name: "TechNova HQ", email: "hq@technova.com", phone: "9876543210", address1: "12, MG Road", city: "Bengaluru", country: "India", state: "Karnataka", pincode: "560001", longitude: "77.5946", latitude: "12.9716" },
      { company_id: companyIds[0], name: "TechNova Mumbai", email: "mumbai@technova.com", phone: "9876543211", address1: "22, BKC", city: "Mumbai", country: "India", state: "Maharashtra", pincode: "400051", longitude: "72.8656", latitude: "19.0760" },
      // MediCare branches
      { company_id: companyIds[1], name: "MediCare Chennai HQ", email: "hq@medicare.com", phone: "9123456789", address1: "45, Anna Salai", city: "Chennai", country: "India", state: "Tamil Nadu", pincode: "600017", longitude: "80.2707", latitude: "13.0827" },
      { company_id: companyIds[1], name: "MediCare Hyderabad", email: "hyd@medicare.com", phone: "9123456780", address1: "10, HITEC City", city: "Hyderabad", country: "India", state: "Telangana", pincode: "500081", longitude: "78.3816", latitude: "17.4435" },
      // EduSpark branch
      { company_id: companyIds[2], name: "EduSpark Noida HQ", email: "hq@eduspark.com", phone: "9812345678", address1: "78, Sector 18", city: "Noida", country: "India", state: "Uttar Pradesh", pincode: "201301", longitude: "77.3910", latitude: "28.5355" },
    ];

    const branchIds = [];
    for (const b of branchData) {
      const res = await client.query(
        `INSERT INTO branch (company_id, name, email, phone, address1, city, country, state, pincode, longitude, latitude)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
        [b.company_id, b.name, b.email, b.phone, b.address1, b.city, b.country, b.state, b.pincode, b.longitude, b.latitude]
      );
      branchIds.push(res.rows[0].id);
    }
    console.log("✅ Branches seeded");

    // =====================================
    // ROLES
    // =====================================
    const roleNames = ["Super Admin", "HR Manager", "Team Lead", "Employee", "Finance Manager", "IT Admin"];
    const roleIds = {};

    for (const companyId of companyIds) {
      roleIds[companyId] = {};
      for (const role of roleNames) {
        const res = await client.query(
          `INSERT INTO roles (company_id, role_name) VALUES ($1, $2) RETURNING id`,
          [companyId, role]
        );
        roleIds[companyId][role] = res.rows[0].id;
      }
    }
    console.log("✅ Roles seeded");

    // =====================================
    // DEPARTMENTS
    // =====================================
    const deptNames = [
      "Human Resources",
      "Engineering",
      "Finance",
      "Marketing",
      "Operations",
      "Sales",
      "Legal",
      "Product",
    ];

    const deptIds = {};
    for (const companyId of companyIds) {
      deptIds[companyId] = {};
      for (const dept of deptNames) {
        const res = await client.query(
          `INSERT INTO departments (company_id, department_name) VALUES ($1, $2) RETURNING id`,
          [companyId, dept]
        );
        deptIds[companyId][dept] = res.rows[0].id;
      }
    }
    console.log("✅ Departments seeded");

    // =====================================
    // DESIGNATIONS
    // =====================================
    const designationTitles = [
      "Software Engineer",
      "Senior Software Engineer",
      "Tech Lead",
      "Engineering Manager",
      "HR Executive",
      "HR Manager",
      "Business Analyst",
      "Product Manager",
      "Finance Analyst",
      "Chief Executive Officer",
      "Chief Technology Officer",
      "Intern",
    ];

    const designationIds = {};
    for (const companyId of companyIds) {
      designationIds[companyId] = {};
      for (const title of designationTitles) {
        const res = await client.query(
          `INSERT INTO designations (company_id, title) VALUES ($1, $2) RETURNING id`,
          [companyId, title]
        );
        designationIds[companyId][title] = res.rows[0].id;
      }
    }
    console.log("✅ Designations seeded");

    // =====================================
    // SHIFT
    // =====================================
    const shiftsData = [];
    for (let index = 0; index < companyIds.length; index++) {
      const companyId = companyIds[index];
      if (index === 0) {
        // TechNova (company index 0)
        shiftsData.push(
          { company_id: companyId, shift_name: "Morning Shift", start_time: "06:00:00", end_time: "14:00:00" },
          { company_id: companyId, shift_name: "Afternoon Shift", start_time: "14:00:00", end_time: "22:00:00" },
          { company_id: companyId, shift_name: "Night Shift", start_time: "22:00:00", end_time: "06:00:00" },
          { company_id: companyId, shift_name: "General Shift", start_time: "09:00:00", end_time: "18:00:00" }
        );
      } else {
        // Other companies
        shiftsData.push(
          { company_id: companyId, shift_name: "Shift A", start_time: "06:00:00", end_time: "14:00:00" },
          { company_id: companyId, shift_name: "Shift B", start_time: "14:00:00", end_time: "22:00:00" },
          { company_id: companyId, shift_name: "Shift C", start_time: "22:00:00", end_time: "06:00:00" },
          { company_id: companyId, shift_name: "General Shift", start_time: "09:00:00", end_time: "18:00:00" }
        );
      }
    }

    const shiftIds = {};
    for (const s of shiftsData) {
      const res = await client.query(
        `INSERT INTO shift (company_id, shift_name, start_time, end_time) VALUES ($1, $2, $3, $4) RETURNING id`,
        [s.company_id, s.shift_name, s.start_time, s.end_time]
      );
      if (!shiftIds[s.company_id]) {
        shiftIds[s.company_id] = [];
      }
      shiftIds[s.company_id].push(res.rows[0].id);
    }
    console.log("✅ Shifts seeded");

    // =====================================
    // BUILDING
    // =====================================
    const buildingData = [
      { building_name: "TechNova Tower A" },
      { building_name: "TechNova Tower B" },
      { building_name: "Medicare Block A" },
      { building_name: "Medicare Block B" },
      { building_name: "EduSpark Campus 1" },
      { building_name: "EduSpark Campus 2" },
    ];

    const buildingIds = [];
    for (const b of buildingData) {
      const res = await client.query(
        `INSERT INTO building (building_name) VALUES ($1) RETURNING id`,
        [b.building_name]
      );
      buildingIds.push(res.rows[0].id);
    }
    console.log("✅ Buildings seeded");

    // =====================================
    // FLOOR
    // =====================================
    const floorData = [
      // TechNova Tower A
      { branch_id: branchIds[0], building_id: buildingIds[0], floor_name: "Floor 1" }, // floorIds[0]
      { branch_id: branchIds[0], building_id: buildingIds[0], floor_name: "Floor 2" }, // floorIds[1]
      // TechNova Tower B
      { branch_id: branchIds[1], building_id: buildingIds[1], floor_name: "Floor 3" }, // floorIds[2]
      { branch_id: branchIds[1], building_id: buildingIds[1], floor_name: "Floor 4" }, // floorIds[3]
      // Medicare Block A
      { branch_id: branchIds[2], building_id: buildingIds[2], floor_name: "Floor 1" }, // floorIds[4]
      { branch_id: branchIds[2], building_id: buildingIds[2], floor_name: "Floor 2" }, // floorIds[5]
      // Medicare Block B
      { branch_id: branchIds[3], building_id: buildingIds[3], floor_name: "Floor 1" }, // floorIds[6]
      { branch_id: branchIds[3], building_id: buildingIds[3], floor_name: "Floor 2" }, // floorIds[7]
      // EduSpark Campus 1
      { branch_id: branchIds[4], building_id: buildingIds[4], floor_name: "Ground Floor" }, // floorIds[8]
      { branch_id: branchIds[4], building_id: buildingIds[4], floor_name: "First Floor" },  // floorIds[9]
      // EduSpark Campus 2
      { branch_id: branchIds[4], building_id: buildingIds[5], floor_name: "Floor 1" }, // floorIds[10]
      { branch_id: branchIds[4], building_id: buildingIds[5], floor_name: "Floor 2" }, // floorIds[11]
    ];

    const floorIds = [];
    for (const f of floorData) {
      const res = await client.query(
        `INSERT INTO floor (branch_id, building_id, floor_name) VALUES ($1, $2, $3) RETURNING id`,
        [f.branch_id, f.building_id, f.floor_name]
      );
      floorIds.push(res.rows[0].id);
    }
    console.log("✅ Floors seeded");

    // =====================================
    // EXTENSION
    // =====================================
    const extensionData = [
      // TechNova Tower A - Floor 1
      { floor_number: floorIds[0], extension_number: "101" }, // extensionIds[0]
      { floor_number: floorIds[0], extension_number: "102" }, // extensionIds[1]
      // TechNova Tower A - Floor 2
      { floor_number: floorIds[1], extension_number: "201" }, // extensionIds[2]
      { floor_number: floorIds[1], extension_number: "202" }, // extensionIds[3]
      // TechNova Tower B - Floor 3
      { floor_number: floorIds[2], extension_number: "301" }, // extensionIds[4]
      { floor_number: floorIds[2], extension_number: "302" }, // extensionIds[5]
      // TechNova Tower B - Floor 4
      { floor_number: floorIds[3], extension_number: "401" }, // extensionIds[6]
      { floor_number: floorIds[3], extension_number: "402" }, // extensionIds[7]

      // Medicare Block A - Floor 1
      { floor_number: floorIds[4], extension_number: "110" }, // extensionIds[8]
      { floor_number: floorIds[4], extension_number: "111" }, // extensionIds[9]
      // Medicare Block A - Floor 2
      { floor_number: floorIds[5], extension_number: "210" }, // extensionIds[10]
      { floor_number: floorIds[5], extension_number: "211" }, // extensionIds[11]
      // Medicare Block B - Floor 1
      { floor_number: floorIds[6], extension_number: "120" }, // extensionIds[12]
      { floor_number: floorIds[6], extension_number: "121" }, // extensionIds[13]
      // Medicare Block B - Floor 2
      { floor_number: floorIds[7], extension_number: "220" }, // extensionIds[14]
      { floor_number: floorIds[7], extension_number: "221" }, // extensionIds[15]

      // EduSpark Campus 1 - Ground Floor
      { floor_number: floorIds[8], extension_number: "10" }, // extensionIds[16]
      { floor_number: floorIds[8], extension_number: "11" }, // extensionIds[17]
      // EduSpark Campus 1 - First Floor
      { floor_number: floorIds[9], extension_number: "20" }, // extensionIds[18]
      { floor_number: floorIds[9], extension_number: "21" }, // extensionIds[19]
      // EduSpark Campus 2 - Floor 1
      { floor_number: floorIds[10], extension_number: "15" }, // extensionIds[20]
      { floor_number: floorIds[10], extension_number: "16" }, // extensionIds[21]
      // EduSpark Campus 2 - Floor 2
      { floor_number: floorIds[11], extension_number: "25" }, // extensionIds[22]
      { floor_number: floorIds[11], extension_number: "26" }, // extensionIds[23]
    ];

    const extensionIds = [];
    for (const e of extensionData) {
      const res = await client.query(
        `INSERT INTO extension (floor_number, extension_number) VALUES ($1, $2) RETURNING id`,
        [e.floor_number, e.extension_number]
      );
      extensionIds.push(res.rows[0].id);
    }
    console.log("✅ Extensions seeded");

    // =====================================
    // SEAT
    // =====================================
    const seatData = [];
    const extSeatsMap = {
      0: ["TNA-01-101-A", "TNA-01-101-B"],
      1: ["TNA-01-102-A", "TNA-01-102-B"],
      2: ["TNA-02-201-A", "TNA-02-201-B"],
      3: ["TNA-02-202-A", "TNA-02-202-B"],
      4: ["TNB-03-301-A", "TNB-03-301-B"],
      5: ["TNB-03-302-A", "TNB-03-302-B"],
      6: ["TNB-04-401-A", "TNB-04-401-B"],
      7: ["TNB-04-402-A", "TNB-04-402-B"],

      8: ["MCA-01-110-01", "MCA-01-110-02"],
      9: ["MCA-01-111-01", "MCA-01-111-02"],
      10: ["MCA-02-210-01", "MCA-02-210-02"],
      11: ["MCA-02-211-01", "MCA-02-211-02"],
      12: ["MCB-01-120-01", "MCB-01-120-02"],
      13: ["MCB-01-121-01", "MCB-01-121-02"],
      14: ["MCB-02-220-01", "MCB-02-220-02"],
      15: ["MCB-02-221-01", "MCB-02-221-02"],

      16: ["ES1-GF-10-X", "ES1-GF-10-Y"],
      17: ["ES1-GF-11-X", "ES1-GF-11-Y"],
      18: ["ES1-1F-20-X", "ES1-1F-20-Y"],
      19: ["ES1-1F-21-X", "ES1-1F-21-Y"],
      20: ["ES2-01-15-X", "ES2-01-15-Y"],
      21: ["ES2-01-16-X", "ES2-01-16-Y"],
      22: ["ES2-02-25-X", "ES2-02-25-Y"],
      23: ["ES2-02-26-X", "ES2-02-26-Y"],
    };

    for (let i = 0; i < extensionIds.length; i++) {
      const extId = extensionIds[i];
      const seatNames = extSeatsMap[i] || [];
      for (const seatNum of seatNames) {
        seatData.push({ extension_id: extId, seat_number: seatNum });
      }
    }

    for (const s of seatData) {
      await client.query(
        `INSERT INTO seat (extension_id, seat_number) VALUES ($1, $2)`,
        [s.extension_id, s.seat_number]
      );
    }
    console.log("✅ Seats seeded");

    // =====================================
    // EMPLOYEES (USERS) & DOCUMENTS
    // =====================================
    const userPassword = await bcrypt.hash("Emp123", 10);

    const employeeData = [
      // =====================================
      // CHIEF EXECUTIVE OFFICERS (CEOS)
      // =====================================
      {
        company_id: companyIds[0],
        branch_id: branchIds[0], // TechNova HQ
        role_id: roleIds[companyIds[0]]["Super Admin"],
        department_id: deptIds[companyIds[0]]["Operations"],
        designation_id: designationIds[companyIds[0]]["Chief Executive Officer"],
        employment_type: employmentTypeIds["Full-Time"],
        first_name: "Ankit",
        middle_name: "",
        last_name: "Kumar",
        email: "ankit.kumar@technova.com",
        work_email: "ankit.kumar.work@technova.com",
        password: userPassword,
        mobile: "9999999901",
        work_phone_number: "0809999901",
        dob: "1980-01-01",
        doj: "2018-01-01",
        present_address1: "CEO Suite, Tower A",
        present_address2: "Sector 1",
        present_city: "Bengaluru",
        present_country: "India",
        present_state: "Karnataka",
        present_pincode: "560001",
        permanent_address1: "CEO Suite, Tower A",
        permanent_address2: "Sector 1",
        permanent_city: "Bengaluru",
        permanent_country: "India",
        permanent_state: "Karnataka",
        permanent_pincode: "560001",
        aadhaar_number: "999999999901",
        voter_id: "VOTERCEOT1",
        pan_number: "CEOPAN0001",
        passport_number: "CEOPASS001",
        uan_number: "CEOUAN0001",
        image: "https://example.com/images/ceo_technova.jpg",
        current_experience: 10.0,
        total_experience: 15.0,
        employment_status: "Active",
        reporting_manager: null,
        gender: "Male",
        marital_status: "Married",
        area_of_expertise: "Corporate Leadership",
        building_name: "TechNova Tower A",
        floor_number: "Floor 1",
        extension: "101",
        seat_number: "TNA-01-101-A",
        doe: null,
        status: "Completed",
        aadhar_card: "https://example.com/docs/ceo_technova_aadhar.pdf",
        voter_card: "https://example.com/docs/ceo_technova_voter.pdf",
        passport: "https://example.com/docs/ceo_technova_passport.pdf",
        pan_card: "https://example.com/docs/ceo_technova_pan.pdf",
        signatures: "https://example.com/docs/ceo_technova_signature.png"
      },
      {
        company_id: companyIds[1],
        branch_id: branchIds[2], // MediCare Chennai HQ
        role_id: roleIds[companyIds[1]]["Super Admin"],
        department_id: deptIds[companyIds[1]]["Operations"],
        designation_id: designationIds[companyIds[1]]["Chief Executive Officer"],
        employment_type: employmentTypeIds["Full-Time"],
        first_name: "Abhisek",
        middle_name: "",
        last_name: "Nayak",
        email: "abhisek.nayak@medicare.com",
        work_email: "abhisek.nayak.work@medicare.com",
        password: userPassword,
        mobile: "9999999902",
        work_phone_number: "0449999902",
        dob: "1980-01-01",
        doj: "2018-01-01",
        present_address1: "CEO Suite, Tower B",
        present_address2: "Sector 1",
        present_city: "Chennai",
        present_country: "India",
        present_state: "Tamil Nadu",
        present_pincode: "600017",
        permanent_address1: "CEO Suite, Tower B",
        permanent_address2: "Sector 1",
        permanent_city: "Chennai",
        permanent_country: "India",
        permanent_state: "Tamil Nadu",
        permanent_pincode: "600017",
        aadhaar_number: "999999999902",
        voter_id: "VOTERCEOM2",
        pan_number: "CEOPAN0002",
        passport_number: "CEOPASS002",
        uan_number: "CEOUAN0002",
        image: "https://example.com/images/ceo_medicare.jpg",
        current_experience: 10.0,
        total_experience: 15.0,
        employment_status: "Active",
        reporting_manager: null,
        gender: "Male",
        marital_status: "Married",
        area_of_expertise: "Corporate Leadership",
        building_name: "Medicare Block A",
        floor_number: "Floor 1",
        extension: "110",
        seat_number: "MCA-01-110-01",
        doe: null,
        status: "Completed",
        aadhar_card: "https://example.com/docs/ceo_medicare_aadhar.pdf",
        voter_card: "https://example.com/docs/ceo_medicare_voter.pdf",
        passport: "https://example.com/docs/ceo_medicare_passport.pdf",
        pan_card: "https://example.com/docs/ceo_medicare_pan.pdf",
        signatures: "https://example.com/docs/ceo_medicare_signature.png"
      },
      {
        company_id: companyIds[2],
        branch_id: branchIds[4], // EduSpark Noida HQ
        role_id: roleIds[companyIds[2]]["Super Admin"],
        department_id: deptIds[companyIds[2]]["Operations"],
        designation_id: designationIds[companyIds[2]]["Chief Executive Officer"],
        employment_type: employmentTypeIds["Full-Time"],
        first_name: "Ayushi",
        middle_name: "",
        last_name: "Sharma",
        email: "ayushi.sharma@eduspark.com",
        work_email: "ayushi.sharma.work@eduspark.com",
        password: userPassword,
        mobile: "9999999903",
        work_phone_number: "0120999903",
        dob: "1980-01-01",
        doj: "2018-01-01",
        present_address1: "CEO Suite, Corporate Wing",
        present_address2: "Sector 1",
        present_city: "Noida",
        present_country: "India",
        present_state: "Uttar Pradesh",
        present_pincode: "201301",
        permanent_address1: "CEO Suite, Corporate Wing",
        permanent_address2: "Sector 1",
        permanent_city: "Noida",
        permanent_country: "India",
        permanent_state: "Uttar Pradesh",
        permanent_pincode: "201301",
        aadhaar_number: "999999999903",
        voter_id: "VOTERCEOE3",
        pan_number: "CEOPAN0003",
        passport_number: "CEOPASS003",
        uan_number: "CEOUAN0003",
        image: "https://example.com/images/ceo_eduspark.jpg",
        current_experience: 10.0,
        total_experience: 15.0,
        employment_status: "Active",
        reporting_manager: null,
        gender: "Female",
        marital_status: "Married",
        area_of_expertise: "Corporate Leadership",
        building_name: "EduSpark Campus 1",
        floor_number: "Ground Floor",
        extension: "10",
        seat_number: "ES1-GF-10-X",
        doe: null,
        status: "Completed",
        aadhar_card: "https://example.com/docs/ceo_eduspark_aadhar.pdf",
        voter_card: "https://example.com/docs/ceo_eduspark_voter.pdf",
        passport: "https://example.com/docs/ceo_eduspark_passport.pdf",
        pan_card: "https://example.com/docs/ceo_eduspark_pan.pdf",
        signatures: "https://example.com/docs/ceo_eduspark_signature.png"
      },
      {
        company_id: companyIds[0],
        branch_id: branchIds[0], // TechNova HQ
        role_id: roleIds[companyIds[0]]["HR Manager"],
        department_id: deptIds[companyIds[0]]["Human Resources"],
        designation_id: designationIds[companyIds[0]]["HR Manager"],
        employment_type: employmentTypeIds["Full-Time"],
        first_name: "Amit",
        middle_name: "Kumar",
        last_name: "Sharma",
        email: "amit.sharma@technova.com",
        work_email: "amit.work@technova.com",
        password: userPassword,
        mobile: "9876543210",
        work_phone_number: "0801234567",
        dob: "1990-05-15",
        doj: "2023-01-10",
        present_address1: "Flat 101, Prestige Heights",
        present_address2: "Outer Ring Road",
        present_city: "Bengaluru",
        present_country: "India",
        present_state: "Karnataka",
        present_pincode: "560103",
        permanent_address1: "12, MG Road",
        permanent_address2: "Indiranagar",
        permanent_city: "Bengaluru",
        permanent_country: "India",
        permanent_state: "Karnataka",
        permanent_pincode: "560001",
        aadhaar_number: "123456789012",
        voter_id: "VOTERAMIT12345",
        pan_number: "ABCDE1234F",
        passport_number: "PASSAMIT12345",
        uan_number: "UANAMIT12345",
        image: "https://example.com/images/amit.jpg",
        current_experience: 2.5,
        total_experience: 5.0,
        employment_status: "Active",
        reporting_manager: null,
        gender: "Male",
        marital_status: "Married",
        area_of_expertise: "Talent Acquisition",
        building_name: "TechNova Tower A",
        floor_number: "Floor 1",
        extension: "101",
        seat_number: "TNA-01-101-B",
        doe: null,
        status: "Completed",
        aadhar_card: "https://example.com/docs/amit_aadhar.pdf",
        voter_card: "https://example.com/docs/amit_voter.pdf",
        passport: "https://example.com/docs/amit_passport.pdf",
        pan_card: "https://example.com/docs/amit_pan.pdf",
        signatures: "https://example.com/docs/amit_signature.png"
      },
      {
        company_id: companyIds[0],
        branch_id: branchIds[0], // TechNova HQ
        role_id: roleIds[companyIds[0]]["Employee"],
        department_id: deptIds[companyIds[0]]["Engineering"],
        designation_id: designationIds[companyIds[0]]["Software Engineer"],
        employment_type: employmentTypeIds["Full-Time"],
        first_name: "Priya",
        middle_name: "Kumari",
        last_name: "Patel",
        email: "priya.patel@technova.com",
        work_email: "priya.work@technova.com",
        password: userPassword,
        mobile: "9876543211",
        work_phone_number: "0801234568",
        dob: "1995-08-22",
        doj: "2024-03-01",
        present_address1: "Flat 202, Salarpuria residency",
        present_address2: "Koramangala",
        present_city: "Bengaluru",
        present_country: "India",
        present_state: "Karnataka",
        present_pincode: "560034",
        permanent_address1: "45, BKC Block G",
        permanent_address2: "Bandra East",
        permanent_city: "Mumbai",
        permanent_country: "India",
        permanent_state: "Maharashtra",
        permanent_pincode: "400051",
        aadhaar_number: "234567890123",
        voter_id: "VOTERPRIYA12345",
        pan_number: "BCDEF2345G",
        passport_number: "PASSPRIYA12345",
        uan_number: "UANPRIYA12345",
        image: "https://example.com/images/priya.jpg",
        current_experience: 1.2,
        total_experience: 3.5,
        employment_status: "Active",
        reporting_manager: "Amit",
        gender: "Female",
        marital_status: "Single",
        area_of_expertise: "NodeJS Backend Developer",
        building_name: "TechNova Tower A",
        floor_number: "Floor 1",
        extension: "102",
        seat_number: "TNA-01-102-A",
        doe: null,
        status: "Completed",
        aadhar_card: "https://example.com/docs/priya_aadhar.pdf",
        voter_card: "https://example.com/docs/priya_voter.pdf",
        passport: "https://example.com/docs/priya_passport.pdf",
        pan_card: "https://example.com/docs/priya_pan.pdf",
        signatures: "https://example.com/docs/priya_signature.png"
      },
      {
        company_id: companyIds[1],
        branch_id: branchIds[2], // MediCare Chennai HQ
        role_id: roleIds[companyIds[1]]["Super Admin"],
        department_id: deptIds[companyIds[1]]["Operations"],
        designation_id: designationIds[companyIds[1]]["Chief Technology Officer"],
        employment_type: employmentTypeIds["Full-Time"],
        first_name: "Rohan",
        middle_name: "Nath",
        last_name: "Verma",
        email: "rohan.verma@medicare.com",
        work_email: "rohan.work@medicare.com",
        password: userPassword,
        mobile: "9123456789",
        work_phone_number: "0441234567",
        dob: "1988-12-05",
        doj: "2020-07-15",
        present_address1: "Apt 5B, Anna Nagar Towers",
        present_address2: "Anna Nagar",
        present_city: "Chennai",
        present_country: "India",
        present_state: "Tamil Nadu",
        present_pincode: "600040",
        permanent_address1: "45, Anna Salai",
        permanent_address2: "T. Nagar",
        permanent_city: "Chennai",
        permanent_country: "India",
        permanent_state: "Tamil Nadu",
        permanent_pincode: "600017",
        aadhaar_number: "345678901234",
        voter_id: "VOTERROHAN12345",
        pan_number: "CDEFG3456H",
        passport_number: "PASSROHAN12345",
        uan_number: "UANROHAN12345",
        image: "https://example.com/images/rohan.jpg",
        current_experience: 5.5,
        total_experience: 12.0,
        employment_status: "Active",
        reporting_manager: null,
        gender: "Male",
        marital_status: "Married",
        area_of_expertise: "HealthTech Systems",
        building_name: "Medicare Block A",
        floor_number: "Floor 1",
        extension: "110",
        seat_number: "MCA-01-110-02",
        doe: null,
        status: "Completed",
        aadhar_card: "https://example.com/docs/rohan_aadhar.pdf",
        voter_card: "https://example.com/docs/rohan_voter.pdf",
        passport: "https://example.com/docs/rohan_passport.pdf",
        pan_card: "https://example.com/docs/rohan_pan.pdf",
        signatures: "https://example.com/docs/rohan_signature.png"
      },
      {
        company_id: companyIds[1],
        branch_id: branchIds[2], // MediCare Chennai HQ
        role_id: roleIds[companyIds[1]]["HR Manager"],
        department_id: deptIds[companyIds[1]]["Human Resources"],
        designation_id: designationIds[companyIds[1]]["HR Manager"],
        employment_type: employmentTypeIds["Full-Time"],
        first_name: "Sanjay",
        middle_name: "Kumar",
        last_name: "Gupta",
        email: "sanjay.gupta@medicare.com",
        work_email: "sanjay.work@medicare.com",
        password: userPassword,
        mobile: "9123456781",
        work_phone_number: "0441234568",
        dob: "1985-04-10",
        doj: "2021-02-18",
        present_address1: "Flat 4A, Green Meadows",
        present_address2: "Velachery",
        present_city: "Chennai",
        present_country: "India",
        present_state: "Tamil Nadu",
        present_pincode: "600042",
        permanent_address1: "12, Station Road",
        permanent_address2: "Adyar",
        permanent_city: "Chennai",
        permanent_country: "India",
        permanent_state: "Tamil Nadu",
        permanent_pincode: "600020",
        aadhaar_number: "345678901235",
        voter_id: "VOTERSANJAY12345",
        pan_number: "CDEFG3456I",
        passport_number: "PASSSANJAY12345",
        uan_number: "UANSANJAY12345",
        image: "https://example.com/images/sanjay.jpg",
        current_experience: 4.5,
        total_experience: 8.5,
        employment_status: "Active",
        reporting_manager: null,
        gender: "Male",
        marital_status: "Married",
        area_of_expertise: "HR Operations",
        building_name: "Medicare Block A",
        floor_number: "Floor 1",
        extension: "111",
        seat_number: "MCA-01-111-01",
        doe: null,
        status: "Completed",
        aadhar_card: "https://example.com/docs/sanjay_aadhar.pdf",
        voter_card: "https://example.com/docs/sanjay_voter.pdf",
        passport: "https://example.com/docs/sanjay_passport.pdf",
        pan_card: "https://example.com/docs/sanjay_pan.pdf",
        signatures: "https://example.com/docs/sanjay_signature.png"
      },
      {
        company_id: companyIds[1],
        branch_id: branchIds[3], // MediCare Hyderabad
        role_id: roleIds[companyIds[1]]["Employee"],
        department_id: deptIds[companyIds[1]]["Engineering"],
        designation_id: designationIds[companyIds[1]]["Software Engineer"],
        employment_type: employmentTypeIds["Full-Time"],
        first_name: "Anjali",
        middle_name: "S",
        last_name: "Rao",
        email: "anjali.rao@medicare.com",
        work_email: "anjali.work@medicare.com",
        password: userPassword,
        mobile: "9123456782",
        work_phone_number: "0401234567",
        dob: "1994-06-18",
        doj: "2023-09-01",
        present_address1: "Flat 503, Gachibowli Heights",
        present_address2: "Gachibowli",
        present_city: "Hyderabad",
        present_country: "India",
        present_state: "Telangana",
        present_pincode: "500032",
        permanent_address1: "78, HITEC Block B",
        permanent_address2: "Madhapur",
        permanent_city: "Hyderabad",
        permanent_country: "India",
        permanent_state: "Telangana",
        permanent_pincode: "500081",
        aadhaar_number: "345678901236",
        voter_id: "VOTERANJALI12345",
        pan_number: "CDEFG3456J",
        passport_number: "PASSANJALI12345",
        uan_number: "UANANJALI12345",
        image: "https://example.com/images/anjali.jpg",
        current_experience: 2.2,
        total_experience: 4.5,
        employment_status: "Active",
        reporting_manager: "Rohan",
        gender: "Female",
        marital_status: "Single",
        area_of_expertise: "Web Development",
        building_name: "Medicare Block B",
        floor_number: "Floor 1",
        extension: "120",
        seat_number: "MCB-01-120-01",
        doe: null,
        status: "Completed",
        aadhar_card: "https://example.com/docs/anjali_aadhar.pdf",
        voter_card: "https://example.com/docs/anjali_voter.pdf",
        passport: "https://example.com/docs/anjali_passport.pdf",
        pan_card: "https://example.com/docs/anjali_pan.pdf",
        signatures: "https://example.com/docs/anjali_signature.png"
      },
      {
        company_id: companyIds[2],
        branch_id: branchIds[4], // EduSpark Noida HQ
        role_id: roleIds[companyIds[2]]["Super Admin"],
        department_id: deptIds[companyIds[2]]["Operations"],
        designation_id: designationIds[companyIds[2]]["Chief Technology Officer"],
        employment_type: employmentTypeIds["Full-Time"],
        first_name: "Vikram",
        middle_name: "Pratap",
        last_name: "Singh",
        email: "vikram.singh@eduspark.com",
        work_email: "vikram.work@eduspark.com",
        password: userPassword,
        mobile: "9812345671",
        work_phone_number: "0120123456",
        dob: "1985-11-20",
        doj: "2019-03-15",
        present_address1: "Villa 14, Lotus Boulevard",
        present_address2: "Sector 100",
        present_city: "Noida",
        present_country: "India",
        present_state: "Uttar Pradesh",
        present_pincode: "201303",
        permanent_address1: "78, Sector 18",
        permanent_address2: "Noida",
        permanent_city: "Noida",
        permanent_country: "India",
        permanent_state: "Uttar Pradesh",
        permanent_pincode: "201301",
        aadhaar_number: "456789012345",
        voter_id: "VOTERVIKRAM12345",
        pan_number: "DEFGH4567I",
        passport_number: "PASSVIKRAM12345",
        uan_number: "UANVIKRAM12345",
        image: "https://example.com/images/vikram.jpg",
        current_experience: 7.2,
        total_experience: 15.0,
        employment_status: "Active",
        reporting_manager: null,
        gender: "Male",
        marital_status: "Married",
        area_of_expertise: "EdTech Operations",
        building_name: "EduSpark Campus 1",
        floor_number: "Ground Floor",
        extension: "10",
        seat_number: "ES1-GF-10-Y",
        doe: null,
        status: "Completed",
        aadhar_card: "https://example.com/docs/vikram_aadhar.pdf",
        voter_card: "https://example.com/docs/vikram_voter.pdf",
        passport: "https://example.com/docs/vikram_passport.pdf",
        pan_card: "https://example.com/docs/vikram_pan.pdf",
        signatures: "https://example.com/docs/vikram_signature.png"
      },
      {
        company_id: companyIds[2],
        branch_id: branchIds[4], // EduSpark Noida HQ
        role_id: roleIds[companyIds[2]]["HR Manager"],
        department_id: deptIds[companyIds[2]]["Human Resources"],
        designation_id: designationIds[companyIds[2]]["HR Manager"],
        employment_type: employmentTypeIds["Full-Time"],
        first_name: "Neha",
        middle_name: "Kumari",
        last_name: "Kapoor",
        email: "neha.kapoor@eduspark.com",
        work_email: "neha.work@eduspark.com",
        password: userPassword,
        mobile: "9812345672",
        work_phone_number: "0120123457",
        dob: "1992-09-05",
        doj: "2021-08-01",
        present_address1: "Flat 401, Supertech Pavilion",
        present_address2: "Sector 96",
        present_city: "Noida",
        present_country: "India",
        present_state: "Uttar Pradesh",
        present_pincode: "201304",
        permanent_address1: "Flat 401, Supertech Pavilion",
        permanent_address2: "Sector 96",
        permanent_city: "Noida",
        permanent_country: "India",
        permanent_state: "Uttar Pradesh",
        permanent_pincode: "201304",
        aadhaar_number: "456789012346",
        voter_id: "VOTERNEHA12345",
        pan_number: "DEFGH4567J",
        passport_number: "PASSNEHA12345",
        uan_number: "UANNEHA12345",
        image: "https://example.com/images/neha.jpg",
        current_experience: 3.5,
        total_experience: 7.0,
        employment_status: "Active",
        reporting_manager: null,
        gender: "Female",
        marital_status: "Single",
        area_of_expertise: "Employee Relations",
        building_name: "EduSpark Campus 1",
        floor_number: "Ground Floor",
        extension: "11",
        seat_number: "ES1-GF-11-X",
        doe: null,
        status: "Completed",
        aadhar_card: "https://example.com/docs/neha_aadhar.pdf",
        voter_card: "https://example.com/docs/neha_voter.pdf",
        passport: "https://example.com/docs/neha_passport.pdf",
        pan_card: "https://example.com/docs/neha_pan.pdf",
        signatures: "https://example.com/docs/neha_signature.png"
      },
      {
        company_id: companyIds[2],
        branch_id: branchIds[4], // EduSpark Noida HQ
        role_id: roleIds[companyIds[2]]["Employee"],
        department_id: deptIds[companyIds[2]]["Engineering"],
        designation_id: designationIds[companyIds[2]]["Software Engineer"],
        employment_type: employmentTypeIds["Full-Time"],
        first_name: "Rahul",
        middle_name: "Prasad",
        last_name: "Joshi",
        email: "rahul.joshi@eduspark.com",
        work_email: "rahul.joshi.work@eduspark.com",
        password: userPassword,
        mobile: "9812345673",
        work_phone_number: "0120123458",
        dob: "1997-02-14",
        doj: "2024-01-15",
        present_address1: "Flat 12A, Amrapali Zodiac",
        present_address2: "Sector 120",
        present_city: "Noida",
        present_country: "India",
        present_state: "Uttar Pradesh",
        present_pincode: "201309",
        permanent_address1: "Flat 12A, Amrapali Zodiac",
        permanent_address2: "Sector 120",
        permanent_city: "Noida",
        permanent_country: "India",
        permanent_state: "Uttar Pradesh",
        permanent_pincode: "201309",
        aadhaar_number: "456789012347",
        voter_id: "VOTERRAHUL12345",
        pan_number: "DEFGH4567K",
        passport_number: "PASSRAHUL12345",
        uan_number: "UANRAHUL12345",
        image: "https://example.com/images/rahul.jpg",
        current_experience: 1.0,
        total_experience: 2.0,
        employment_status: "Active",
        reporting_manager: "Vikram",
        gender: "Male",
        marital_status: "Single",
        area_of_expertise: "Frontend Developer",
        building_name: "EduSpark Campus 1",
        floor_number: "Ground Floor",
        extension: "11",
        seat_number: "ES1-GF-11-Y",
        doe: null,
        status: "Completed",
        pan_card: "https://example.com/docs/rahul_pan.pdf",
        signatures: "https://example.com/docs/rahul_signature.png"
      },
      // =====================================
      // TECHNOVA SOLUTIONS PVT LTD (ADDITIONAL EMPLOYEES)
      // =====================================
      {
        company_id: companyIds[0],
        branch_id: branchIds[0],
        role_id: roleIds[companyIds[0]]["Employee"],
        department_id: deptIds[companyIds[0]]["Engineering"],
        designation_id: designationIds[companyIds[0]]["Senior Software Engineer"],
        employment_type: employmentTypeIds["Full-Time"],
        first_name: "Ramesh",
        middle_name: "Kumar",
        last_name: "Dev",
        email: "ramesh.dev@technova.com",
        work_email: "ramesh.work@technova.com",
        password: userPassword,
        mobile: "9876543212",
        work_phone_number: "0801234569",
        dob: "1992-06-12",
        doj: "2023-05-15",
        present_address1: "Flat 303, Prestige Heights",
        present_address2: "Outer Ring Road",
        present_city: "Bengaluru",
        present_country: "India",
        present_state: "Karnataka",
        present_pincode: "560103",
        permanent_address1: "14, MG Road",
        permanent_address2: "Indiranagar",
        permanent_city: "Bengaluru",
        permanent_country: "India",
        permanent_state: "Karnataka",
        permanent_pincode: "560001",
        aadhaar_number: "123456789013",
        voter_id: "VOTERRAMESH123",
        pan_number: "ABCDE1234G",
        passport_number: "PASSRAMESH123",
        uan_number: "UANRAMESH1234",
        image: "https://example.com/images/ramesh.jpg",
        current_experience: 3.0,
        total_experience: 6.0,
        employment_status: "Active",
        reporting_manager: "Amit",
        gender: "Male",
        marital_status: "Single",
        area_of_expertise: "Java Backend Developer",
        building_name: "TechNova Tower A",
        floor_number: "Floor 2",
        extension: "201",
        seat_number: "TNA-02-201-A",
        doe: null,
        status: "Completed",
        aadhar_card: "https://example.com/docs/ramesh_aadhar.pdf",
        voter_card: "https://example.com/docs/ramesh_voter.pdf",
        passport: "https://example.com/docs/ramesh_passport.pdf",
        pan_card: "https://example.com/docs/ramesh_pan.pdf",
        signatures: "https://example.com/docs/ramesh_signature.png"
      },
      {
        company_id: companyIds[0],
        branch_id: branchIds[0],
        role_id: roleIds[companyIds[0]]["Employee"],
        department_id: deptIds[companyIds[0]]["Marketing"],
        designation_id: designationIds[companyIds[0]]["Business Analyst"],
        employment_type: employmentTypeIds["Full-Time"],
        first_name: "Sunita",
        middle_name: "",
        last_name: "Rao",
        email: "sunita.rao@technova.com",
        work_email: "sunita.work@technova.com",
        password: userPassword,
        mobile: "9876543213",
        work_phone_number: "0801234570",
        dob: "1994-03-10",
        doj: "2024-01-20",
        present_address1: "Flat 404, Green Glen Layout",
        present_address2: "Bellandur",
        present_city: "Bengaluru",
        present_country: "India",
        present_state: "Karnataka",
        present_pincode: "560103",
        permanent_address1: "15, West Coast Rd",
        permanent_address2: "Udupi",
        permanent_city: "Udupi",
        permanent_country: "India",
        permanent_state: "Karnataka",
        permanent_pincode: "576101",
        aadhaar_number: "123456789014",
        voter_id: "VOTERSUNITA123",
        pan_number: "ABCDE1234H",
        passport_number: "PASSSUNITA123",
        uan_number: "UANSUNITA1234",
        image: "https://example.com/images/sunita.jpg",
        current_experience: 1.5,
        total_experience: 4.0,
        employment_status: "Active",
        reporting_manager: "Amit",
        gender: "Female",
        marital_status: "Single",
        area_of_expertise: "Market Research",
        building_name: "TechNova Tower A",
        floor_number: "Floor 2",
        extension: "201",
        seat_number: "TNA-02-201-B",
        doe: null,
        status: "Completed",
        aadhar_card: "https://example.com/docs/sunita_aadhar.pdf",
        voter_card: "https://example.com/docs/sunita_voter.pdf",
        passport: "https://example.com/docs/sunita_passport.pdf",
        pan_card: "https://example.com/docs/sunita_pan.pdf",
        signatures: "https://example.com/docs/sunita_signature.png"
      },
      {
        company_id: companyIds[0],
        branch_id: branchIds[1],
        role_id: roleIds[companyIds[0]]["Team Lead"],
        department_id: deptIds[companyIds[0]]["Engineering"],
        designation_id: designationIds[companyIds[0]]["Tech Lead"],
        employment_type: employmentTypeIds["Full-Time"],
        first_name: "Vijay",
        middle_name: "Kumar",
        last_name: "Nair",
        email: "vijay.nair@technova.com",
        work_email: "vijay.work@technova.com",
        password: userPassword,
        mobile: "9876543214",
        work_phone_number: "0221234567",
        dob: "1988-09-15",
        doj: "2022-11-01",
        present_address1: "Flat 505, Palm Beach Residency",
        present_address2: "Vashi",
        present_city: "Mumbai",
        present_country: "India",
        present_state: "Maharashtra",
        present_pincode: "400703",
        permanent_address1: "22, BKC",
        permanent_address2: "Bandra East",
        permanent_city: "Mumbai",
        permanent_country: "India",
        permanent_state: "Maharashtra",
        permanent_pincode: "400051",
        aadhaar_number: "123456789015",
        voter_id: "VOTERVIJAY123",
        pan_number: "ABCDE1234I",
        passport_number: "PASSVIJAY123",
        uan_number: "UANVIJAY1234",
        image: "https://example.com/images/vijay.jpg",
        current_experience: 4.0,
        total_experience: 9.0,
        employment_status: "Active",
        reporting_manager: null,
        gender: "Male",
        marital_status: "Married",
        area_of_expertise: "System Architecture",
        building_name: "TechNova Tower B",
        floor_number: "Floor 3",
        extension: "301",
        seat_number: "TNB-03-301-A",
        doe: null,
        status: "Completed",
        aadhar_card: "https://example.com/docs/vijay_aadhar.pdf",
        voter_card: "https://example.com/docs/vijay_voter.pdf",
        passport: "https://example.com/docs/vijay_passport.pdf",
        pan_card: "https://example.com/docs/vijay_pan.pdf",
        signatures: "https://example.com/docs/vijay_signature.png"
      },
      // =====================================
      // MEDICARE HEALTH SERVICES (ADDITIONAL EMPLOYEES)
      // =====================================
      {
        company_id: companyIds[1],
        branch_id: branchIds[2],
        role_id: roleIds[companyIds[1]]["Employee"],
        department_id: deptIds[companyIds[1]]["Operations"],
        designation_id: designationIds[companyIds[1]]["Senior Software Engineer"],
        employment_type: employmentTypeIds["Full-Time"],
        first_name: "Deepa",
        middle_name: "",
        last_name: "Krishnan",
        email: "deepa.krishnan@medicare.com",
        work_email: "deepa.work@medicare.com",
        password: userPassword,
        mobile: "9123456783",
        work_phone_number: "0441234571",
        dob: "1991-07-25",
        doj: "2022-04-10",
        present_address1: "Flat 102, Shanti Vihar",
        present_address2: "Adyar",
        present_city: "Chennai",
        present_country: "India",
        present_state: "Tamil Nadu",
        present_pincode: "600020",
        permanent_address1: "15, Temple Rd",
        permanent_address2: "Madurai",
        permanent_city: "Madurai",
        permanent_country: "India",
        permanent_state: "Tamil Nadu",
        permanent_pincode: "625001",
        aadhaar_number: "345678901237",
        voter_id: "VOTERDEEPA123",
        pan_number: "CDEFG3456K",
        passport_number: "PASSDEEPA123",
        uan_number: "UANDEEPA1234",
        image: "https://example.com/images/deepa.jpg",
        current_experience: 2.5,
        total_experience: 5.5,
        employment_status: "Active",
        reporting_manager: "Rohan",
        gender: "Female",
        marital_status: "Married",
        area_of_expertise: "Java Development",
        building_name: "Medicare Block A",
        floor_number: "Floor 2",
        extension: "210",
        seat_number: "MCA-02-210-01",
        doe: null,
        status: "Completed",
        aadhar_card: "https://example.com/docs/deepa_aadhar.pdf",
        voter_card: "https://example.com/docs/deepa_voter.pdf",
        passport: "https://example.com/docs/deepa_passport.pdf",
        pan_card: "https://example.com/docs/deepa_pan.pdf",
        signatures: "https://example.com/docs/deepa_signature.png"
      },
      {
        company_id: companyIds[1],
        branch_id: branchIds[3],
        role_id: roleIds[companyIds[1]]["Employee"],
        department_id: deptIds[companyIds[1]]["Engineering"],
        designation_id: designationIds[companyIds[1]]["Software Engineer"],
        employment_type: employmentTypeIds["Full-Time"],
        first_name: "Rajesh",
        middle_name: "Kumar",
        last_name: "Mehta",
        email: "rajesh.mehta@medicare.com",
        work_email: "rajesh.work@medicare.com",
        password: userPassword,
        mobile: "9123456784",
        work_phone_number: "0401234572",
        dob: "1993-10-18",
        doj: "2023-08-01",
        present_address1: "Flat 204, Gachibowli Vista",
        present_address2: "Gachibowli",
        present_city: "Hyderabad",
        present_country: "India",
        present_state: "Telangana",
        present_pincode: "500032",
        permanent_address1: "Flat 204, Gachibowli Vista",
        permanent_address2: "Gachibowli",
        permanent_city: "Hyderabad",
        permanent_country: "India",
        permanent_state: "Telangana",
        permanent_pincode: "500032",
        aadhaar_number: "345678901238",
        voter_id: "VOTERRAJESH123",
        pan_number: "CDEFG3456L",
        passport_number: "PASSRAJESH123",
        uan_number: "UANRAJESH1234",
        image: "https://example.com/images/rajesh.jpg",
        current_experience: 1.8,
        total_experience: 3.8,
        employment_status: "Active",
        reporting_manager: "Rohan",
        gender: "Male",
        marital_status: "Single",
        area_of_expertise: "Database Administration",
        building_name: "Medicare Block B",
        floor_number: "Floor 1",
        extension: "120",
        seat_number: "MCB-01-120-02",
        doe: null,
        status: "Completed",
        aadhar_card: "https://example.com/docs/rajesh_aadhar.pdf",
        voter_card: "https://example.com/docs/rajesh_voter.pdf",
        passport: "https://example.com/docs/rajesh_passport.pdf",
        pan_card: "https://example.com/docs/rajesh_pan.pdf",
        signatures: "https://example.com/docs/rajesh_signature.png"
      },
      {
        company_id: companyIds[1],
        branch_id: branchIds[3],
        role_id: roleIds[companyIds[1]]["Team Lead"],
        department_id: deptIds[companyIds[1]]["Engineering"],
        designation_id: designationIds[companyIds[1]]["Tech Lead"],
        employment_type: employmentTypeIds["Full-Time"],
        first_name: "Kiran",
        middle_name: "",
        last_name: "Das",
        email: "kiran.das@medicare.com",
        work_email: "kiran.work@medicare.com",
        password: userPassword,
        mobile: "9123456785",
        work_phone_number: "0401234573",
        dob: "1989-11-30",
        doj: "2021-06-15",
        present_address1: "Flat 305, Madhapur Heights",
        present_address2: "Madhapur",
        present_city: "Hyderabad",
        present_country: "India",
        present_state: "Telangana",
        present_pincode: "500081",
        permanent_address1: "Flat 305, Madhapur Heights",
        permanent_address2: "Madhapur",
        permanent_city: "Hyderabad",
        permanent_country: "India",
        permanent_state: "Telangana",
        permanent_pincode: "500081",
        aadhaar_number: "345678901239",
        voter_id: "VOTERKIRAN123",
        pan_number: "CDEFG3456M",
        passport_number: "PASSKIRAN123",
        uan_number: "UANKIRAN1234",
        image: "https://example.com/images/kiran.jpg",
        current_experience: 3.5,
        total_experience: 8.0,
        employment_status: "Active",
        reporting_manager: "Rohan",
        gender: "Male",
        marital_status: "Married",
        area_of_expertise: "React Frontend",
        building_name: "Medicare Block B",
        floor_number: "Floor 2",
        extension: "220",
        seat_number: "MCB-02-220-01",
        doe: null,
        status: "Completed",
        aadhar_card: "https://example.com/docs/kiran_aadhar.pdf",
        voter_card: "https://example.com/docs/kiran_voter.pdf",
        passport: "https://example.com/docs/kiran_passport.pdf",
        pan_card: "https://example.com/docs/kiran_pan.pdf",
        signatures: "https://example.com/docs/kiran_signature.png"
      },
      // =====================================
      // EDUSPARK LEARNING LLP (ADDITIONAL EMPLOYEES)
      // =====================================
      {
        company_id: companyIds[2],
        branch_id: branchIds[4],
        role_id: roleIds[companyIds[2]]["Employee"],
        department_id: deptIds[companyIds[2]]["Finance"],
        designation_id: designationIds[companyIds[2]]["Finance Analyst"],
        employment_type: employmentTypeIds["Full-Time"],
        first_name: "Manish",
        middle_name: "Kumar",
        last_name: "Gupta",
        email: "manish.gupta@eduspark.com",
        work_email: "manish.work@eduspark.com",
        password: userPassword,
        mobile: "9812345674",
        work_phone_number: "0120123459",
        dob: "1994-02-14",
        doj: "2023-01-10",
        present_address1: "Flat 12B, Amrapali Zodiac",
        present_address2: "Sector 120",
        present_city: "Noida",
        present_country: "India",
        present_state: "Uttar Pradesh",
        present_pincode: "201309",
        permanent_address1: "Flat 12B, Amrapali Zodiac",
        permanent_address2: "Sector 120",
        permanent_city: "Noida",
        permanent_country: "India",
        permanent_state: "Uttar Pradesh",
        permanent_pincode: "201309",
        aadhaar_number: "456789012348",
        voter_id: "VOTERMANISH123",
        pan_number: "DEFGH4567L",
        passport_number: "PASSMANISH123",
        uan_number: "UANMANISH1234",
        image: "https://example.com/images/manish.jpg",
        current_experience: 2.0,
        total_experience: 4.5,
        employment_status: "Active",
        reporting_manager: "Vikram",
        gender: "Male",
        marital_status: "Single",
        area_of_expertise: "Corporate Finance",
        building_name: "EduSpark Campus 1",
        floor_number: "First Floor",
        extension: "20",
        seat_number: "ES1-1F-20-X",
        doe: null,
        status: "Completed",
        aadhar_card: "https://example.com/docs/manish_aadhar.pdf",
        voter_card: "https://example.com/docs/manish_voter.pdf",
        passport: "https://example.com/docs/manish_passport.pdf",
        pan_card: "https://example.com/docs/manish_pan.pdf",
        signatures: "https://example.com/docs/manish_signature.png"
      },
      {
        company_id: companyIds[2],
        branch_id: branchIds[4],
        role_id: roleIds[companyIds[2]]["Employee"],
        department_id: deptIds[companyIds[2]]["Marketing"],
        designation_id: designationIds[companyIds[2]]["Business Analyst"],
        employment_type: employmentTypeIds["Full-Time"],
        first_name: "Pooja",
        middle_name: "",
        last_name: "Sen",
        email: "pooja.sen@eduspark.com",
        work_email: "pooja.work@eduspark.com",
        password: userPassword,
        mobile: "9812345675",
        work_phone_number: "0120123460",
        dob: "1995-12-05",
        doj: "2023-09-01",
        present_address1: "Flat 202, Supertech Pavillion",
        present_address2: "Sector 96",
        present_city: "Noida",
        present_country: "India",
        present_state: "Uttar Pradesh",
        present_pincode: "201304",
        permanent_address1: "Flat 202, Supertech Pavillion",
        permanent_address2: "Sector 96",
        permanent_city: "Noida",
        permanent_country: "India",
        permanent_state: "Uttar Pradesh",
        permanent_pincode: "201304",
        aadhaar_number: "456789012349",
        voter_id: "VOTERPOOJA123",
        pan_number: "DEFGH4567M",
        passport_number: "PASSPOOJA123",
        uan_number: "UANPOOJA1234",
        image: "https://example.com/images/pooja.jpg",
        current_experience: 1.5,
        total_experience: 3.5,
        employment_status: "Active",
        reporting_manager: "Vikram",
        gender: "Female",
        marital_status: "Single",
        area_of_expertise: "Digital Marketing",
        building_name: "EduSpark Campus 1",
        floor_number: "First Floor",
        extension: "20",
        seat_number: "ES1-1F-20-Y",
        doe: null,
        status: "Completed",
        aadhar_card: "https://example.com/docs/pooja_aadhar.pdf",
        voter_card: "https://example.com/docs/pooja_voter.pdf",
        passport: "https://example.com/docs/pooja_passport.pdf",
        pan_card: "https://example.com/docs/pooja_pan.pdf",
        signatures: "https://example.com/docs/pooja_signature.png"
      },
      {
        company_id: companyIds[2],
        branch_id: branchIds[4],
        role_id: roleIds[companyIds[2]]["Team Lead"],
        department_id: deptIds[companyIds[2]]["Engineering"],
        designation_id: designationIds[companyIds[2]]["Tech Lead"],
        employment_type: employmentTypeIds["Full-Time"],
        first_name: "Suresh",
        middle_name: "",
        last_name: "Reddy",
        email: "suresh.reddy@eduspark.com",
        work_email: "suresh.work@eduspark.com",
        password: userPassword,
        mobile: "9812345676",
        work_phone_number: "0120123461",
        dob: "1990-05-18",
        doj: "2021-08-01",
        present_address1: "Villa 16, Lotus Boulevard",
        present_address2: "Sector 100",
        present_city: "Noida",
        present_country: "India",
        present_state: "Uttar Pradesh",
        present_pincode: "201303",
        permanent_address1: "Villa 16, Lotus Boulevard",
        permanent_address2: "Sector 100",
        permanent_city: "Noida",
        permanent_country: "India",
        permanent_state: "Uttar Pradesh",
        permanent_pincode: "201303",
        aadhaar_number: "456789012350",
        voter_id: "VOTERSURESH123",
        pan_number: "DEFGH4567N",
        passport_number: "PASSSURESH123",
        uan_number: "UANSURESH1234",
        image: "https://example.com/images/suresh.jpg",
        current_experience: 4.5,
        total_experience: 9.0,
        employment_status: "Active",
        reporting_manager: null,
        gender: "Male",
        marital_status: "Married",
        area_of_expertise: "Tech Architecture",
        building_name: "EduSpark Campus 2",
        floor_number: "Floor 1",
        extension: "15",
        seat_number: "ES2-01-15-X",
        doe: null,
        status: "Completed",
        aadhar_card: "https://example.com/docs/suresh_aadhar.pdf",
        voter_card: "https://example.com/docs/suresh_voter.pdf",
        passport: "https://example.com/docs/suresh_passport.pdf",
        pan_card: "https://example.com/docs/suresh_pan.pdf",
        signatures: "https://example.com/docs/suresh_signature.png"
      }
    ];

    const insertedEmployeeIds = {};
    const companyEmployeeCounters = {};

    for (const emp of employeeData) {
      // Check if user already exists
      const existRes = await client.query("SELECT id FROM users WHERE email = $1", [emp.email]);
      if (existRes.rows.length > 0) {
        console.log(`Employee ${emp.email} already exists, skipping.`);
        insertedEmployeeIds[emp.first_name] = existRes.rows[0].id;
        continue;
      }

      // Generate offer letter automatically
      const offerLetter = await generateOfferLetter(client, {
        first_name: emp.first_name,
        middle_name: emp.middle_name,
        last_name: emp.last_name,
        email: emp.email,
        mobile: emp.mobile,
        doj: emp.doj,
        company_id: emp.company_id,
        branch_id: emp.branch_id,
        role_id: emp.role_id,
        employment_type: emp.employment_type,
        department_id: emp.department_id,
        designation_id: emp.designation_id,
        signature: emp.signature
      });

      // 1. Insert documents first
      const docRes = await client.query(
        `INSERT INTO documents (aadhar_card, voter_card, passport, pancard, offer_letter, signatures) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [emp.aadhar_card, emp.voter_card, emp.passport, emp.pan_card || emp.pancard, offerLetter, emp.signatures]
      );
      const document_id = docRes.rows[0].id;

      // Resolve building, floor, extension, and seat IDs based on names/numbers
      let building_id = null;
      if (emp.building_name) {
        const bRes = await client.query("SELECT id FROM building WHERE building_name = $1", [emp.building_name]);
        building_id = bRes.rows.length > 0 ? bRes.rows[0].id : null;
      }

      let floor_id = null;
      if (emp.floor_number && building_id) {
        const fRes = await client.query("SELECT id FROM floor WHERE floor_name = $1 AND building_id = $2", [emp.floor_number, building_id]);
        floor_id = fRes.rows.length > 0 ? fRes.rows[0].id : null;
      }

      let extension_id = null;
      if (emp.extension && floor_id) {
        const eRes = await client.query("SELECT id FROM extension WHERE extension_number = $1 AND floor_number = $2", [emp.extension, floor_id]);
        extension_id = eRes.rows.length > 0 ? eRes.rows[0].id : null;
      }

      let seat_id = null;
      if (emp.seat_number && extension_id) {
        const sRes = await client.query("SELECT id FROM seat WHERE seat_number = $1 AND extension_id = $2", [emp.seat_number, extension_id]);
        seat_id = sRes.rows.length > 0 ? sRes.rows[0].id : null;
      }

      // Resolve reporting manager
      const resolved_reporting_manager = emp.reporting_manager ? insertedEmployeeIds[emp.reporting_manager] : null;

      // Initialize counter for the company if not exists
      const companyId = emp.company_id;
      if (!companyEmployeeCounters[companyId]) {
        companyEmployeeCounters[companyId] = 1;
      }
      const company_employee_id = companyEmployeeCounters[companyId]++;

      // 2. Insert user
      const userRes = await client.query(
        `INSERT INTO users (
          company_employee_id, company_id, branch_id, role_id, department_id, designation_id, document_id, employment_type,
          first_name, middle_name, last_name, email, work_email, password, mobile, work_phone_number, dob, doj,
          present_address1, present_address2, present_city, present_country, present_state, present_pincode,
          permanent_address1, permanent_address2, permanent_city, permanent_country, permanent_state, permanent_pincode,
          aadhaar_number, voter_id, pan_number, passport_number, uan_number, pf_number, image,
          current_experience, total_experience, employment_status, reporting_manager,
          gender, marital_status, area_of_expertise, building_name, floor_number, extension, seat_number,
          doe, status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
          $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36,
          $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50
        ) RETURNING id`,
        [
          company_employee_id, emp.company_id, emp.branch_id, emp.role_id, emp.department_id, emp.designation_id, document_id, emp.employment_type,
          emp.first_name, emp.middle_name, emp.last_name, emp.email, emp.work_email, emp.password, emp.mobile, emp.work_phone_number, emp.dob, emp.doj,
          emp.present_address1, emp.present_address2, emp.present_city, emp.present_country, emp.present_state, emp.present_pincode,
          emp.permanent_address1, emp.permanent_address2, emp.permanent_city, emp.permanent_country, emp.permanent_state, emp.permanent_pincode,
          emp.aadhaar_number, emp.voter_id, emp.pan_number, emp.passport_number, emp.uan_number, emp.pf_number || (emp.uan_number ? emp.uan_number.replace("UAN", "PF") : null), emp.image,
          emp.current_experience, emp.total_experience, emp.employment_status, resolved_reporting_manager,
          emp.gender, emp.marital_status, emp.area_of_expertise, building_id, floor_id, extension_id, seat_id,
          emp.doe, emp.status
        ]
      );

      const newUserId = userRes.rows[0].id;
      insertedEmployeeIds[emp.first_name] = newUserId;

      // 3. Update documents user_id
      await client.query(
        `UPDATE documents SET user_id = $1 WHERE id = $2`,
        [newUserId, document_id]
      );

      // 4. Seed default remaining leaves for this user
      const leaveTypesForCompany = companyLeaveTypeIds[emp.company_id];
      if (leaveTypesForCompany) {
        for (const [ltName, ltId] of Object.entries(leaveTypesForCompany)) {
          const defaultLt = defaultLeaveTypes.find(d => d.name === ltName);
          const totalVal = defaultLt ? defaultLt.total_leave : 0;
          await client.query(
            `INSERT INTO remaining_leave (user_id, leave_types, credit_leave, balance_leave, total_leave)
             VALUES ($1, $2, $3, $4, $5)`,
            [newUserId, ltId, totalVal, totalVal, totalVal]
          );
        }
      }

      // 5. Seed default salary details for this user
      const basicVal = 25000.00 + (newUserId % 5) * 5000.00;
      const hraVal = 10000.00 + (newUserId % 3) * 2000.00;
      await client.query(
        `INSERT INTO salary_details (user_id, basic, hra, da, ta, allowance, pf, esic, tax)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [newUserId, basicVal, hraVal, 3000.00, 2000.00, 4000.00, 1800.00, 500.00, 2500.00]
      );
    }
    console.log("✅ Employees, Documents, and Salary Details seeded");

    // =====================================
    // SHIFT ASSIGNMENT & ATTENDANCE SEEDING
    // =====================================
    const usersRes = await client.query("SELECT id, company_id, first_name FROM users");
    const allUsers = usersRes.rows;

    const dates = [];
    const year = 2026;
    const month = 6;
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month - 1, d);
      const dayOfWeek = dateObj.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        const pad = (num) => String(num).padStart(2, "0");
        dates.push(`${year}-${pad(month)}-${pad(d)}`);
      }
    }

    for (let i = 0; i < allUsers.length; i++) {
      const u = allUsers[i];
      const companyId = u.company_id;

      // Find shifts for this company
      const companyShiftsRes = await client.query(
        "SELECT id, shift_name, start_time, end_time FROM shift WHERE company_id = $1",
        [companyId]
      );
      const companyShifts = companyShiftsRes.rows;

      if (companyShifts.length > 0) {
        // Assign shift (round-robin if there are multiple shifts)
        const assignedShift = companyShifts[i % companyShifts.length];

        await client.query(
          `INSERT INTO assign_shift (user_id, shift_id) VALUES ($1, $2)`,
          [u.id, assignedShift.id]
        );

        // Seed attendance logs for specified dates
        let dateIdx = 0;
        const leaveTypeIds = companyLeaveTypeIds[u.company_id] || {};
        const casualLeaveTypeId = leaveTypeIds["Casual Leave"];

        for (const date of dates) {
          // Segment the 22 weekdays of June:
          // - Present: index 0 to 17 (18 days present)
          // - Approved Leave: index 18 to 19 (2 days of leave, e.g. casual leave)
          // - Absent (LOP): index 20 to 21 (2 days absent)
          if (dateIdx >= 18 && dateIdx <= 19) {
            if (dateIdx === 18 && casualLeaveTypeId) {
              const fromDate = dates[18];
              const toDate = dates[19];
              await client.query(
                `INSERT INTO "leave" (user_id, leave_types, from_date, to_date, status, description)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [u.id, casualLeaveTypeId, fromDate, toDate, "Approved", "Family event"]
              );
            }
            dateIdx++;
            continue; // Skip attendance logging
          }

          if (dateIdx >= 20) {
            dateIdx++;
            continue; // Skip attendance logging (absent day / LOP)
          }

          let punchInStr, punchOutStr;

          if (assignedShift.shift_name === "Night Shift" || assignedShift.shift_name === "Shift C") {
            punchInStr = `${date} 21:55:00`;
            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);
            const nextDateStr = nextDate.toISOString().split("T")[0];
            punchOutStr = `${nextDateStr} 06:05:00`;
          } else {
            // Add slight variance to punch times to make them realistic (e.g. ± a few minutes)
            const pad = (num) => String(num).padStart(2, "0");
            const inVarianceMin = (i % 2 === 0) ? -5 : 5;
            const outVarianceMin = (i % 2 === 0) ? 2 : -1;

            const [startHour, startMin, startSec] = assignedShift.start_time.split(":");
            const [endHour, endMin, endSec] = assignedShift.end_time.split(":");

            const inTime = new Date(`${date}T${startHour}:${startMin}:${startSec}`);
            inTime.setMinutes(inTime.getMinutes() + inVarianceMin);
            punchInStr = `${date} ${pad(inTime.getHours())}:${pad(inTime.getMinutes())}:${pad(inTime.getSeconds())}`;

            const outTime = new Date(`${date}T${endHour}:${endMin}:${endSec}`);
            outTime.setMinutes(outTime.getMinutes() + outVarianceMin);
            punchOutStr = `${date} ${pad(outTime.getHours())}:${pad(outTime.getMinutes())}:${pad(outTime.getSeconds())}`;
          }

          await client.query(
            `INSERT INTO attendance (user_id, shift_id, punch_in_at, punch_out_at, created_by)
             VALUES ($1, $2, $3, $4, $5)`,
            [u.id, assignedShift.id, punchInStr, punchOutStr, u.id]
          );

          dateIdx++;
        }
      }
    }
    console.log("✅ Shift assignments and Attendance seeded dynamically");

    await client.query("COMMIT");
    console.log("\n🎉 All seed data inserted successfully!");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Seeding failed:", error);
  } finally {
    client.release();
    process.exit();
  }
};

seedData();