require("dotenv").config();
const pool = require("./src/config/database");

async function run() {
  try {
    console.log("Checking if pf_number column exists in users table...");
    const res = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='users' AND column_name='pf_number';
    `);

    if (res.rows.length === 0) {
      console.log("Adding pf_number column to users table...");
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN pf_number VARCHAR(50) UNIQUE;
      `);
      console.log("✅ Column 'pf_number' added successfully to users table.");
    } else {
      console.log("✅ Column 'pf_number' already exists in users table.");
    }
  } catch (error) {
    console.error("❌ Database update failed:", error);
  } finally {
    pool.end();
  }
}

run();
