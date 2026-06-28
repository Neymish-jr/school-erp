#!/usr/bin/env node
/**
 * Backfill users.teacher_id from legacy name-based matching.
 *
 * Usage:
 *   node backend/scripts/backfillUserTeacherLinks.js
 *   node backend/scripts/backfillUserTeacherLinks.js --dry-run
 *   node backend/scripts/backfillUserTeacherLinks.js --school-id=1
 *
 * Idempotent: skips users that already have teacher_id set.
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const pool = require("../db");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const schoolIdArg = args.find((arg) => arg.startsWith("--school-id="));
const schoolIdFilter = schoolIdArg ? Number(schoolIdArg.split("=")[1]) : null;

const stats = {
  linked: 0,
  skippedAlreadyLinked: 0,
  skippedNoMatch: 0,
  skippedAmbiguous: 0,
  skippedTeacherTaken: 0,
  errors: 0,
};

const findTeacherCandidates = async (client, userRow) => {
  const result = await client.query(
    `
    SELECT id, teacher_name, employee_code
    FROM teachers
    WHERE school_id = $1
      AND teacher_name ILIKE $2
    ORDER BY id ASC
    `,
    [userRow.school_id, userRow.name]
  );

  return result.rows;
};

const isTeacherAlreadyLinked = async (client, teacherId, excludeUserId) => {
  const result = await client.query(
    `
    SELECT id, name
    FROM users
    WHERE teacher_id = $1
      AND id <> $2
    LIMIT 1
    `,
    [teacherId, excludeUserId]
  );

  return result.rows[0] || null;
};

const backfillUser = async (client, userRow) => {
  if (userRow.teacher_id != null) {
    stats.skippedAlreadyLinked += 1;
    return;
  }

  const candidates = await findTeacherCandidates(client, userRow);

  if (candidates.length === 0) {
    stats.skippedNoMatch += 1;
    console.log(
      `[no-match] user ${userRow.id} (${userRow.name}) school ${userRow.school_id}`
    );
    return;
  }

  if (candidates.length > 1) {
    stats.skippedAmbiguous += 1;
    console.log(
      `[ambiguous] user ${userRow.id} (${userRow.name}) matches teachers: ${candidates
        .map((row) => `${row.id}:${row.teacher_name}`)
        .join(", ")}`
    );
    return;
  }

  const teacher = candidates[0];
  const existingUser = await isTeacherAlreadyLinked(client, teacher.id, userRow.id);

  if (existingUser) {
    stats.skippedTeacherTaken += 1;
    console.log(
      `[teacher-taken] teacher ${teacher.id} already linked to user ${existingUser.id} (${existingUser.name})`
    );
    return;
  }

  if (dryRun) {
    stats.linked += 1;
    console.log(
      `[dry-run] would link user ${userRow.id} (${userRow.name}) -> teacher ${teacher.id} (${teacher.teacher_name})`
    );
    return;
  }

  await client.query(
    `
    UPDATE users
    SET teacher_id = $1
    WHERE id = $2
      AND teacher_id IS NULL
    `,
    [teacher.id, userRow.id]
  );

  stats.linked += 1;
  console.log(
    `[linked] user ${userRow.id} (${userRow.name}) -> teacher ${teacher.id} (${teacher.teacher_name})`
  );
};

const run = async () => {
  const client = await pool.connect();

  try {
    const params = [];
    let schoolClause = "";

    if (schoolIdFilter != null) {
      params.push(schoolIdFilter);
      schoolClause = `AND u.school_id = $${params.length}`;
    }

    const usersResult = await client.query(
      `
      SELECT u.id, u.name, u.email, u.school_id, u.teacher_id
      FROM users u
      WHERE u.role = 'teacher'
      ${schoolClause}
      ORDER BY u.school_id ASC, u.id ASC
      `,
      params
    );

    console.log(
      `Backfill user↔teacher links (${dryRun ? "dry-run" : "live"}) — ${usersResult.rowCount} teacher users`
    );

    await client.query("BEGIN");

    for (const userRow of usersResult.rows) {
      try {
        await backfillUser(client, userRow);
      } catch (err) {
        stats.errors += 1;
        console.error(`[error] user ${userRow.id}:`, err.message);
      }
    }

    if (dryRun) {
      await client.query("ROLLBACK");
    } else {
      await client.query("COMMIT");
    }

    console.log("\nSummary:", stats);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
