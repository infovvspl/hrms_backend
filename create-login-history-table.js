require("dotenv").config();
const pool = require("./src/config/database");

async function run() {
  try {
    console.log("Checking if login_history table exists...");
    const res = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'login_history'
      );
    `);

    if (!res.rows[0].exists) {
      console.log("Creating login_history table...");
      await pool.query(`
        CREATE TABLE IF NOT EXISTS login_history (
          id SERIAL PRIMARY KEY,
          user_id INTEGER,
          login_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          logout_at TIMESTAMP,
          ipaddress VARCHAR(45),
          device_info TEXT,
          os VARCHAR(50),
          browser VARCHAR(50),
          longitude VARCHAR(50),
          lattitude VARCHAR(50),
          login_status VARCHAR(20),
          failure_reason TEXT,
          session_id VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          
          CONSTRAINT fk_login_history_users
            FOREIGN KEY(user_id)
            REFERENCES users(id)
            ON DELETE CASCADE
        );
      `);
      console.log("✅ Table 'login_history' created successfully.");
    } else {
      console.log("✅ Table 'login_history' already exists.");
    }
  } catch (error) {
    console.error("❌ Database update failed:", error);
  } finally {
    pool.end();
  }
}

run();
