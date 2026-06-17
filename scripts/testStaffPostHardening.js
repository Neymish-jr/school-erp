/**
 * Verify Staff Post Module Hardening Sprint changes.
 * Usage: node backend/scripts/testStaffPostHardening.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const fs = require("fs");
const path = require("path");
const { staffPostSchema } = require("../validators/staffPostValidator");
const { validateRequest } = require("../middleware/validation");
const { isAdminLike } = require("../middleware/auth");

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const routesPath = path.join(__dirname, "..", "routes", "staffPostRoutes.js");
const routesContent = fs.readFileSync(routesPath, "utf8");

const runMiddleware = (middleware, role) =>
  new Promise((resolve) => {
    const req = { user: { role, school_id: 1 }, body: {} };
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      send(message) {
        resolve({ statusCode: this.statusCode, message });
      },
      json(payload) {
        resolve({ statusCode: this.statusCode, payload });
      },
    };

    middleware(req, res, () => {
      resolve({ statusCode: 200, message: "next" });
    });
  });

const validPayload = {
  post_name: "Principal",
  post_code: "prin-01",
  staff_category: "Administrative",
  appointment_nature: "Permanent",
  sanctioned_count: 1,
};

const run = async () => {
  console.log("Staff Post Module Hardening tests\n");

  assert(staffPostSchema, "staffPostSchema must be exported");
  console.log("✓ staffPostSchema is defined");

  const { error, value } = staffPostSchema.validate(validPayload);
  assert(!error, `Valid payload should pass: ${error?.message}`);
  assert(value.post_code === "PRIN-01", "post_code should be uppercased");
  console.log("✓ Joi schema validates create/update payload");

  const invalid = staffPostSchema.validate({
    post_name: "",
    post_code: "",
    staff_category: "Invalid",
    appointment_nature: "Invalid",
    sanctioned_count: -1,
  });
  assert(invalid.error, "Invalid payload must fail validation");
  console.log("✓ Joi schema rejects invalid payload");

  const validateMiddleware = validateRequest(staffPostSchema);
  const passResult = await new Promise((resolve) => {
    const req = { body: validPayload };
    validateMiddleware(req, { status: (code) => ({ json: (payload) => resolve({ code, payload }) }) }, () => {
      resolve({ code: 200, payload: "next" });
    });
  });
  assert(passResult.code === 200 || passResult.payload === "next", "validateRequest must call next for valid body");
  console.log("✓ validateRequest middleware works with staffPostSchema");

  require("../routes/staffPostRoutes");
  console.log("✓ staffPostRoutes loads without import errors");

  assert(
    routesContent.includes("validateRequest(staffPostSchema)"),
    "Routes must use validateRequest(staffPostSchema)"
  );
  assert(routesContent.includes("isAdminLike"), "RBAC must remain isAdminLike");
  assert(routesContent.includes("authenticate"), "Routes must remain authenticated");
  console.log("✓ Route wiring and RBAC unchanged");

  for (const role of ["admin", "super_admin"]) {
    const result = await runMiddleware(isAdminLike, role);
    assert(result.statusCode === 200, `isAdminLike should allow ${role}`);
  }
  const teacherResult = await runMiddleware(isAdminLike, "teacher");
  assert(teacherResult.statusCode === 403, "isAdminLike should deny teacher");
  console.log("✓ RBAC allows admin/super_admin and denies teacher");

  console.log("\nAll staff post hardening checks passed.");
};

run().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
