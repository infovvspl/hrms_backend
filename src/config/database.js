const { Pool } = require("pg");
const dotenv = require("dotenv");

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

pool.connect()
  .then(async () => {
    console.log("Database connected");
    try {
      await pool.query(`ALTER TABLE payroll DROP COLUMN IF EXISTS status;`);
      await pool.query(`ALTER TABLE payroll ADD COLUMN IF NOT EXISTS payslip_path TEXT;`);
      console.log("Schema checked: payroll status column dropped and payslip_path column verified");
    } catch (err) {
      console.error("Database schema upgrade error:", err);
    }
  })
  .catch((err) => console.error("Database connection error:", err));

module.exports = pool;