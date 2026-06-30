const pool = require("../db");
const { normalizeRole } = require("../constants/roles");

const CACHE_TTL_MS = 5 * 60 * 1000;

/** @type {Map<string, { expiresAt: number, value: object }>} */
const permissionCache = new Map();

const buildCacheKey = (userId, schoolId) =>
  `${userId}-${schoolId == null ? "null" : schoolId}`;

const readCache = (cacheKey) => {
  const entry = permissionCache.get(cacheKey);

  if (!entry) {
    return null;
  }

  if (Date.now() >= entry.expiresAt) {
    permissionCache.delete(cacheKey);
    return null;
  }

  return entry.value;
};

const writeCache = (cacheKey, value) => {
  permissionCache.set(cacheKey, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    value,
  });
};

/**
 * Load the user's persisted role and teacher link used for charge resolution.
 */
const loadUserContext = async (userId) => {
  const result = await pool.query(
    `
    SELECT id, role, school_id, teacher_id
    FROM users
    WHERE id = $1
    `,
    [userId]
  );

  if (result.rowCount === 0) {
    throw new Error(`User not found: ${userId}`);
  }

  return result.rows[0];
};

/**
 * Baseline permissions granted by the user's normalized role code.
 */
const loadRolePermissionKeys = async (roleCode) => {
  const result = await pool.query(
    `
    SELECT p.permission_key
    FROM role_permissions rp
    INNER JOIN permissions p ON p.id = rp.permission_id
    WHERE rp.role_code = $1
      AND p.is_active = true
    `,
    [roleCode]
  );

  return result.rows.map((row) => row.permission_key);
};

/**
 * Active administrative charge assignments for a teacher within a school.
 */
const loadActiveAdministrativeCharges = async (teacherId, schoolId) => {
  if (teacherId == null || schoolId == null) {
    return [];
  }

  const result = await pool.query(
    `
    SELECT
      ac.id,
      ac.charge_code,
      ac.charge_name,
      taca.id AS assignment_id
    FROM teacher_administrative_charge_assignments taca
    INNER JOIN administrative_charges ac ON ac.id = taca.administrative_charge_id
    WHERE taca.teacher_id = $1
      AND taca.school_id = $2
      AND taca.is_active = true
      AND taca.relieved_on IS NULL
    ORDER BY ac.charge_name ASC
    `,
    [teacherId, schoolId]
  );

  return result.rows;
};

/**
 * Additive permissions granted by active administrative charge assignments.
 */
const loadChargePermissionKeys = async (teacherId, schoolId) => {
  if (teacherId == null || schoolId == null) {
    return [];
  }

  const result = await pool.query(
    `
    SELECT DISTINCT p.permission_key
    FROM teacher_administrative_charge_assignments taca
    INNER JOIN administrative_charge_permissions acp
      ON acp.administrative_charge_id = taca.administrative_charge_id
    INNER JOIN permissions p ON p.id = acp.permission_id
    WHERE taca.teacher_id = $1
      AND taca.school_id = $2
      AND taca.is_active = true
      AND taca.relieved_on IS NULL
      AND p.is_active = true
    `,
    [teacherId, schoolId]
  );

  return result.rows.map((row) => row.permission_key);
};

/**
 * Active user-specific grants/denies scoped to the requested school context.
 *
 * Global overrides (school_id IS NULL) apply everywhere.
 * School-specific overrides apply only when schoolId matches.
 */
const loadActiveUserOverrides = async (userId, schoolId) => {
  const result = await pool.query(
    `
    SELECT
      upo.id,
      upo.effect,
      upo.school_id,
      upo.expires_at,
      p.permission_key
    FROM user_permission_overrides upo
    INNER JOIN permissions p ON p.id = upo.permission_id
    WHERE upo.user_id = $1
      AND upo.revoked_at IS NULL
      AND (upo.expires_at IS NULL OR upo.expires_at > NOW())
      AND (upo.school_id IS NULL OR upo.school_id = $2)
      AND p.is_active = true
    ORDER BY upo.created_at ASC
    `,
    [userId, schoolId]
  );

  return result.rows;
};

/**
 * Merge role + charge permissions, then apply grant/deny overrides.
 * Deny always wins over any prior grant source.
 */
const mergeEffectivePermissions = ({
  rolePermissionKeys,
  chargePermissionKeys,
  overrides,
}) => {
  const permissions = new Set(rolePermissionKeys);

  for (const permissionKey of chargePermissionKeys) {
    permissions.add(permissionKey);
  }

  for (const override of overrides) {
    if (override.effect === "grant") {
      permissions.add(override.permission_key);
      continue;
    }

    if (override.effect === "deny") {
      permissions.delete(override.permission_key);
    }
  }

  return permissions;
};

