/**
 * Manual API test script for Financial Years module.
 * Usage: node backend/scripts/testFinancialYearsApi.js
 *
 * Requires: running backend, PostgreSQL, admin user credentials in env or defaults.
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const BASE_URL = process.env.TEST_API_BASE || "http://localhost:3000";
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || "admin@test.com";
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || "admin123";

let token = null;
let createdIds = [];

const request = async (method, path, body) => {
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };

  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${path}`, options);
  const text = await response.text();
  let json = null;

  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  return { status: response.status, json };
};

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const login = async () => {
  const res = await request("POST", "/login", {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });

  assert(res.status === 200, `Login failed (${res.status}): ${JSON.stringify(res.json)}`);
  token = res.json?.data?.token || res.json?.token;
  assert(token, "No token returned from login");
};

const run = async () => {
  console.log("Financial Years API tests\n");

  await login();
  console.log("✓ Login");

  const create2627 = await request("POST", "/api/financial-years", {
    year_label: "2026-27",
    remarks: "Test FY 2026-27",
  });

  assert(create2627.status === 201, `Create 2026-27 failed: ${JSON.stringify(create2627.json)}`);
  assert(create2627.json.data.start_date === "2026-04-01", "start_date mismatch for 2026-27");
  assert(create2627.json.data.end_date === "2027-03-31", "end_date mismatch for 2026-27");
  assert(create2627.json.data.status === "closed", "New FY should default to closed");
  createdIds.push(create2627.json.data.id);
  console.log("✓ Create FY 2026-27 with derived dates");

  const activate2627 = await request(
    "PUT",
    `/api/financial-years/${create2627.json.data.id}/activate`
  );
  assert(activate2627.status === 200, `Activate 2026-27 failed: ${JSON.stringify(activate2627.json)}`);
  assert(activate2627.json.data.status === "active", "2026-27 should be active");
  console.log("✓ Activate FY 2026-27");

  const create2728 = await request("POST", "/api/financial-years", {
    year_label: "2027-28",
  });
  assert(create2728.status === 201, `Create 2027-28 failed: ${JSON.stringify(create2728.json)}`);
  assert(create2728.json.data.start_date === "2027-04-01", "start_date mismatch for 2027-28");
  assert(create2728.json.data.end_date === "2028-03-31", "end_date mismatch for 2027-28");
  createdIds.push(create2728.json.data.id);
  console.log("✓ Create FY 2027-28");

  const activate2728 = await request(
    "PUT",
    `/api/financial-years/${create2728.json.data.id}/activate`
  );
  assert(activate2728.status === 200, `Activate 2027-28 failed: ${JSON.stringify(activate2728.json)}`);
  assert(activate2728.json.data.status === "active", "2027-28 should be active");
  console.log("✓ Activate FY 2027-28 (auto-close prior active)");

  const get2627 = await request("GET", `/api/financial-years/${create2627.json.data.id}`);
  assert(get2627.status === 200, "Fetch 2026-27 failed");
  assert(get2627.json.data.status === "closed", "2026-27 should be closed after 2027-28 activation");
  console.log("✓ Prior active FY auto-closed (2026-27 = closed)");

  const active = await request("GET", "/api/financial-years/active");
  assert(active.status === 200, `GET active failed: ${JSON.stringify(active.json)}`);
  assert(active.json.data.year_label === "2027-28", "Active FY should be 2027-28");
  console.log("✓ GET /active returns one record (2027-28)");

  const duplicate = await request("POST", "/api/financial-years", {
    year_label: "2027-28",
  });
  assert(duplicate.status === 409, "Duplicate year_label should be rejected");
  console.log("✓ Duplicate year_label rejected");

  const invalidLabel = await request("POST", "/api/financial-years", {
    year_label: "2026-28",
  });
  assert(invalidLabel.status === 400, "Invalid label suffix should be rejected");
  console.log("✓ Invalid year_label format rejected");

  const overlap = await request("POST", "/api/financial-years", {
    year_label: "2026-28",
  });
  if (overlap.status !== 400) {
    const overlap2 = await request("POST", "/api/financial-years", {
      year_label: "2027-27",
    });
    assert(
      overlap2.status === 400 || overlap2.status === 409,
      "Overlapping FY should be rejected"
    );
  }
  console.log("✓ Overlap / invalid label validation checked");

  const noToken = await fetch(`${BASE_URL}/api/financial-years`);
  assert(noToken.status === 401, "Unauthenticated list should return 401");
  console.log("✓ Auth required on GET list");

  console.log("\nAll Financial Years API tests passed.");
};

run().catch((err) => {
  console.error("\nTest run failed:", err.message);
  process.exit(1);
});
