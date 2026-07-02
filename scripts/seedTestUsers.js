#!/usr/bin/env node
/**
 * Seed one test account per RBAC role for local authorization testing.
 *
 * Usage (from backend directory):
 *   node scripts/seedTestUsers.js
 *
 * Usage (from repository root):
 *   node backend/scripts/seedTestUsers.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const bcrypt = require("bcrypt");
const pool = require("../db");
const { assertDevelopmentOnly } = require("./demoSchoolUtils");

const TEST_PASSWORD = "Password123@";
const BCRYPT_ROUNDS = 10;

const TEST_USERS = [
  {
    role: "super_admin",
    email: "superadmin@test.com",
    name: "Test Super Admin",
    schoolId: null,
  },
  {
    role: "dpo",
    email: "dpo@test.com",
    name: "Test DPO",
  },
  {
    role: "beo",
    email: "beo@test.com",
    name: "Test BEO",
  },
  {
    role: "principal",
    email: "principal@test.com",
    name: "Test Principal",
  },
  {
    role: "office_staff",
    email: "office@test.com",
    name: "Test Office Staff",
  },
  {
    role: "teacher",
    email: "teacher@test.com",
    name: "Test Teacher",
    linkTeacher: true,
  },
];

const resolveDefaultSchoolId = async (client) => {
  const result = await client.query(
    `
    SELECT id
    FROM schools
    ORDER BY id ASC
    LIMIT 1
    `
  );

  return result.rows[0]?.id ?? 1;
};

const findAvailableTeacherId = async (client, schoolId, existingUserId = null) => {
  const result = await client.query(
    `
    SELECT t.id
    FROM teachers t
    WHERE t.school_id = $1
      AND COALESCE(t.status, 'active') = 'active'
      AND NOT EXISTS (
        SELECT 1
        FROM users u
        WHERE u.teacher_id = t.id
          AND ($2::int IS NULL OR u.id <> $2)
      )
    ORDER BY t.id ASC
    LIMIT 1
    `,
    [schoolId, existingUserId]
  );

  return result.rows[0]?.id ?? null;
};

const upsertTestUser = async (client, userSpec, passwordHash, defaultSchoolId) => {
  const schoolId =
    userSpec.schoolId === null ? null : defaultSchoolId;

  const existing = await client.query(
    `
    SELECT id, role, school_id, teacher_id
    FROM users
    WHERE email = $1
  `,
    [userSpec.email]
  );

  let teacherId = null;

  if (userSpec.linkTeacher) {
    const existingUserId = existing.rows[0]?.id ?? null;
    teacherId =
      existing.rows[0]?.teacher_id ??
      (await findAvailableTeacherId(client, schoolId, existingUserId));
  }

  if (existing.rowCount > 0) {
    const userId = existing.rows[0].id;

    const result = await client.query(
      `
      UPDATE users
      SET
        name = $1,
        password = $2,
        role = $3,
        school_id = $4,
        teacher_id = COALESCE($5, teacher_id)
      WHERE id = $6
      RETURNING id, name, email, role, school_id, teacher_id
      `,
      [
        userSpec.name,
        passwordHash,
        userSpec.role,
        schoolId,
        teacherId,
        userId,
      ]
    );

    return {
      action: "updated",
      user: result.rows[0],
    };
  }

  const result = await client.query(
    `
    INSERT INTO users (name, email, password, role, school_id, teacher_id)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, name, email, role, school_id, teacher_id
    `,
    [
      userSpec.name,
      userSpec.email,
      passwordHash,
      userSpec.role,
      schoolId,
      teacherId,
    ]
  );

  return {
    action: "created",
    user: result.rows[0],
  };
};

const printSummary = (results, password) => {
  console.log("\nTest RBAC users ready:\n");
  console.log("Password for all accounts:", password);
  console.log("");

  for (const result of results) {
    const { user, action } = result;
    const teacherNote =
      user.teacher_id != null ? `teacher_id=${user.teacher_id}` : "teacher_id=null";

    console.log(
      [
        `- [${action}]`,
        user.role.padEnd(12),
        user.email.padEnd(22),
        `school_id=${user.school_id ?? "null"}`,
        teacherNote,
      ].join(" ")
    );
  }

  console.log("\nLogin with any email above and the shared password.");
};

const run = async () => {
  assertDevelopmentOnly();

  const passwordHash = await bcrypt.hash(TEST_PASSWORD, BCRYPT_ROUNDS);
  const client = await pool.connect();
  const results = [];

  try {
    await client.query("BEGIN");

    const defaultSchoolId = await resolveDefaultSchoolId(client);

    for (const userSpec of TEST_USERS) {
      const result = await upsertTestUser(
        client,
        userSpec,
        passwordHash,
        defaultSchoolId
      );
      results.push(result);
    }

    await client.query("COMMIT");
    printSummary(results, TEST_PASSWORD);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
};

run().catch((err) => {
  console.error("[seedTestUsers] Failed:", err.message);
  process.exit(1);
});
