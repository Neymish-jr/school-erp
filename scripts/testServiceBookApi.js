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

  const response = await fetch(
    "http://localhost:3000/api/staff-service-history/teacher/3/service-book",
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const body = await response.json();

  console.log("HTTP_STATUS", response.status);
  console.log("INNER_DATA_TIMELINE_LENGTH", body?.data?.timeline?.length ?? "missing");
  console.log("INNER_DATA_TOTAL_EVENTS", body?.data?.total_events ?? "missing");
  console.log("INNER_DATA_KEYS", body?.data ? Object.keys(body.data) : "no data");
  console.log("FULL_BODY", JSON.stringify(body, null, 2));

  await pool.end();
  process.exit(0);
})().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
