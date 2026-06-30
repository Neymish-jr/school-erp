/**
 * Tests for GET /api/administrative-charges/:id/details
 * Usage: node backend/scripts/testAdministrativeChargeDetails.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const administrativeChargeService = require("../services/administrativeChargeService");
const { resolveChargeCode } = require("../utils/chargeCode");

const BASE_URL = process.env.TEST_API_BASE || "http://localhost:3000";
const SCHOOL_ONE = 1;
const SCHOOL_TWO = 2;
const TEST_PREFIX = "TEST_CHG_DETAILS_";

const created = {
  chargeIds: [],
  assignmentIds: [],
  teacherIds: [],
  schoolIds: [],
};

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const request = async (token, method, route, body) => {
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

  const response = await fetch(`${BASE_URL}${route}`, options);
  const text = await response.text();
  let json = null;

  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  return { status: response.status, json };
};

const signToken = ({ id, role, school_id }) =>
  jwt.sign({ id, role, school_id }, process.env.JWT_SECRET);

const ensureSchema = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS administrative_charges (
      id SERIAL PRIMARY KEY,
      charge_name TEXT NOT NULL,
      description TEXT DEFAULT '',
      is_active BOOLEAN NOT NULL DEFAULT true,
      school_id INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      CONSTRAINT administrative_charges_school_name_unique UNIQUE (school_id, charge_name)
    )
  `);

  await pool.query(`
    ALTER TABLE administrative_charges
    ADD COLUMN IF NOT EXISTS charge_code VARCHAR(50)
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS teacher_administrative_charge_assignments (
      id SERIAL PRIMARY KEY,
      teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE RESTRICT,
      administrative_charge_id INTEGER NOT NULL REFERENCES administrative_charges(id) ON DELETE RESTRICT,
      school_id INTEGER NOT NULL,
      academic_year VARCHAR(9) NOT NULL,
      assigned_on DATE NOT NULL DEFAULT CURRENT_DATE,
      relieved_on DATE NULL,
      is_active BOOLEAN NOT NULL DEFAULT true,
      remarks TEXT NULL,
      is_additional_charge BOOLEAN NOT NULL DEFAULT false,
      assigned_by_user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  const migrationPath = path.join(
    __dirname,
    "..",
    "migrations",
    "015_idx_taca_charge_school.sql"
  );

  if (fs.existsSync(migrationPath)) {
    await pool.query(fs.readFileSync(migrationPath, "utf8"));
  }
};

const ensureSchoolTwo = async () => {
  const existing = await pool.query(`SELECT id FROM schools WHERE id = $1`, [SCHOOL_TWO]);

  if (existing.rowCount > 0) {
    return;
  }

  const inserted = await pool.query(
    `
    INSERT INTO schools (id, school_name)
    VALUES ($1, $2)
    ON CONFLICT (id) DO NOTHING
    RETURNING id
    `,
    [SCHOOL_TWO, `${TEST_PREFIX}School Two`]
  );

  if (inserted.rowCount > 0) {
    created.schoolIds.push(inserted.rows[0].id);
  }
};

const getAnyUserId = async () => {
  const result = await pool.query(`SELECT id FROM users ORDER BY id ASC LIMIT 1`);
  assert(result.rowCount > 0, "At least one user is required for assignment tests");
  return result.rows[0].id;
};

const createTeacher = async (schoolId, name) => {
  const result = await pool.query(
    `
    INSERT INTO teachers (
      teacher_name,
      designation,
      phone,
      age,
      gender,
      school_id,
      status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id
    `,
    [name, "Teacher", "9999999999", 30, "Other", schoolId, "active"]
  );

  created.teacherIds.push(result.rows[0].id);
  return result.rows[0].id;
};

const createCharge = async ({ schoolId, chargeName, chargeCode, description = "" }) => {
  const resolvedChargeCode = chargeCode || resolveChargeCode(chargeName);

  const result = await pool.query(
    `
    INSERT INTO administrative_charges (charge_name, charge_code, description, school_id)
    VALUES ($1, $2, $3, $4)
    RETURNING id
    `,
    [chargeName, resolvedChargeCode, description, schoolId]
  );

  created.chargeIds.push(result.rows[0].id);
  return result.rows[0].id;
};

const createAssignment = async ({
  teacherId,
  chargeId,
  schoolId,
  academicYear,
  assignedOn,
  relievedOn = null,
  isActive = true,
  assignedByUserId,
}) => {
  const result = await pool.query(
    `
    INSERT INTO teacher_administrative_charge_assignments (
      teacher_id,
      administrative_charge_id,
      school_id,
      academic_year,
      assigned_on,
      relieved_on,
      is_active,
      assigned_by_user_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id
    `,
    [
      teacherId,
      chargeId,
      schoolId,
      academicYear,
      assignedOn,
      relievedOn,
      isActive,
      assignedByUserId,
    ]
  );

  created.assignmentIds.push(result.rows[0].id);
  return result.rows[0].id;
};

const cleanup = async () => {
  if (created.assignmentIds.length > 0) {
    await pool.query(
      `DELETE FROM teacher_administrative_charge_assignments WHERE id = ANY($1::int[])`,
      [created.assignmentIds]
    );
  }

  if (created.chargeIds.length > 0) {
    await pool.query(`DELETE FROM administrative_charges WHERE id = ANY($1::int[])`, [
      created.chargeIds,
    ]);
  }

  if (created.teacherIds.length > 0) {
    await pool.query(`DELETE FROM teachers WHERE id = ANY($1::int[])`, [created.teacherIds]);
  }

  if (created.schoolIds.length > 0) {
    await pool.query(`DELETE FROM schools WHERE id = ANY($1::int[])`, [created.schoolIds]);
  }
};

const setupFixtures = async () => {
  await ensureSchema();
  await ensureSchoolTwo();

  const assignedByUserId = await getAnyUserId();
  const teacherActive = await createTeacher(SCHOOL_ONE, `${TEST_PREFIX}Active Holder`);
  const teacherPast = await createTeacher(SCHOOL_ONE, `${TEST_PREFIX}Past Holder`);

  const activeChargeId = await createCharge({
    schoolId: SCHOOL_ONE,
    chargeName: `${TEST_PREFIX}PM SHRI In-Charge`,
    chargeCode: "pm_shri_incharge",
    description: "Charge with active holder",
  });

  const vacantChargeId = await createCharge({
    schoolId: SCHOOL_ONE,
    chargeName: `${TEST_PREFIX}Vacant Charge`,
    description: "Charge without active holder",
  });

  const otherSchoolChargeId = await createCharge({
    schoolId: SCHOOL_TWO,
    chargeName: `${TEST_PREFIX}Other School Charge`,
    description: "Charge in school 2",
  });

  await createAssignment({
    teacherId: teacherPast,
    chargeId: activeChargeId,
    schoolId: SCHOOL_ONE,
    academicYear: "2024-25",
    assignedOn: "2024-04-01",
    relievedOn: "2025-03-31",
    isActive: false,
    assignedByUserId,
  });

  await createAssignment({
    teacherId: teacherActive,
    chargeId: activeChargeId,
    schoolId: SCHOOL_ONE,
    academicYear: "2025-26",
    assignedOn: "2025-04-01",
    relievedOn: null,
    isActive: true,
    assignedByUserId,
  });

  return {
    assignedByUserId,
    activeChargeId,
    vacantChargeId,
    otherSchoolChargeId,
    teacherActive,
  };
};

const testServiceLayer = async (fixtures) => {
  const adminScope = { role: "admin", schoolId: SCHOOL_ONE };
  const wrongSchoolScope = { role: "admin", schoolId: SCHOOL_TWO };
  const superAdminScope = { role: "super_admin", schoolId: null };

  const invalid = await administrativeChargeService.getChargeDetails(999999999, adminScope);
  assert(invalid === null, "Invalid charge id should return null from service");
  console.log("✓ Service: invalid charge returns null");

  const wrongSchool = await administrativeChargeService.getChargeDetails(
    fixtures.activeChargeId,
    wrongSchoolScope
  );
  assert(wrongSchool === null, "Wrong school scope should return null from service");
  console.log("✓ Service: wrong school returns null");

  const activeDetails = await administrativeChargeService.getChargeDetails(
    fixtures.activeChargeId,
    adminScope
  );

  assert(activeDetails, "Valid charge details should be returned");
  assert(activeDetails.charge.id === fixtures.activeChargeId, "Charge id mismatch");
  assert(activeDetails.charge.is_pm_shri === true, "PM SHRI flag should be true");
  assert(activeDetails.currentHolder, "Active holder should be present");
  assert(
    activeDetails.currentHolder.teacher_id === fixtures.teacherActive,
    "Current holder teacher mismatch"
  );
  assert(activeDetails.assignmentHistory.length === 2, "Assignment history should include 2 rows");
  assert(
    activeDetails.financialYearSummary.length === 2,
    "Financial year summary should include 2 academic years"
  );
  assert(
    activeDetails.financialYearSummary.some(
      (row) => row.academic_year === "2025-26" && row.is_current === true
    ),
    "Current academic year summary missing"
  );
  console.log("✓ Service: valid charge with active holder");

  const vacantDetails = await administrativeChargeService.getChargeDetails(
    fixtures.vacantChargeId,
    adminScope
  );

  assert(vacantDetails, "Vacant charge details should be returned");
  assert(vacantDetails.currentHolder === null, "Vacant charge should have null currentHolder");
  assert(vacantDetails.assignmentHistory.length === 0, "Vacant charge history should be empty");
  assert(
    vacantDetails.financialYearSummary.length === 0,
    "Vacant charge financial year summary should be empty"
  );
  console.log("✓ Service: vacant charge");

  const superAdminActive = await administrativeChargeService.getChargeDetails(
    fixtures.activeChargeId,
    superAdminScope
  );
  assert(superAdminActive?.charge?.school_id === SCHOOL_ONE, "Super admin should read school 1 charge");
  console.log("✓ Service: super_admin cross-school read (school 1)");

  const superAdminOtherSchool = await administrativeChargeService.getChargeDetails(
    fixtures.otherSchoolChargeId,
    superAdminScope
  );
  assert(
    superAdminOtherSchool?.charge?.school_id === SCHOOL_TWO,
    "Super admin should read school 2 charge"
  );
  console.log("✓ Service: super_admin cross-school read (school 2)");
};

const testListWithHolders = async (fixtures) => {
  const adminScope = { role: "admin", schoolId: SCHOOL_ONE };
  const rows = await administrativeChargeService.listAdministrativeCharges(adminScope, {
    search: TEST_PREFIX,
  });

  const activeRow = rows.find((row) => row.id === fixtures.activeChargeId);
  const vacantRow = rows.find((row) => row.id === fixtures.vacantChargeId);

  assert(activeRow, "Active charge should appear in enriched list");
  assert(activeRow.is_vacant === false, "Active charge should not be vacant");
  assert(
    activeRow.current_holder_name?.includes("Active Holder"),
    "Active charge should include current holder name"
  );
  console.log("✓ Service: list includes current_holder_name for assigned charge");

  assert(vacantRow, "Vacant charge should appear in enriched list");
  assert(vacantRow.is_vacant === true, "Vacant charge should be marked vacant");
  assert(vacantRow.current_holder_name === null, "Vacant charge holder name should be null");
  console.log("✓ Service: list marks vacant charges");
};

const testHttpLayer = async (fixtures) => {
  const adminUser = await pool.query(
    `SELECT id, role, school_id FROM users WHERE school_id = $1 ORDER BY id ASC LIMIT 1`,
    [SCHOOL_ONE]
  );

  assert(adminUser.rowCount > 0, "Admin user for school 1 is required for HTTP tests");

  const adminToken = signToken(adminUser.rows[0]);
  const wrongSchoolToken = signToken({
    id: adminUser.rows[0].id,
    role: "admin",
    school_id: SCHOOL_TWO,
  });
  const superAdminToken = signToken({
    id: adminUser.rows[0].id,
    role: "super_admin",
    school_id: null,
  });

  const invalid = await request(adminToken, "GET", "/api/administrative-charges/999999999/details");
  assert(invalid.status === 404, `Invalid charge HTTP status expected 404, got ${invalid.status}`);
  console.log("✓ HTTP: invalid charge returns 404");

  const invalidParam = await request(adminToken, "GET", "/api/administrative-charges/abc/details");
  assert(
    invalidParam.status === 400,
    `Invalid charge param HTTP status expected 400, got ${invalidParam.status}`
  );
  console.log("✓ HTTP: invalid charge id param returns 400");

  const wrongSchool = await request(
    wrongSchoolToken,
    "GET",
    `/api/administrative-charges/${fixtures.activeChargeId}/details`
  );
  assert(wrongSchool.status === 404, `Wrong school HTTP status expected 404, got ${wrongSchool.status}`);
  console.log("✓ HTTP: wrong school returns 404");

  const active = await request(
    adminToken,
    "GET",
    `/api/administrative-charges?search=${encodeURIComponent(TEST_PREFIX)}`
  );
  assert(active.status === 200, `List charges HTTP status expected 200, got ${active.status}`);
  const activeListRow = (active.json?.data || []).find(
    (row) => row.id === fixtures.activeChargeId
  );
  assert(activeListRow?.current_holder_name, "HTTP list should include current_holder_name");
  assert(activeListRow?.is_vacant === false, "HTTP list active charge should not be vacant");
  console.log("✓ HTTP: enriched charge list includes holder");

  const activeDetails = await request(
    adminToken,
    "GET",
    `/api/administrative-charges/${fixtures.activeChargeId}/details`
  );
  assert(activeDetails.status === 200, `Valid charge HTTP status expected 200, got ${activeDetails.status}`);
  assert(activeDetails.json?.data?.currentHolder, "HTTP valid charge should include currentHolder");
  assert(
    activeDetails.json?.data?.assignmentHistory?.length === 2,
    "HTTP valid charge should include assignment history"
  );
  assert(
    activeDetails.json?.data?.financialYearSummary?.length === 2,
    "HTTP valid charge should include financial year summary"
  );
  console.log("✓ HTTP: valid charge with active holder");

  const vacant = await request(
    adminToken,
    "GET",
    `/api/administrative-charges/${fixtures.vacantChargeId}/details`
  );
  assert(vacant.status === 200, `Vacant charge HTTP status expected 200, got ${vacant.status}`);
  assert(vacant.json?.data?.currentHolder === null, "HTTP vacant charge should have null currentHolder");
  console.log("✓ HTTP: vacant charge");

  const superAdmin = await request(
    superAdminToken,
    "GET",
    `/api/administrative-charges/${fixtures.otherSchoolChargeId}/details`
  );
  assert(
    superAdmin.status === 200,
    `Super admin HTTP status expected 200, got ${superAdmin.status}`
  );
  assert(
    superAdmin.json?.data?.charge?.school_id === SCHOOL_TWO,
    "Super admin HTTP response should include school 2 charge"
  );
  console.log("✓ HTTP: super_admin cross-school access");
};

const verifyRouteOrder = () => {
  const routesContent = fs.readFileSync(
    path.join(__dirname, "..", "routes", "administrativeChargeRoutes.js"),
    "utf8"
  );

  const detailsIndex = routesContent.indexOf('"/:id/details"');
  const byIdIndex = routesContent.indexOf('"/:id", authenticate, asyncHandler(getAdministrativeChargeById)');

  assert(detailsIndex !== -1, "Route /:id/details must be registered");
  assert(byIdIndex !== -1, "Route /:id must be registered");
  assert(detailsIndex < byIdIndex, "Route /:id/details must be registered before /:id");
  console.log("✓ Route /:id/details is registered before /:id");
};

const run = async () => {
  console.log("Administrative Charge Details tests\n");

  verifyRouteOrder();

  let fixtures = null;

  try {
    await cleanup();
    fixtures = await setupFixtures();
    await testServiceLayer(fixtures);
    await testListWithHolders(fixtures);
    await testHttpLayer(fixtures);

    console.log("\nAll administrative charge details tests passed.");
  } finally {
    await cleanup();
    await pool.end();
  }
};

run().catch(async (error) => {
  console.error("FAILED:", error.message);
  try {
    await cleanup();
    await pool.end();
  } catch {
    // ignore cleanup errors on failure
  }
  process.exit(1);
});
