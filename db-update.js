const pool = require("./src/config/database");

async function run() {
  try {
    console.log("Checking leave_types table structure...");
    
    // Check if total_leave column exists in leave_types
    const res = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='leave_types' AND column_name='total_leave';
    `);
    
    if (res.rows.length === 0) {
      console.log("Adding total_leave column to leave_types...");
      await pool.query(`
        ALTER TABLE leave_types 
        ADD COLUMN total_leave NUMERIC(5,2) DEFAULT 0.00;
      `);
      console.log("Column total_leave added successfully.");
    } else {
      console.log("Column total_leave already exists in leave_types.");
    }

    console.log("Checking if fk_leave_approved_by constraint exists...");
    const constraintRes = await pool.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name='leave' AND constraint_name='fk_leave_approved_by';
    `);

    if (constraintRes.rows.length > 0) {
      console.log("Dropping constraint fk_leave_approved_by...");
      await pool.query(`
        ALTER TABLE leave DROP CONSTRAINT fk_leave_approved_by;
      `);
      console.log("Constraint fk_leave_approved_by dropped successfully.");
    } else {
      console.log("Constraint fk_leave_approved_by does not exist or has already been dropped.");
    }
    
    console.log("Checking leave table columns...");
    const leaveRes = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='leave';
    `);
    console.log("Leave table columns:", leaveRes.rows.map(r => r.column_name));
    
  } catch (error) {
    console.error("Database update failed:", error);
  } finally {
    pool.end();
  }
}

run();
