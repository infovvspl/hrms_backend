require("dotenv").config();

const pool = require("../config/database");

const createTables = async () => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // =====================================
    // DROP TABLES
    // =====================================

    await client.query(`
      DROP TABLE IF EXISTS otp CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      DROP TABLE IF EXISTS documents CASCADE;
      DROP TABLE IF EXISTS designations CASCADE;
      DROP TABLE IF EXISTS departments CASCADE;
      DROP TABLE IF EXISTS roles CASCADE;
      DROP TABLE IF EXISTS branch CASCADE;
      DROP TABLE IF EXISTS sector CASCADE;
      DROP TABLE IF EXISTS company CASCADE;
      DROP TABLE IF EXISTS company_type CASCADE;
      DROP TABLE IF EXISTS demo_bookings CASCADE;
      DROP TABLE IF EXISTS employment_type CASCADE;
      DROP TABLE IF EXISTS asset CASCADE;
      DROP TABLE IF EXISTS asset_assign CASCADE;
      DROP TABLE IF EXISTS attendance CASCADE;
      DROP TABLE IF EXISTS salary CASCADE;
      DROP TABLE IF EXISTS building CASCADE;
      DROP TABLE IF EXISTS floor CASCADE;
      DROP TABLE IF EXISTS extension CASCADE;
      DROP TABLE IF EXISTS seat CASCADE;
      DROP TABLE IF EXISTS remaining_leave CASCADE;
      DROP TABLE IF EXISTS leave CASCADE;
      DROP TABLE IF EXISTS holiday CASCADE;
      DROP TABLE IF EXISTS leave_types CASCADE;
      DROP TABLE IF EXISTS shift CASCADE;
      DROP TABLE IF EXISTS assign_shift CASCADE;
      DROP TABLE IF EXISTS warning_letter CASCADE;
      DROP TABLE IF EXISTS termination_letter CASCADE;
      DROP TABLE IF EXISTS resignation_letter CASCADE;
      DROP TABLE IF EXISTS face_descriptor CASCADE;
      DROP TABLE IF EXISTS payroll CASCADE;
      DROP TABLE IF EXISTS salary_details CASCADE;
      DROP TABLE IF EXISTS login_history CASCADE;
      DROP TABLE IF EXISTS interview_mail CASCADE;
      DROP TABLE IF EXISTS asset_repair CASCADE;
    `);

    // =====================================
    // COMPANIES TABLE
    // =====================================

    await client.query(`
      CREATE TABLE IF NOT EXISTS company (

        id SERIAL PRIMARY KEY,

        company_name VARCHAR(255) NOT NULL,

        email VARCHAR(255) UNIQUE NOT NULL,

        password TEXT,

        phone VARCHAR(20),

        address1 TEXT,

        address2 TEXT,

        city VARCHAR(100),

        country VARCHAR(100),

        state VARCHAR(100),

        company_type INTEGER,
        
        sector INTEGER,

        pincode VARCHAR(20),

        logo TEXT,

        stamp TEXT,

        google_id TEXT UNIQUE,

        profile_pic TEXT,

        login_type VARCHAR(20) DEFAULT 'email',

        is_verified BOOLEAN DEFAULT false,

        cin_number VARCHAR(100),

        registration_number VARCHAR(100),

        gst_no VARCHAR(100),

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // =====================================
    // COMPANY TYPE TABLE
    // =====================================

    await client.query(`
    CREATE TABLE company_type (
    
    id SERIAL PRIMARY KEY,

    company_type_name VARCHAR(100) NOT NULL UNIQUE,

    created_by INTEGER,

    updated_by INTEGER,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

    // Add foreign key from company -> company_type
    await client.query(`
      ALTER TABLE company
      ADD CONSTRAINT fk_company_company_type
      FOREIGN KEY (company_type)
      REFERENCES company_type(id)
      ON DELETE SET NULL;
    `);

    // =====================================
    // BRANCHES TABLE
    // =====================================

    await client.query(`
      CREATE TABLE IF NOT EXISTS branch (

        id SERIAL PRIMARY KEY,

        company_id INTEGER NOT NULL,

        name VARCHAR(255) NOT NULL,

        email VARCHAR(255),

        password TEXT,

        phone VARCHAR(20),

        address1 TEXT,

        address2 TEXT,

        city VARCHAR(100),

        country VARCHAR(100),

        state VARCHAR(100),

        pincode VARCHAR(20),

        longitude VARCHAR(100),

        latitude VARCHAR(100),

        created_by INTEGER,

        updated_by INTEGER,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT fk_branch_company
        FOREIGN KEY(company_id)
        REFERENCES company(id)
        ON DELETE CASCADE
      );
    `);

    // =====================================
    // ROLES TABLE
    // =====================================

    await client.query(`
      CREATE TABLE IF NOT EXISTS roles (

        id SERIAL PRIMARY KEY,

        company_id INTEGER NOT NULL,

        role_name VARCHAR(100) NOT NULL,

        created_by INTEGER,

        updated_by INTEGER,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT fk_role_company
        FOREIGN KEY(company_id)
        REFERENCES company(id)
        ON DELETE CASCADE
      );
    `);

    // =====================================
    // DEPARTMENTS TABLE
    // =====================================

    await client.query(`
      CREATE TABLE IF NOT EXISTS departments (

        id SERIAL PRIMARY KEY,

        company_id INTEGER NOT NULL,

        department_name VARCHAR(255) NOT NULL,

        department_head INTEGER,

        created_by INTEGER,

        updated_by INTEGER,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT fk_department_company
        FOREIGN KEY(company_id)
        REFERENCES company(id)
        ON DELETE CASCADE
      );
    `);

    // =====================================
    // DESIGNATIONS TABLE
    // =====================================

    await client.query(`
      CREATE TABLE IF NOT EXISTS designations (

        id SERIAL PRIMARY KEY,

        company_id INTEGER NOT NULL,

        title VARCHAR(255) NOT NULL,

        created_by INTEGER,

        updated_by INTEGER,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT fk_designation_company
        FOREIGN KEY(company_id)
        REFERENCES company(id)
        ON DELETE CASCADE
      );
    `);

    // =====================================
    // DOCUMENTS TABLE
    // =====================================

    await client.query(`
      CREATE TABLE IF NOT EXISTS documents (

        id SERIAL PRIMARY KEY,

        user_id INTEGER,
        
        resume TEXT,

        aadhar_card TEXT,

        voter_card TEXT,

        passport TEXT,

        pancard TEXT,

        offer_letter TEXT,

        experience_letter TEXT,

        relieveing_letter TEXT,

        signatures TEXT,

        created_by INTEGER,

        updated_by INTEGER,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // =====================================
    // USERS TABLE
    // =====================================

    await client.query(`
      CREATE TABLE IF NOT EXISTS users(

        id SERIAL PRIMARY KEY,

        company_employee_id INTEGER,

        branch_id INTEGER,

        role_id INTEGER,

        department_id INTEGER,

        document_id INTEGER,

        designation_id INTEGER,

        company_id INTEGER,

        employment_type INT NOT NULL,

        first_name VARCHAR(100) NOT NULL,

        middle_name VARCHAR(100),

        last_name VARCHAR(100) NOT NULL,

        email VARCHAR(255) UNIQUE NOT NULL,
        
        work_email VARCHAR(255) UNIQUE,

        password VARCHAR(255) NOT NULL,

        mobile VARCHAR(20),

        work_phone_number VARCHAR(20),

        dob DATE,

        doj DATE,

        present_address1 TEXT,

        present_address2 TEXT,

        present_city VARCHAR(100),

        present_country VARCHAR(100),

        present_state VARCHAR(100),

        present_pincode VARCHAR(20),

        permanent_address1 TEXT,

        permanent_address2 TEXT,

        permanent_city VARCHAR(100),

        permanent_country VARCHAR(100),

        permanent_state VARCHAR(100),

        permanent_pincode VARCHAR(20),

        aadhaar_number VARCHAR(12) UNIQUE,

        voter_id VARCHAR(20) UNIQUE,
        
        pan_number VARCHAR(10) UNIQUE,

        passport_number VARCHAR(20) UNIQUE,

        uan_number VARCHAR(20) UNIQUE,

        pf_number VARCHAR(50) UNIQUE,

        image TEXT,

        current_experience DECIMAL(4,1) DEFAULT 0,

        total_experience DECIMAL(4,1) DEFAULT 0,

        employment_status VARCHAR(30) NOT NULL DEFAULT 'Active',

        reporting_manager INT,

        gender VARCHAR(20),

        marital_status VARCHAR(20),

        area_of_expertise VARCHAR(100),

        emergency_contact_name VARCHAR(150),

        emergency_contact_relation VARCHAR(100),

        emergency_contact_phone VARCHAR(20),

        building_name INT,

        floor_number INT,

        extension INT,

        seat_number INT,

        doe DATE,

        status VARCHAR(30) ,

        created_by INTEGER,

        updated_by INTEGER,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT fk_users_branch
        FOREIGN KEY(branch_id)
        REFERENCES branch(id)
        ON DELETE SET NULL,

        CONSTRAINT fk_users_role
        FOREIGN KEY(role_id)
        REFERENCES roles(id)
        ON DELETE SET NULL,

        CONSTRAINT fk_users_department
        FOREIGN KEY(department_id)
        REFERENCES departments(id)
        ON DELETE SET NULL,

        CONSTRAINT fk_users_document
        FOREIGN KEY(document_id)
        REFERENCES documents(id)
        ON DELETE SET NULL,

        CONSTRAINT fk_users_designation
        FOREIGN KEY(designation_id)
        REFERENCES designations(id)
        ON DELETE SET NULL,

        CONSTRAINT fk_users_company
        FOREIGN KEY(company_id)
        REFERENCES company(id)
        ON DELETE CASCADE,


        -- building/floor/extension/seat FKs added after those tables are created to avoid ordering cycles

       CONSTRAINT fk_users_created_by
       FOREIGN KEY (created_by)
       REFERENCES users(id)
       ON DELETE SET NULL,

       CONSTRAINT fk_users_updated_by
       FOREIGN KEY (updated_by)
       REFERENCES users(id)
       ON DELETE SET NULL

      ,CONSTRAINT fk_reporting_manager
       FOREIGN KEY (reporting_manager)
       REFERENCES users(id)
       ON DELETE SET NULL
      );
    `);

    // Add department_head foreign key after users table to avoid cyclic dependency
    await client.query(`
      ALTER TABLE departments
      ADD CONSTRAINT fk_department_head
      FOREIGN KEY (department_head)
      REFERENCES users(id)
      ON DELETE SET NULL;
    `);

    // =====================================
    // EMPLOYMENT TYPE TABLE
    // =====================================

    await client.query(`
    CREATE TABLE employment_type (

    id SERIAL PRIMARY KEY,

    employment_type_name VARCHAR(50) NOT NULL UNIQUE,

    created_by INT,

    updated_by INT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
`);
    await client.query(`
      CREATE TABLE sector (
      id SERIAL PRIMARY KEY,

      sector_name VARCHAR(100) NOT NULL UNIQUE,

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

    // Add foreign key from company -> sector
    await client.query(`
      ALTER TABLE company
      ADD CONSTRAINT fk_company_sector
      FOREIGN KEY (sector)
      REFERENCES sector(id)
      ON DELETE SET NULL;
    `);

    // =====================================
    // DOCUMENTS FOREIGN KEY
    // =====================================

    await client.query(`
      ALTER TABLE documents
      ADD CONSTRAINT fk_document_users
      FOREIGN KEY(user_id)
      REFERENCES users(id)
      ON DELETE CASCADE;
    `);

    // =====================================
    // OTP VERIFICATIONS TABLE
    // =====================================

    await client.query(`
      CREATE TABLE IF NOT EXISTS otp(

        id SERIAL PRIMARY KEY,

        user_id INTEGER,

        company_id INTEGER,

        otp VARCHAR(10) NOT NULL,

        otp_expiry TIMESTAMP NOT NULL,

        verified BOOLEAN DEFAULT false,

        mode VARCHAR(50) DEFAULT 'gmail',

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT fk_otp_users
        FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

        CONSTRAINT fk_otp_company
        FOREIGN KEY(company_id)
        REFERENCES company(id)
        ON DELETE CASCADE
      );
    `);

    // =====================================
    // DEMO BOOKINGS TABLE
    // =====================================

    await client.query(`
      CREATE TABLE IF NOT EXISTS demo_bookings (

        id SERIAL PRIMARY KEY,

        full_name VARCHAR(150) NOT NULL,

        business_email VARCHAR(150) NOT NULL UNIQUE,

        country_code VARCHAR(10) NOT NULL,

        phone_number VARCHAR(20) NOT NULL,

        company_name VARCHAR(150) NOT NULL,

        employee_size VARCHAR(50) NOT NULL,

        service_provider VARCHAR(100),

        role VARCHAR(100),

        interested_services TEXT,

        other_services TEXT,

        requirements TEXT,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    // =====================================
    // ASSET TABLE
    // =====================================

    await client.query(`

    CREATE TABLE IF NOT EXISTS asset (
        id SERIAL PRIMARY KEY,

        branch_id INTEGER,

        asset_name VARCHAR(255) NOT NULL,

        purchase_date DATE,

        vendor_name VARCHAR(255),

        price NUMERIC(15,2) DEFAULT 0.00,

        bill TEXT,

        created_by INTEGER,

        updated_by INTEGER,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT fk_asset_branch
        FOREIGN KEY(branch_id)
        REFERENCES branch(id)
        ON DELETE SET NULL
        );
     `);

    // =====================================
    // ASSET ASSIGN TABLE
    // =====================================

    await client.query(`

    CREATE TABLE IF NOT EXISTS asset_assign (
        id SERIAL PRIMARY KEY,

        user_id INTEGER NOT NULL,

        asset_id INTEGER NOT NULL,

        assign_date DATE DEFAULT CURRENT_DATE,

        created_by INTEGER,

        updated_by INTEGER,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT fk_asset_assign_user
          FOREIGN KEY (user_id)
          REFERENCES users(id)
            ON DELETE CASCADE,

        CONSTRAINT fk_asset_assign_asset
            FOREIGN KEY (asset_id)
            REFERENCES asset(id)
            ON DELETE CASCADE
          );
        `);

    // =====================================
    // ASSET REPAIR TABLE
    // =====================================

    await client.query(`

    CREATE TABLE IF NOT EXISTS asset_repair (
        id SERIAL PRIMARY KEY,

        asset_id INTEGER NOT NULL,

        repair_date DATE,

        vendor_name VARCHAR(255),

        repair_price NUMERIC(15,2) DEFAULT 0.00,

        description TEXT,

        repair_done_by INTEGER,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT fk_asset_repair_asset
          FOREIGN KEY (asset_id)
          REFERENCES asset(id)
          ON DELETE CASCADE,

        CONSTRAINT fk_asset_repair_done_by
          FOREIGN KEY (repair_done_by)
          REFERENCES users(id)
          ON DELETE SET NULL
        );
     `);

    // =====================================
    // SHIFT TABLE
    // =====================================

    await client.query(`
      CREATE TABLE IF NOT EXISTS shift (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL,
        shift_name VARCHAR(255) NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        created_by INTEGER,
        updated_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT fk_shift_company
          FOREIGN KEY (company_id)
          REFERENCES company(id)
          ON DELETE CASCADE,

        CONSTRAINT fk_shift_created_by
          FOREIGN KEY (created_by)
          REFERENCES users(id)
          ON DELETE SET NULL,

        CONSTRAINT fk_shift_updated_by
          FOREIGN KEY (updated_by)
          REFERENCES users(id)
          ON DELETE SET NULL
      );
    `);

    // =====================================
    // ASSIGN SHIFT TABLE
    // =====================================

    await client.query(`
      CREATE TABLE IF NOT EXISTS assign_shift (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        shift_id INTEGER NOT NULL,
        created_by INTEGER,
        updated_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT fk_assign_shift_user
          FOREIGN KEY (user_id)
          REFERENCES users(id)
          ON DELETE CASCADE,

        CONSTRAINT fk_assign_shift_shift
          FOREIGN KEY (shift_id)
          REFERENCES shift(id)
          ON DELETE CASCADE,

        CONSTRAINT fk_assign_shift_created_by
          FOREIGN KEY (created_by)
          REFERENCES users(id)
          ON DELETE SET NULL,

        CONSTRAINT fk_assign_shift_updated_by
          FOREIGN KEY (updated_by)
          REFERENCES users(id)
          ON DELETE SET NULL
      );
    `);

    // =====================================
    // ATTENDANCE TABLE
    // =====================================

    await client.query(`
    CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,

        user_id INTEGER NOT NULL,

        shift_id INTEGER,

        punch_in_type VARCHAR(100),

        punch_in_at TIMESTAMP,

        punch_in_longitude VARCHAR(100),

        punch_in_latitude VARCHAR(100),

        punch_out_type VARCHAR(100),

        punch_out_at TIMESTAMP,

        punch_out_longitude VARCHAR(100),

        punch_out_latitude VARCHAR(100),

        total_time VARCHAR(100),

        created_by INTEGER,

        updated_by INTEGER,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT fk_attendance_users
          FOREIGN KEY (user_id)
          REFERENCES users(id)
            ON DELETE CASCADE,

        CONSTRAINT fk_attendance_shift
          FOREIGN KEY (shift_id)
          REFERENCES shift(id)
            ON DELETE SET NULL,

        CONSTRAINT fk_attendance_created_by
          FOREIGN KEY (created_by)
          REFERENCES users(id)
            ON DELETE SET NULL,

        CONSTRAINT fk_attendance_updated_by
          FOREIGN KEY (updated_by)
          REFERENCES users(id)
            ON DELETE SET NULL
          );
       `);

    // =====================================
    // PAYROLL TABLE
    // =====================================

    await client.query(`
      CREATE TABLE IF NOT EXISTS payroll (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        month VARCHAR(50) NOT NULL,
        year INTEGER NOT NULL,
        total_working_days INTEGER DEFAULT 0,
        present_days NUMERIC(5,2) DEFAULT 0.00,
        leave_days NUMERIC(5,2) DEFAULT 0.00,
        lop_days NUMERIC(5,2) DEFAULT 0.00,
        gross_salary NUMERIC(15,2) DEFAULT 0.00,
        total_deductions NUMERIC(15,2) DEFAULT 0.00,
        net_salary NUMERIC(15,2) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_payroll_users
          FOREIGN KEY (user_id)
          REFERENCES users(id)
          ON DELETE CASCADE
      );
    `);

    // =====================================
    // SALARY DETAILS TABLE
    // =====================================

    await client.query(`
      CREATE TABLE IF NOT EXISTS salary_details (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        basic NUMERIC(15,2) DEFAULT 0.00,
        hra NUMERIC(15,2) DEFAULT 0.00,
        da NUMERIC(15,2) DEFAULT 0.00,
        ta NUMERIC(15,2) DEFAULT 0.00,
        allowance NUMERIC(15,2) DEFAULT 0.00,
        pf NUMERIC(15,2) DEFAULT 0.00,
        esic NUMERIC(15,2) DEFAULT 0.00,
        tax NUMERIC(15,2) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_salary_details_users
          FOREIGN KEY (user_id)
          REFERENCES users(id)
          ON DELETE CASCADE
      );
    `);

    // =====================================
    // BUILDING TABLE

    // =====================================

    await client.query(`
    CREATE TABLE IF NOT EXISTS building (
        id SERIAL PRIMARY KEY,

        building_name VARCHAR(255) NOT NULL,

        created_by INTEGER,

        updated_by INTEGER,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
`);
    // =====================================
    // FLOOR TABLE
    // =====================================

    await client.query(`
    CREATE TABLE IF NOT EXISTS floor (
        id SERIAL PRIMARY KEY,

        branch_id INTEGER NOT NULL,

        building_id INTEGER NOT NULL,

        floor_name VARCHAR(255) NOT NULL,

        created_by INTEGER,

        updated_by INTEGER,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT fk_floor_branch
            FOREIGN KEY (branch_id)
            REFERENCES branch(id)
            ON DELETE CASCADE,

        CONSTRAINT fk_floor_building
            FOREIGN KEY (building_id)
            REFERENCES building(id)
            ON DELETE CASCADE
    );
`);
    // =====================================
    // EXTENSION TABLE
    // =====================================

    await client.query(`
   CREATE TABLE extension (
          id SERIAL PRIMARY KEY,

          floor_number INT NOT NULL,

          extension_number VARCHAR(20) NOT NULL UNIQUE,

          created_by INT,
          
          updated_by INT,

          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_extension_floor
        FOREIGN KEY (floor_number)
        REFERENCES floor(id)
        ON DELETE CASCADE
    );
  `);
    // =====================================
    // SEAT TABLE
    // =====================================

    await client.query(`
      CREATE TABLE seat (
        id SERIAL PRIMARY KEY,
        extension_id INT NOT NULL,
        seat_number VARCHAR(20) NOT NULL,
        created_by INT,

        updated_by INT,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT fk_seat_extension
          FOREIGN KEY (extension_id)
          REFERENCES extension(id)
          ON DELETE CASCADE
      );
    `);

    // =====================================
    // HOLIDAY TABLE
    // =====================================

    await client.query(`
      CREATE TABLE IF NOT EXISTS holiday (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL,
        name VARCHAR(255) NOT NULL,
        from_date DATE NOT NULL,
        to_date DATE NOT NULL,
        is_optional BOOLEAN DEFAULT false,
        created_by INTEGER,
        updated_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT fk_holiday_company
          FOREIGN KEY (company_id)
          REFERENCES company(id)
          ON DELETE CASCADE,

        CONSTRAINT fk_holiday_created_by
          FOREIGN KEY (created_by)
          REFERENCES users(id)
          ON DELETE SET NULL,

        CONSTRAINT fk_holiday_updated_by
          FOREIGN KEY (updated_by)
          REFERENCES users(id)
          ON DELETE SET NULL
      );
    `);

    // =====================================
    // LEAVE TYPES TABLE
    // =====================================

    await client.query(`
      CREATE TABLE IF NOT EXISTS leave_types (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL,
        name VARCHAR(255) NOT NULL,
        credit_type VARCHAR(255),
        carry_forward VARCHAR(255),
        total_leave NUMERIC(5,2) DEFAULT 0.00,
        created_by INTEGER,
        updated_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT fk_leave_types_company
          FOREIGN KEY (company_id)
          REFERENCES company(id)
          ON DELETE CASCADE,

        CONSTRAINT fk_leave_types_created_by
          FOREIGN KEY (created_by)
          REFERENCES users(id)
          ON DELETE SET NULL,

        CONSTRAINT fk_leave_types_updated_by
          FOREIGN KEY (updated_by)
          REFERENCES users(id)
          ON DELETE SET NULL
      );
    `);

    // =====================================
    // LEAVE TABLE
    // =====================================

    await client.query(`
      CREATE TABLE IF NOT EXISTS leave (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        leave_types INTEGER NOT NULL,
        from_date DATE NOT NULL,
        to_date DATE NOT NULL,
        status VARCHAR(50) DEFAULT 'Pending',
        description TEXT,
        approved_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT fk_leave_users
          FOREIGN KEY (user_id)
          REFERENCES users(id)
          ON DELETE CASCADE,

        CONSTRAINT fk_leave_leave_types
          FOREIGN KEY (leave_types)
          REFERENCES leave_types(id)
          ON DELETE CASCADE
      );
    `);

    // =====================================
    // REMAINING LEAVE TABLE
    // =====================================

    await client.query(`
      CREATE TABLE IF NOT EXISTS remaining_leave (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        leave_types INTEGER NOT NULL,
        credit_leave NUMERIC(5,1) DEFAULT 0.0,
        balance_leave NUMERIC(5,1) DEFAULT 0.0,
        total_leave NUMERIC(5,1) DEFAULT 0.0,
        created_by INTEGER,
        updated_by INTEGER,

        CONSTRAINT fk_remaining_leave_users
          FOREIGN KEY (user_id)
          REFERENCES users(id)
          ON DELETE CASCADE,

        CONSTRAINT fk_remaining_leave_leave_types
          FOREIGN KEY (leave_types)
          REFERENCES leave_types(id)
          ON DELETE CASCADE,

        CONSTRAINT fk_remaining_leave_created_by
          FOREIGN KEY (created_by)
          REFERENCES users(id)
          ON DELETE SET NULL,

        CONSTRAINT fk_remaining_leave_updated_by
          FOREIGN KEY (updated_by)
          REFERENCES users(id)
          ON DELETE SET NULL
      );
    `);


    // =====================================
    // WARNING LETTER TABLE
    // =====================================

    await client.query(`
      CREATE TABLE IF NOT EXISTS warning_letter (

        id SERIAL PRIMARY KEY,

        user_id INTEGER NOT NULL,

        subject TEXT,

        description TEXT,

        issued_by INTEGER,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT fk_warning_letter_user
          FOREIGN KEY (user_id)
          REFERENCES users(id)
          ON DELETE CASCADE,

        CONSTRAINT fk_warning_letter_issued_by
          FOREIGN KEY (issued_by)
          REFERENCES users(id)
          ON DELETE SET NULL
      );
    `);

    // =====================================
    // TERMINATION LETTER TABLE
    // =====================================

    await client.query(`
      CREATE TABLE IF NOT EXISTS termination_letter (

        id SERIAL PRIMARY KEY,

        user_id INTEGER NOT NULL,

        subject TEXT,

        description TEXT,

        issued_by INTEGER,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT fk_termination_letter_user
          FOREIGN KEY (user_id)
          REFERENCES users(id)
          ON DELETE CASCADE,

        CONSTRAINT fk_termination_letter_issued_by
          FOREIGN KEY (issued_by)
          REFERENCES users(id)
          ON DELETE SET NULL
      );
    `);

    // =====================================
    // RESIGNATION LETTER TABLE
    // =====================================

    await client.query(`
      CREATE TABLE IF NOT EXISTS resignation_letter (

        id SERIAL PRIMARY KEY,

        user_id INTEGER NOT NULL,

        subject TEXT,

        description TEXT,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT fk_resignation_letter_user
          FOREIGN KEY (user_id)
          REFERENCES users(id)
          ON DELETE CASCADE
      );
    `);

    // =====================================
    // FACE DESCRIPTOR TABLE
    // =====================================

    await client.query(`
      CREATE TABLE IF NOT EXISTS face_descriptor (
        id SERIAL PRIMARY KEY,

        user_id INTEGER NOT NULL,

        descriptor double precision[] NOT NULL,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT fk_face_descriptor_users
          FOREIGN KEY (user_id)
          REFERENCES users(id)
          ON DELETE CASCADE
      );
    `);


    // Add users -> building/floor/extension/seat foreign keys now that those tables exist
    await client.query(`
      ALTER TABLE users
      ADD CONSTRAINT fk_users_building
        FOREIGN KEY (building_name)
        REFERENCES building(id)
        ON DELETE SET NULL,
      ADD CONSTRAINT fk_users_floor
        FOREIGN KEY (floor_number)
        REFERENCES floor(id)
        ON DELETE SET NULL,
      ADD CONSTRAINT fk_users_extension
        FOREIGN KEY (extension)
        REFERENCES extension(id)
        ON DELETE SET NULL,
      ADD CONSTRAINT fk_users_seat
        FOREIGN KEY (seat_number)
        REFERENCES seat(id)
        ON DELETE SET NULL;
    `);

    // =====================================
    // LOGIN HISTORY TABLE
    // =====================================

    await client.query(`
      CREATE TABLE IF NOT EXISTS login_history (

        id SERIAL PRIMARY KEY,

        user_id INTEGER,

        login_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        logout_at TIMESTAMP,

        ipaddress VARCHAR(100),

        device_info TEXT,

        os VARCHAR(100),

        browser VARCHAR(100),

        longitude VARCHAR(100),

        lattitude VARCHAR(100),

        login_status VARCHAR(50) DEFAULT 'success',

        failure_reason TEXT,

        session_id TEXT,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT fk_login_history_user
          FOREIGN KEY (user_id)
          REFERENCES users(id)
          ON DELETE CASCADE
      );
    `);

    // =====================================
    // INTERVIEW MAIL TABLE
    // =====================================

    await client.query(`DROP TABLE IF EXISTS interview_mail;`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS interview_mail(
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        subject TEXT,
        description TEXT,
        issued_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_interview_mail_users
        FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
      );
    `);

    // =====================================
    // DOCUMENTS TABLE UPDATE
    // =====================================
    await client.query(`
      ALTER TABLE documents
      ADD COLUMN IF NOT EXISTS resume TEXT;
    `);

    await client.query("COMMIT");

    console.log("✅ All tables created successfully");
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("❌ Migration failed:", error);
  } finally {
    client.release();

    process.exit();
  }
};

createTables();
