const fs = require("fs");
const path = require("path");

const MIGRATIONS_DIR = path.join(__dirname, "..", "migrations");

/** Matches NNN_description.sql (e.g. 015_idx_taca_charge_school.sql, 021_rbac_schema.sql) */
const MIGRATION_FILENAME_PATTERN = /^(\d{3})_[A-Za-z0-9_.-]+\.sql$/;

const parseMigrationNumber = (filename) =>
  Number.parseInt(filename.slice(0, 3), 10);

const discoverMigrationFiles = () => {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    return [];
  }

  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((name) => MIGRATION_FILENAME_PATTERN.test(name))
    .sort(
      (left, right) =>
        parseMigrationNumber(left) - parseMigrationNumber(right)
    );
};

const ensureSchemaMigrationsTable = async (pool) => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
};

const getAppliedMigrations = async (pool) => {
  const result = await pool.query(
    "SELECT filename FROM schema_migrations ORDER BY filename"
  );
  return new Set(result.rows.map((row) => row.filename));
};

const isExistingInstall = async (pool) => {
  const result = await pool.query(`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'users'
    ) AS exists
  `);
  return result.rows[0]?.exists === true;
};

const legacyBudgetHeadsNeedMigration012 = async (pool) => {
  const result = await pool.query(`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'budget_heads'
        AND column_name = 'school_id'
    ) AS needs_migration
  `);
  return result.rows[0]?.needs_migration === true;
};

/**
 * Existing databases predating schema_migrations already received migrations
 * 001–020 via manual runs, test scripts, or hardcoded index.js hooks.
 * Mark them as applied so only newer files (e.g. 021+) execute.
 * Migration 012 is exempt when legacy budget_heads.school_id is still present.
 */
const bootstrapExistingDatabase = async (pool, migrationFiles) => {
  const legacy012Pending = await legacyBudgetHeadsNeedMigration012(pool);
  let marked = 0;

  for (const filename of migrationFiles) {
    const migrationNumber = parseMigrationNumber(filename);

    if (migrationNumber >= 21) {
      continue;
    }

    if (filename.startsWith("012_") && legacy012Pending) {
      continue;
    }

    const insert = await pool.query(
      `
      INSERT INTO schema_migrations (filename)
      VALUES ($1)
      ON CONFLICT (filename) DO NOTHING
      RETURNING filename
      `,
      [filename]
    );

    if (insert.rowCount > 0) {
      marked += 1;
    }
  }

  if (marked > 0) {
    console.log(
      `Migration bootstrap: marked ${marked} existing migration(s) as applied (001–020).`
    );
  }
};

const markMigrationApplied = async (client, filename) => {
  await client.query(
    `
    INSERT INTO schema_migrations (filename)
    VALUES ($1)
    ON CONFLICT (filename) DO NOTHING
    `,
    [filename]
  );
};

const applyMigrationFile = async (pool, filename) => {
  const migrationPath = path.join(MIGRATIONS_DIR, filename);
  const sql = fs.readFileSync(migrationPath, "utf8");
  const migrationNumber = parseMigrationNumber(filename);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(sql);
    await markMigrationApplied(client, filename);
    await client.query("COMMIT");
    console.log(`Migration ${migrationNumber} applied: ${filename}`);
  } catch (err) {
    await client.query("ROLLBACK");
    err.message = `Failed to apply migration ${filename}: ${err.message}`;
    throw err;
  } finally {
    client.release();
  }
};

const runPendingMigrations = async (pool) => {
  await ensureSchemaMigrationsTable(pool);

  const migrationFiles = discoverMigrationFiles();
  if (migrationFiles.length === 0) {
    return;
  }

  let applied = await getAppliedMigrations(pool);

  if (applied.size === 0 && (await isExistingInstall(pool))) {
    await bootstrapExistingDatabase(pool, migrationFiles);
    applied = await getAppliedMigrations(pool);
  }

  for (const filename of migrationFiles) {
    if (applied.has(filename)) {
      continue;
    }

    await applyMigrationFile(pool, filename);
  }
};

module.exports = {
  MIGRATION_FILENAME_PATTERN,
  discoverMigrationFiles,
  runPendingMigrations,
};
