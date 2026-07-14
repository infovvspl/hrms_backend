require("dotenv").config();
const pool = require("./src/config/database");

async function run() {
  try {
    console.log("Checking if signatures column exists in company table...");
    const res = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='company' AND column_name='signatures';
    `);

    if (res.rows.length === 0) {
      console.log("Adding signatures column to company table...");
      await pool.query(`
        ALTER TABLE company 
        ADD COLUMN signatures JSONB DEFAULT '[]'::jsonb;
      `);
      console.log("✅ Column 'signatures' added successfully to company table.");
    } else {
      console.log("✅ Column 'signatures' already exists in company table.");
    }
  } catch (error) {
    console.error("❌ Database update failed:", error);
  } finally {
    pool.end();
  }
}

run();
