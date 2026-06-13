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
  const teacherId = 3;

  const endpoints = [
    `/api/staff-service-history/teacher/${teacherId}/service-book`,
    `/api/teacher-administrative-charge-assignments/teacher/${teacherId}`,
    `/api/teacher-staff-post-assignments/teacher/${teacherId}/current`,
  ];

  for (const path of endpoints) {
    const response = await fetch(`http://localhost:3000${path}`, { headers });
    let body;
    try {
      body = await response.json();
    } catch {
      body = await response.text();
    }
    console.log("\n---", path, "---");
    console.log("status:", response.status);
    if (path.includes("service-book")) {
      console.log("timeline length:", body?.data?.timeline?.length ?? "missing");
    }
    if (!response.ok) {
      console.log("error body:", body);
    }
  }

  await pool.end();
})().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
