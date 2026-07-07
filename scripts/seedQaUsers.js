#!/usr/bin/env node
/**
 * Seed permanent QA accounts for Playwright and local E2E runs.
 *
 * Usage (from repository root):
 *   node backend/scripts/seedQaUsers.js
 *
 * Usage (from backend directory):
 *   node scripts/seedQaUsers.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const bcrypt = require("bcrypt");
const pool = require("../db");
const { ROLES } = require("../constants/roles");
const { assertDevelopmentOnly } = require("./demoSchoolUtils");

const QA_PASSWORD = "Password@123";
const BCRYPT_ROUNDS = 10;

const QA_USERS = [
  {
    label: "Super Admin",
    role: ROLES.SUPER_ADMIN,
    email: "qa.superadmin@schoolerp.local",
    name: "QA Super Admin",
    schoolId: null,
  },
  {
    label: "DPO",
    role: ROLES.DPO,
    email: "qa.dpo@schoolerp.local",
    name: "QA DPO",
  },
  {
    label: "BEO",
    role: ROLES.BEO,
    email: "qa.beo@schoolerp.local",
    name: "QA BEO",
  },
  {
    label: "Principal",
    role: ROLES.PRINCIPAL,
    email: "qa.principal@schoolerp.local",
    name: "QA Principal",
  },
  {
    label: "Office Staff",
    role: ROLES.OFFICE_STAFF,
    email: "qa.office@schoolerp.local",
    name: "QA Office Staff",
  },
  {
    label: "Teacher",
    role: ROLES.TEACHER,
    email: "qa.teacher@schoolerp.local",
    name: "QA Teacher",
    linkTeacher: true,
  },
];

const hashPassword = (password) => bcrypt.hash(password, BCRYPT_ROUNDS);

const resolveDemoSchool = async (client) => {
  const result = await client.query(
    `
    SELECT id, school_name
    FROM schools
    ORDER BY id ASC
    LIMIT 1
    `
  );

  return result.rows[0] ?? null;
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

const upsertQaUser = async (client, userSpec, passwordHash, defaultSchoolId) => {
  const schoolId = userSpec.schoolId === null ? null : defaultSchoolId;

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
      [userSpec.name, passwordHash, userSpec.role, schoolId, teacherId, userId]
    );

    return {
      action: "updated",
      label: userSpec.label,
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
    label: userSpec.label,
    user: result.rows[0],
  };
};

const printSummary = (results, school, password) => {
  console.log("\nQA users ready:\n");

  for (const result of results) {
    console.log(`✓ ${result.label}`);
  }

  console.log("\nDetails:\n");
  console.log(`School: ${school.school_name} (id ${school.id})`);
  console.log(`Password (all accounts): ${password}\n`);

  for (const result of results) {
    const { user, action, label } = result;
    const teacherNote =
      user.teacher_id != null ? `teacher_id=${user.teacher_id}` : "teacher_id=null";

    console.log(
      [
        `  [${action}]`,
        label.padEnd(14),
        user.email.padEnd(32),
        `school_id=${user.school_id ?? "null"}`,
        teacherNote,
      ].join(" ")
    );
  }

  console.log("\nCopy credentials into .env.playwright (see .env.playwright.example).");
};

const run = async () => {
  assertDevelopmentOnly();

  const client = await pool.connect();

  try {
    const school = await resolveDemoSchool(client);

    if (!school) {
      console.error("[seedQaUsers] No school found in the database.");
      console.error("");
      console.error("Seed a demo school first, then re-run this script:");
      console.error("  node backend/scripts/seedDemoSchool.js");
      console.error("  node backend/scripts/seedQaUsers.js");
      console.error("");
      console.error("No QA users were created.");
      process.exit(1);
    }

    const passwordHash = await hashPassword(QA_PASSWORD);
    const results = [];

    await client.query("BEGIN");

    for (const userSpec of QA_USERS) {
      const result = await upsertQaUser(client, userSpec, passwordHash, school.id);
      results.push(result);
    }

    await client.query("COMMIT");
    printSummary(results, school, QA_PASSWORD);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
};

run().catch((err) => {
  console.error("[seedQaUsers] Failed:", err.message);
  process.exit(1);
});
