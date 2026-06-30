const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const matrixPath = path.join(ROOT, 'docs/ROLE_PERMISSION_MATRIX.md');
const outPath = path.join(ROOT, 'backend/migrations/023_seed_role_permissions.sql');

const CHECK = '\u2713';
const ROLES = [
  ['super_admin', 4],
  ['dpo', 5],
  ['beo', 6],
  ['principal', 7],
  ['office_staff', 8],
  ['teacher', 9],
];
const EXPECTED = {
  super_admin: 167,
  dpo: 56,
  beo: 56,
  principal: 116,
  office_staff: 51,
  teacher: 36,
};

const text = fs.readFileSync(matrixPath, 'utf8');
const grants = Object.fromEntries(ROLES.map(([r]) => [r, []]));

for (const line of text.split('\n')) {
  if (!/^\| \d+ \|/.test(line)) continue;
  const parts = line.split('|').map((p) => p.trim());
  if (parts.length < 10) continue;
  const key = parts[2].replace(/^`|`$/g, '');
  if (!key.includes('.')) continue;
  for (const [role, idx] of ROLES) {
    if (parts[idx] === CHECK) grants[role].push(key);
  }
}

const roleOrder = Object.fromEntries(ROLES.map(([r], i) => [r, i]));
const rows = [];
for (const [role] of ROLES) {
  for (const key of grants[role]) rows.push([role, key]);
}
rows.sort((a, b) => roleOrder[a[0]] - roleOrder[b[0]] || a[1].localeCompare(b[1]));

for (const [role] of ROLES) {
  const n = grants[role].length;
  if (n !== EXPECTED[role]) {
    console.error(`${role}: got ${n}, expected ${EXPECTED[role]}`);
    process.exit(1);
  }
}

const valueLines = rows.map(
  ([role, key]) => `    ('${role}', '${key.replace(/'/g, "''")}')`
);

const sql = `-- RBAC: Seed baseline role_permissions from docs/ROLE_PERMISSION_MATRIX.md (v1)
-- Prerequisite: 022_seed_permissions.sql (permissions catalog)
-- Idempotent: INSERT ... SELECT ... WHERE NOT EXISTS on (role_code, permission_id)
-- Does not seed administrative_charge_permissions or user_permission_overrides

INSERT INTO role_permissions (role_code, permission_id)
SELECT seed.role_code, p.id
FROM (
    VALUES
${valueLines.join(',\n')}
) AS seed(role_code, permission_key)
INNER JOIN permissions p ON p.permission_key = seed.permission_key
WHERE NOT EXISTS (
    SELECT 1
    FROM role_permissions rp
    WHERE rp.role_code = seed.role_code
      AND rp.permission_id = p.id
);
`;

fs.writeFileSync(outPath, sql, 'utf8');
console.log(`Wrote ${rows.length} rows`);
for (const [role] of ROLES) console.log(`  ${role}: ${grants[role].length}`);