const formatOverridesApplied = (overrides) =>
  overrides.map((override) => ({
    id: override.id,
    permission_key: override.permission_key,
    effect: override.effect,
    school_id: override.school_id,
    expires_at: override.expires_at,
  }));

/**
 * Resolve the school context used for permission checks.
 * When callers omit schoolId, fall back to the user's persisted school_id.
 */
const resolveSchoolContext = async (userId, schoolId) => {
  if (schoolId != null) {
    return { schoolId, user: null };
  }

  const user = await loadUserContext(userId);

  return {
    schoolId: user.school_id ?? null,
    user,
  };
};

/**
 * Resolve the effective permission set for a user within a school context.
 *
 * @param {number} userId
 * @param {number|null} schoolId
 * @returns {Promise<{
 *   permissions: Set<string>,
 *   role: string,
 *   administrativeCharges: object[],
 *   overridesApplied: object[]
 * }>}
 */
const getEffectivePermissions = async (userId, schoolId) => {
  const { schoolId: resolvedSchoolId, user: prefetchedUser } =
    await resolveSchoolContext(userId, schoolId);
  const cacheKey = buildCacheKey(userId, resolvedSchoolId);
  const cached = readCache(cacheKey);

  if (cached) {
    return {
      permissions: new Set(cached.permissions),
      role: cached.role,
      administrativeCharges: cached.administrativeCharges,
      overridesApplied: cached.overridesApplied,
    };
  }

  const user = prefetchedUser ?? (await loadUserContext(userId));
  const roleCode = normalizeRole(user.role) || user.role;

  const [
    rolePermissionKeys,
    administrativeCharges,
    chargePermissionKeys,
    overrides,
  ] = await Promise.all([
    loadRolePermissionKeys(roleCode),
    loadActiveAdministrativeCharges(user.teacher_id, resolvedSchoolId),
    loadChargePermissionKeys(user.teacher_id, resolvedSchoolId),
    loadActiveUserOverrides(userId, resolvedSchoolId),
  ]);

  const permissions = mergeEffectivePermissions({
    rolePermissionKeys,
    chargePermissionKeys,
    overrides,
  });

  const result = {
    permissions,
    role: roleCode,
    administrativeCharges,
    overridesApplied: formatOverridesApplied(overrides),
  };

  writeCache(cacheKey, {
    permissions: [...permissions],
    role: result.role,
    administrativeCharges: result.administrativeCharges,
    overridesApplied: result.overridesApplied,
  });

  return result;
};

/**
 * Check whether a user holds a single permission key in the given school context.
 *
 * @param {number} userId
 * @param {string} permissionKey
 * @param {number|null} schoolId
 * @returns {Promise<boolean>}
 */
const hasPermission = async (userId, permissionKey, schoolId) => {
  const { permissions } = await getEffectivePermissions(userId, schoolId);
  return permissions.has(permissionKey);
};

/**
 * Check whether a user holds at least one of the given permission keys.
 *
 * @param {number} userId
 * @param {string[]} permissionKeys
 * @param {number|null|undefined} schoolId
 * @returns {Promise<boolean>}
 */
const hasAnyPermission = async (userId, permissionKeys, schoolId) => {
  const { permissions } = await getEffectivePermissions(userId, schoolId);
  return permissionKeys.some((permissionKey) => permissions.has(permissionKey));
};

/**
 * Check whether a user holds every given permission key.
 *
 * @param {number} userId
 * @param {string[]} permissionKeys
 * @param {number|null|undefined} schoolId
 * @returns {Promise<boolean>}
 */
const hasAllPermissions = async (userId, permissionKeys, schoolId) => {
  const { permissions } = await getEffectivePermissions(userId, schoolId);
  return permissionKeys.every((permissionKey) => permissions.has(permissionKey));
};

/**
 * Drop cached permission resolution for a user across all school contexts.
 *
 * @param {number} userId
 */
const invalidatePermissionCache = (userId) => {
  const prefix = `${userId}-`;

  for (const cacheKey of permissionCache.keys()) {
    if (cacheKey.startsWith(prefix)) {
      permissionCache.delete(cacheKey);
    }
  }
};

module.exports = {
  getEffectivePermissions,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  invalidatePermissionCache,
};
