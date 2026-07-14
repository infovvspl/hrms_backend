const pool = require("../config/database");

const bcrypt = require("bcryptjs");

const sendOtpEmail =
  require("../utils/sendEmail");


// ================= SEND OTP =================
exports.sendOtp = async (req, res) => {

  try {

    const {
      company_name,
      email,
      phone,
      password,
    } = req.body;


    // ================= CHECK COMPANY EXISTS =================
    const existingCompany =
      await pool.query(

        "SELECT * FROM company WHERE email = $1",

        [email]
      );

    if (
      existingCompany.rows.length > 0
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Email already exists",
      });
    }

    // ================= HASH PASSWORD =================
    const hashedPassword =
      await bcrypt.hash(password, 10);


    // ================= CREATE COMPANY =================
    const companyResult =
      await pool.query(

        `
      INSERT INTO company
      (
        company_name,
        email,
        phone,
        password,
        is_verified
      )
      VALUES
      (
        $1,$2,$3,$4,false
      )
      RETURNING id
      `,

        [
          company_name,
          email,
          phone,
          hashedPassword,
        ]
      );

    const companyId =
      companyResult.rows[0].id;


    // ================= GENERATE OTP =================
    const otp =
      Math.floor(
        100000 + Math.random() * 900000
      ).toString();

    const otpExpiry =
      new Date(
        Date.now() + 5 * 60 * 1000
      );


    // ================= STORE OTP =================
    await pool.query(

      `
      INSERT INTO otp
      (
        company_id,
        otp,
        otp_expiry,
        mode
      )
      VALUES ($1,$2,$3,$4)
      `,

      [
        companyId,
        otp,
        otpExpiry,
        "gmail",
      ]
    );


    // ================= SEND EMAIL =================
    await sendOtpEmail(
      email,
      otp
    );


    // ================= SUCCESS =================
    res.status(200).json({

      success: true,

      message:
        "OTP Sent Successfully",
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({

      success: false,

      message:
        "Server Error",
    });
  }
};



// ================= RESEND OTP =================
exports.resendOtp = async (req, res) => {

  try {

    const { email } = req.body;


    // ================= FIND COMPANY =================
    const company =
      await pool.query(

        "SELECT * FROM company WHERE email = $1",

        [email]
      );

    if (
      company.rows.length === 0
    ) {

      return res.status(404).json({

        success: false,

        message:
          "Company not found",
      });
    }

    const companyId =
      company.rows[0].id;


    // ================= LAST OTP =================
    const lastOtp =
      await pool.query(

        `
      SELECT *
      FROM otp
      WHERE company_id = $1
      ORDER BY created_at DESC
      LIMIT 1
      `,

        [companyId]
      );


    // ================= COOLDOWN =================
    if (
      lastOtp.rows.length > 0
    ) {

      const diff =

        (
          Date.now() -
          new Date(
            lastOtp.rows[0].created_at
          )
        ) / 1000;


      if (diff < 30) {

        return res.status(429).json({

          success: false,

          message:
            `Wait ${Math.ceil(
              30 - diff
            )}s before resending OTP`,
        });
      }
    }


    // ================= NEW OTP =================
    const otp =
      Math.floor(
        100000 + Math.random() * 900000
      ).toString();

    const otpExpiry =
      new Date(
        Date.now() + 5 * 60 * 1000
      );


    // ================= STORE OTP =================
    await pool.query(

      `
      INSERT INTO otp
      (
        company_id,
        otp,
        otp_expiry,
        mode
      )
      VALUES ($1,$2,$3,$4)
      `,

      [
        companyId,
        otp,
        otpExpiry,
        "gmail",
      ]
    );


    // ================= SEND EMAIL =================
    await sendOtpEmail(
      email,
      otp
    );


    // ================= SUCCESS =================
    res.status(200).json({

      success: true,

      message:
        "New OTP sent successfully",
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({

      success: false,

      message:
        "Server Error",
    });
  }
};



// ================= VERIFY OTP =================
exports.verifyOtp = async (req, res) => {

  try {

    const {
      email,
      otp,
    } = req.body;


    // ================= FIND COMPANY =================
    const companyRes =
      await pool.query(

        "SELECT * FROM company WHERE email = $1",

        [email]
      );

    if (
      companyRes.rows.length === 0
    ) {

      return res.status(404).json({

        success: false,

        message:
          "Company not found",
      });
    }

    const company =
      companyRes.rows[0];


    // ================= GET OTP =================
    const otpRes =
      await pool.query(

        `
      SELECT *
      FROM otp
      WHERE company_id = $1
      ORDER BY created_at DESC
      LIMIT 1
      `,

        [company.id]
      );


    if (
      otpRes.rows.length === 0
    ) {

      return res.status(400).json({

        success: false,

        message:
          "No OTP found. Please request again.",
      });
    }

    const otpRecord =
      otpRes.rows[0];


    // ================= WRONG OTP =================
    if (
      otpRecord.otp !== otp
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Wrong OTP",
      });
    }


    // ================= OTP EXPIRED =================
    if (
      new Date(
        otpRecord.otp_expiry
      ) < new Date()
    ) {

      return res.status(400).json({

        success: false,

        message:
          "OTP Expired. Please resend.",
      });
    }


    // ================= VERIFY COMPANY =================
    await pool.query(

      `
      UPDATE company
      SET is_verified = true
      WHERE id = $1
      `,

      [company.id]
    );


    // ================= UPDATE OTP =================
    await pool.query(

      `
      UPDATE otp
      SET verified = true
      WHERE id = $1
      `,

      [otpRecord.id]
    );


    // ================= SUCCESS =================
    res.status(200).json({

      success: true,

      message:
        "Email Verified Successfully",
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({

      success: false,

      message:
        "Server Error",
    });
  }
};