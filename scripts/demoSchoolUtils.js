#!/usr/bin/env node
/**
 * Development-only guard and helpers for demo school seed/clear scripts.
 */

const fs = require("fs");
const path = require("path");
const {
  DEMO_EMAIL_DOMAIN,
  DEMO_EMPLOYEE_PREFIX,
  DEMO_SCHOOL_NAME,
} = require("./demoSchoolFixtures");

const MANIFEST_PATH = path.join(__dirname, ".demo-school-manifest.json");

const assertDevelopmentOnly = () => {
  const nodeEnv = (process.env.NODE_ENV || "").toLowerCase();
  const allowDemoSeed = process.env.ALLOW_DEMO_SEED === "true";
  const dbHost = (process.env.DB_HOST || "").toLowerCase();

  if (nodeEnv === "production" && !allowDemoSeed) {
    throw new Error(
      "Refusing to run demo school scripts in production. Set ALLOW_DEMO_SEED=true only on local dev if you must override."
    );
  }

  const blockedHosts = ["prod", "production", "live"];
  if (
    blockedHosts.some((token) => dbHost.includes(token)) &&
    !allowDemoSeed
  ) {
    throw new Error(
      `Refusing to run demo school scripts against DB host "${process.env.DB_HOST}".`
    );
  }
};

const writeManifest = (manifest) => {
  fs.writeFileSync(
    MANIFEST_PATH,
    JSON.stringify(
      {
        ...manifest,
        school_name: DEMO_SCHOOL_NAME,
        seeded_at: new Date().toISOString(),
      },
      null,
      2
    ),
    "utf8"
  );
};

const readManifest = () => {
  if (!fs.existsSync(MANIFEST_PATH)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
};

const removeManifest = () => {
  if (fs.existsSync(MANIFEST_PATH)) {
    fs.unlinkSync(MANIFEST_PATH);
  }
};

const isDemoUserEmail = (email = "") =>
  String(email).toLowerCase().endsWith(DEMO_EMAIL_DOMAIN.toLowerCase());

const isDemoEmployeeCode = (code = "") =>
  String(code || "").startsWith(DEMO_EMPLOYEE_PREFIX);

const slugify = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");

module.exports = {
  MANIFEST_PATH,
  assertDevelopmentOnly,
  writeManifest,
  readManifest,
  removeManifest,
  isDemoUserEmail,
  isDemoEmployeeCode,
  slugify,
};
