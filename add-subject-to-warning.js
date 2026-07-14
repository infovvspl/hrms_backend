require("dotenv").config();
const pool = require("./src/config/database");

async function run() {
  try {
    console.log("Checking if subject column exists in warning_letter table...");
    const res = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='warning_letter' AND column_name='subject';
    `);

    if (res.rows.length === 0) {
      console.log("Adding subject column to warning_letter table...");
      await pool.query(`
        ALTER TABLE warning_letter 
        ADD COLUMN subject VARCHAR(255) DEFAULT 'Warning Letter';
      `);
      console.log("✅ Column 'subject' added successfully to warning_letter table.");
    } else {
      console.log("✅ Column 'subject' already exists in warning_letter table.");
    }
  } catch (error) {
    console.error("❌ Database update failed:", error);
  } finally {
    pool.end();
  }
}

run();
