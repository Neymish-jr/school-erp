#!/usr/bin/env node
/**
 * QA database bootstrap: migrations, demo school, RBAC test users.
 * Used by Playwright globalSetup and CI before E2E runs.
 *
 * Usage (from repo root):
 *   node backend/scripts/qaBootstrap.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { execSync } = require("child_process");
const path = require("path");

const backendDir = path.join(__dirname, "..");

const run = async () => {
  const pool = require("../db");
  const { runPendingMigrations } = require("../utils/migrationRunner");

  console.log("[qaBootstrap] Running pending migrations...");
  await runPendingMigrations(pool);

  const schoolCheck = await pool.query(`SELECT id FROM schools ORDER BY id ASC LIMIT 1`);
  await pool.end();

  if (schoolCheck.rowCount === 0) {
    console.log("[qaBootstrap] Seeding demo school...");
    execSync("node scripts/seedDemoSchool.js", {
      cwd: backendDir,
      stdio: "inherit",
      env: { ...process.env, NODE_ENV: process.env.NODE_ENV || "test" },
    });
  } else {
    console.log("[qaBootstrap] Demo school already present — skipping seedDemoSchool.js");
  }

  console.log("[qaBootstrap] Seeding RBAC test users...");
  execSync("node scripts/seedTestUsers.js", {
    cwd: backendDir,
    stdio: "inherit",
    env: { ...process.env, NODE_ENV: process.env.NODE_ENV || "test" },
  });

  console.log("[qaBootstrap] Database ready for QA.");
};

run().catch((err) => {
  console.error("[qaBootstrap] Failed:", err.message);
  process.exit(1);
});
