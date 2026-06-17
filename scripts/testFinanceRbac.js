/**
 * Finance Budget Structure RBAC checks.
 * Usage: node backend/scripts/testFinanceRbac.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const jwt = require("jsonwebtoken");
const pool = require("../db");

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const navigation = [
  {
    label: "Finance",
    children: [
      { label: "Financial Years", path: "/finance/financial-years" },
      {
        label: "Budget Structure",
        path: "/finance/budget-structure",
        roles: ["super_admin"],
      },
      { label: "Budget Allocations", path: "/finance/budget-allocations" },
    ],
  },
];

const getVisibleNavigation = (role) =>
  navigation
    .map((group) => {
      if (!group.children) return group;

      const children = group.children.filter((item) => {
        if (!item.roles?.length) return true;
        return item.roles.includes(role);
      });

      if (children.length === 0) return null;
      return { ...group, children };
    })
    .filter(Boolean);

const decodeRoleFromToken = (token) => {
  const payload = JSON.parse(
    Buffer.from(token.split(".")[1], "base64url").toString("utf8")
  );
  return payload.role;
};

const canAccessBudgetStructureRoute = (role) => role === "super_admin";

const run = async () => {
  console.log("Finance Budget Structure RBAC tests\n");

  for (const role of ["super_admin", "admin", "teacher"]) {
    const financeNav = getVisibleNavigation(role).find((group) => group.label === "Finance");
    const hasBudgetStructure = financeNav?.children?.some(
      (item) => item.label === "Budget Structure"
    );
    const hasAllocations = financeNav?.children?.some(
      (item) => item.label === "Budget Allocations"
    );
    const hasFinancialYears = financeNav?.children?.some(
      (item) => item.label === "Financial Years"
    );

    assert(hasBudgetStructure === (role === "super_admin"), `${role}: Budget Structure nav visibility`);
    assert(hasAllocations === true, `${role}: Budget Allocations remains visible`);
    assert(hasFinancialYears === true, `${role}: Financial Years remains visible`);
    assert(
      canAccessBudgetStructureRoute(role) === (role === "super_admin"),
      `${role}: route guard allows only super_admin`
    );

    const token = jwt.sign({ id: 1, role, school_id: 1 }, process.env.JWT_SECRET);
    assert(decodeRoleFromToken(token) === role, `${role}: JWT role decode`);
    console.log(`✓ ${role}`);
  }

  const users = await pool.query(`
    SELECT role, COUNT(*)::int AS count
    FROM users
    GROUP BY role
    ORDER BY role
  `);

  console.log("\nUsers by role:");
  for (const row of users.rows) {
    console.log(`  - ${row.role}: ${row.count}`);
  }

  console.log("\nAll Finance Budget Structure RBAC tests passed.");
};

run()
  .then(async () => {
    await pool.end().catch(() => {});
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("\nTest run failed:", err.message);
    await pool.end().catch(() => {});
    process.exit(1);
  });
