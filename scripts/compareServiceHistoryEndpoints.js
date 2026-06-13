require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const jwt = require("jsonwebtoken");
const pool = require("../db");

(async () => {
  const userResult = await pool.query(
    "SELECT id, role, school_id FROM users WHERE role = 'admin' LIMIT 1"
  );
  const user = userResult.rows[0];
  const token = jwt.sign(
    { id: user.id, role: user.role, school_id: user.school_id },
    process.env.JWT_SECRET
  );
  const headers = { Authorization: `Bearer ${token}` };

  for (const path of [
    "/api/staff-service-history/teacher/3/service-book",
    "/api/staff-service-history/teacher/3",
  ]) {
    const response = await fetch(`http://localhost:3000${path}`, { headers });
    const body = await response.json();
    console.log("\nPATH:", path);
    console.log("status:", response.status);
    console.log("keys:", Object.keys(body.data || {}));
    console.log("timeline length:", body?.data?.timeline?.length ?? "missing");
    console.log("events length:", body?.data?.events?.length ?? "missing");
  }

  await pool.end();
})().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
