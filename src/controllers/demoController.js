const pool =
require("../config/database");

const createDemo =
async (req, res) => {

  try {

    const {

      full_name,
      business_email,
      country_code,
      phone_number,
      company_name,
      employee_size,
      service_provider,
      role,
      interested_services,
      other_services,
      requirements,

    } = req.body;


    const result =
    await pool.query(

      `
      INSERT INTO demo_bookings
      (
        full_name,
        business_email,
        country_code,
        phone_number,
        company_name,
        employee_size,
        service_provider,
        role,
        interested_services,
        other_services,
        requirements
      )

      VALUES
      (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11
      )

      RETURNING *
      `,

      [
        full_name,
        business_email,
        country_code,
        phone_number,
        company_name,
        employee_size,
        service_provider,
        role,
        interested_services,
        other_services,
        requirements,
      ]
    );

    res.status(201).json({

      success: true,

      message:
      "Demo booked successfully",

      data:
      result.rows[0],
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

module.exports = {
  createDemo,
};