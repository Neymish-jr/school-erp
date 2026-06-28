#!/usr/bin/env node
/**
 * Remove PM SHRI GIC GAJA demo school data — development only.
 *
 * Usage:
 *   node backend/scripts/clearDemoSchool.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const pool = require("../db");
const {
  DEMO_EMAIL_DOMAIN,
  DEMO_EMPLOYEE_PREFIX,
  DEMO_SCHOOL_NAME,
} = require("./demoSchoolFixtures");
const {
  assertDevelopmentOnly,
  readManifest,
  removeManifest,
} = require("./demoSchoolUtils");

const log = (message) => console.log(`[clear] ${message}`);

const resolveSchoolId = async (client) => {
  const manifest = readManifest();

  if (manifest?.school_id) {
    const check = await client.query(`SELECT id FROM schools WHERE id = $1`, [
      manifest.school_id,
    ]);

    if (check.rowCount > 0) {
      return manifest.school_id;
    }
  }

  const byName = await client.query(
    `SELECT id FROM schools WHERE school_name = $1`,
    [DEMO_SCHOOL_NAME]
  );

  if (byName.rowCount === 0) {
    return null;
  }

  return byName.rows[0].id;
};

const run = async () => {
  assertDevelopmentOnly();

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const schoolId = await resolveSchoolId(client);

    if (!schoolId) {
      log(`No demo school found (${DEMO_SCHOOL_NAME}). Nothing to clear.`);
      removeManifest();
      await client.query("COMMIT");
      return;
    }

    log(`Clearing demo school id ${schoolId}`);

    const teacherIdsResult = await client.query(
      `SELECT id FROM teachers WHERE school_id = $1 OR employee_code LIKE $2`,
      [schoolId, `${DEMO_EMPLOYEE_PREFIX}%`]
    );
    const teacherIds = teacherIdsResult.rows.map((row) => row.id);

    if (teacherIds.length > 0) {
      const tables = [
        ["teacher_subject_assignments", "teacher_id = ANY($1::int[])"],
        ["teacher_administrative_charge_assignments", "teacher_id = ANY($1::int[]) OR school_id = $2"],
        ["teacher_staff_post_assignments", "teacher_id = ANY($1::int[]) OR school_id = $2"],
        ["staff_service_history", "teacher_id = ANY($1::int[]) OR school_id = $2"],
        ["timetables", "teacher_id = ANY($1::int[])"],
      ];

      for (const [table, condition] of tables) {
        const exists = await client.query(
          `SELECT to_regclass($1) AS reg`,
          [`public.${table}`]
        );

        if (!exists.rows[0]?.reg) {
          continue;
        }

        const params =
          condition.includes("$2")
            ? [teacherIds, schoolId]
            : [teacherIds];

        const deleted = await client.query(
          `DELETE FROM ${table} WHERE ${condition}`,
          params
        );
        log(`${table}: ${deleted.rowCount}`);
      }
    }

    const usersDeleted = await client.query(
      `
      DELETE FROM users
      WHERE school_id = $1
         OR email ILIKE $2
         OR teacher_id = ANY($3::int[])
      `,
      [schoolId, `%${DEMO_EMAIL_DOMAIN}`, teacherIds.length ? teacherIds : [0]]
    );
    log(`users: ${usersDeleted.rowCount}`);

    const teachersDeleted = await client.query(
      `
      DELETE FROM teachers
      WHERE school_id = $1
         OR employee_code LIKE $2
      `,
      [schoolId, `${DEMO_EMPLOYEE_PREFIX}%`]
    );
    log(`teachers: ${teachersDeleted.rowCount}`);

    const chargesDeleted = await client.query(
      `DELETE FROM administrative_charges WHERE school_id = $1`,
      [schoolId]
    );
    log(`administrative_charges: ${chargesDeleted.rowCount}`);

    const postsDeleted = await client.query(
      `DELETE FROM staff_posts WHERE school_id = $1 OR post_code LIKE $2`,
      [schoolId, `${DEMO_EMPLOYEE_PREFIX}%`]
    );
    log(`staff_posts: ${postsDeleted.rowCount}`);

    const schoolDeleted = await client.query(
      `DELETE FROM schools WHERE id = $1`,
      [schoolId]
    );
    log(`schools: ${schoolDeleted.rowCount}`);

    await client.query("COMMIT");
    removeManifest();
    log("Demo school cleared.");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
};

run().catch((err) => {
  console.error("[clear] Failed:", err.message);
  process.exit(1);
});
