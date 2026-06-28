/**
 * Re-exports shared role constants for the Vite/ESM frontend.
 * Import via alias so Vite pre-bundles the CommonJS shared module for dev.
 * @see shared/constants/roles.js
 */
import sharedRoles from '@schoolerp/shared/roles'

export const ROLES = sharedRoles.ROLES
export const LEGACY_ROLES = sharedRoles.LEGACY_ROLES
export const LEGACY_TO_CANONICAL = sharedRoles.LEGACY_TO_CANONICAL
export const CANONICAL_TO_LEGACY = sharedRoles.CANONICAL_TO_LEGACY
export const ALL_ROLES = sharedRoles.ALL_ROLES
export const REGISTERABLE_LEGACY_ROLES = sharedRoles.REGISTERABLE_LEGACY_ROLES
export const ADMIN_LIKE_LEGACY_ROLES = sharedRoles.ADMIN_LIKE_LEGACY_ROLES
export const ADMIN_OR_SUPER_ADMIN_LEGACY_ROLES =
  sharedRoles.ADMIN_OR_SUPER_ADMIN_LEGACY_ROLES
export const TEACHER_OR_ADMIN_LIKE_LEGACY_ROLES =
  sharedRoles.TEACHER_OR_ADMIN_LIKE_LEGACY_ROLES
export const TEACHER_OR_ADMIN_LEGACY_ROLES =
  sharedRoles.TEACHER_OR_ADMIN_LEGACY_ROLES
export const normalizeRole = sharedRoles.normalizeRole
export const resolveLegacyRole = sharedRoles.resolveLegacyRole
export const isLegacyRole = sharedRoles.isLegacyRole
export const isCanonicalRole = sharedRoles.isCanonicalRole
export const hasCanonicalRole = sharedRoles.hasCanonicalRole
export const isAdminLikeLegacy = sharedRoles.isAdminLikeLegacy
export const isSuperAdminLegacy = sharedRoles.isSuperAdminLegacy
export const isTeacherLegacy = sharedRoles.isTeacherLegacy

export default sharedRoles
