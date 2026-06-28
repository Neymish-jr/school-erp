#!/usr/bin/env node
/**
 * Phase 0 teacher identity tests.
 * Usage: node backend/scripts/testTeacherIdentity.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const { buildJwtPayload } = require("../utils/teacherIdentity");
const teacherIdentityService = require("../services/teacherIdentityService");

const TEST_PREFIX = "TEST_TID_";
const SCHOOL_ID = 1;

const created = {
  teacherIds: [],
  userIds: [],
};

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const runMigration = async () => {
  const migrationPath = path.join(
    __dirname,
    "..",
    "migrations",
    "016_teacher_identity_hardening.sql"
  );
  const sql = fs.readFileSync(migrationPath, "utf8");
  await pool.query(sql);
};

const cleanup = async () => {
  if (created.userIds.length > 0) {
    await pool.query(
      `UPDATE users SET teacher_id = NULL WHERE id = ANY($1::int[])`,
      [created.userIds]
    );
    await pool.query(`DELETE FROM users WHERE id = ANY($1::int[])`, [
      created.userIds,
    ]);
  }

  if (created.teacherIds.length > 0) {
    await pool.query(`DELETE FROM teachers WHERE id = ANY($1::int[])`, [
      created.teacherIds,
    ]);
  }
};

const createTeacher = async (suffix) => {
  const result = await pool.query(
    `
    INSERT INTO teachers (
      teacher_name,
      designation,
      phone,
      age,
      gender,
      school_id,
      status,
      employee_code
    )
    VALUES ($1, 'TGT', '9876543210', 30, 'Male', $2, 'active', $3)
    RETURNING id, teacher_name, employee_code
    `,
    [`${TEST_PREFIX}Teacher ${suffix}`, SCHOOL_ID, `${TEST_PREFIX}${suffix}`]
  );

  created.teacherIds.push(result.rows[0].id);
  return result.rows[0];
};

const createTeacherUser = async (name, teacherId = null) => {
  const result = await pool.query(
    `
    INSERT INTO users (name, email, password, role, school_id, teacher_id)
    VALUES ($1, $2, 'hashed', 'teacher', $3, $4)
    RETURNING id, name, role, school_id, teacher_id
    `,
    [
      name,
      `${TEST_PREFIX}${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`,
      SCHOOL_ID,
      teacherId,
    ]
  );

  created.userIds.push(result.rows[0].id);
  return result.rows[0];
};

const getAdminScope = async () => {
  const result = await pool.query(
    `
    SELECT id, role, school_id
    FROM users
    WHERE role IN ('admin', 'super_admin')
      AND school_id = $1
    ORDER BY id ASC
    LIMIT 1
    `,
    [SCHOOL_ID]
  );

  assert(result.rowCount > 0, "No admin user found for school 1");
  return {
    role: result.rows[0].role,
    schoolId: result.rows[0].school_id,
  };
};

const testSchema = async () => {
  const userColumn = await pool.query(
    `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'teacher_id'
    `
  );
  const teacherColumn = await pool.query(
    `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'teachers' AND column_name = 'employee_code'
    `
  );

  assert(userColumn.rowCount === 1, "users.teacher_id column missing");
  assert(teacherColumn.rowCount === 1, "teachers.employee_code column missing");
  console.log("✓ schema columns present");
};

const testJwtPayload = async () => {
  const linkedUser = await createTeacherUser(`${TEST_PREFIX}JWT Linked`, null);
  const teacher = await createTeacher("jwt");
  await pool.query(`UPDATE users SET teacher_id = $1 WHERE id = $2`, [
    teacher.id,
    linkedUser.id,
  ]);

  const refreshed = await pool.query(
    `SELECT id, role, school_id, teacher_id FROM users WHERE id = $1`,
    [linkedUser.id]
  );

  const payload = buildJwtPayload(refreshed.rows[0]);
  assert(Object.prototype.hasOwnProperty.call(payload, "teacher_id"), "JWT payload must always include teacher_id");
  assert(payload.teacher_id === teacher.id, "JWT teacher_id should match FK");

  const adminResult = await pool.query(
    `SELECT id, role, school_id, teacher_id FROM users WHERE role = 'admin' AND school_id = $1 LIMIT 1`,
    [SCHOOL_ID]
  );
  const adminPayload = buildJwtPayload(adminResult.rows[0]);
  assert(adminPayload.teacher_id === null, "Non-teacher JWT teacher_id should be null");
  console.log("✓ JWT payload always includes teacher_id");
};

const testLinkUnlinkService = async () => {
  const scope = await getAdminScope();
  const teacher = await createTeacher("link");
  const user = await createTeacherUser(`${TEST_PREFIX}Link User`);

  const linked = await teacherIdentityService.linkUserToTeacher(
    user.id,
    teacher.id,
    scope
  );
  assert(linked.is_linked === true, "Link should succeed");
  assert(linked.teacher_id === teacher.id, "Linked teacher_id mismatch");

  const fetched = await teacherIdentityService.getTeacherLinkForUser(
    user.id,
    scope
  );
  assert(fetched.is_linked === true, "Fetched link should be active");

  const unlinked = await teacherIdentityService.unlinkUserFromTeacher(
    user.id,
    scope
  );
  assert(unlinked.is_linked === false, "Unlink should clear link");
  console.log("✓ link/unlink service");
};

const testDuplicateLinkRejected = async () => {
  const scope = await getAdminScope();
  const teacher = await createTeacher("dup");
  const userA = await createTeacherUser(`${TEST_PREFIX}Dup A`);
  const userB = await createTeacherUser(`${TEST_PREFIX}Dup B`);

  await teacherIdentityService.linkUserToTeacher(userA.id, teacher.id, scope);

  let rejected = false;
  try {
    await teacherIdentityService.linkUserToTeacher(userB.id, teacher.id, scope);
  } catch (err) {
    rejected = err.statusCode === 409;
  }

  assert(rejected, "Duplicate teacher link should be rejected with 409");
  console.log("✓ duplicate teacher link rejected");
};

const testLoginTokenShape = async () => {
  const teacher = await createTeacher("login");
  const user = await createTeacherUser(`${TEST_PREFIX}Login User`, teacher.id);

  const row = await pool.query(
    `SELECT id, role, school_id, teacher_id FROM users WHERE id = $1`,
    [user.id]
  );

  const token = jwt.sign(
    buildJwtPayload(row.rows[0]),
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  assert(decoded.teacher_id === teacher.id, "Login token should carry teacher_id FK");
  console.log("✓ login token carries teacher_id");
};

const main = async () => {
  try {
    await runMigration();
    await testSchema();
    await testJwtPayload();
    await testLinkUnlinkService();
    await testDuplicateLinkRejected();
    await testLoginTokenShape();
    console.log("\nAll teacher identity tests passed.");
  } finally {
    await cleanup();
    await pool.end();
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
