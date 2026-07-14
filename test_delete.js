const pool = require("c:/Users/Prayoswini Behera/Documents/hrms/Hrms_Backend/src/config/database");

async function testDelete() {
  try {
    const res = await pool.query("DELETE FROM users WHERE id = 18 RETURNING *");
    console.log("Delete result:", res.rows);
  } catch (error) {
    console.error("DELETE ERROR:", error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

testDelete();
