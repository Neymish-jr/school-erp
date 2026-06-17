/**
 * RBAC tests for Cashbook V2 access middleware.
 * Usage: node backend/scripts/testCashbookRbac.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { isAdminOrSuperAdmin } = require("../middleware/auth");

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const runMiddleware = (role) =>
  new Promise((resolve) => {
    const req = { user: { role } };
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      send(message) {
        resolve({ statusCode: this.statusCode, message });
      },
    };

    isAdminOrSuperAdmin(req, res, () => {
      resolve({ statusCode: 200, message: "next" });
    });
  });

const run = async () => {
  console.log("Cashbook V2 RBAC tests\n");

  const teacherResult = await runMiddleware("teacher");
  assert(teacherResult.statusCode === 403, "Teacher should be denied");
  console.log("✓ Teacher access denied");

  const adminResult = await runMiddleware("admin");
  assert(adminResult.statusCode === 200, "Admin should be allowed");
  console.log("✓ Admin access allowed");

  const superAdminResult = await runMiddleware("super_admin");
  assert(superAdminResult.statusCode === 200, "Super admin should be allowed");
  console.log("✓ Super admin access allowed");

  console.log("\nAll Cashbook V2 RBAC tests passed.");
};

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\nTest run failed:", err.message);
    process.exit(1);
  });
