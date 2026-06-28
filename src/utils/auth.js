import {
  ADMIN_LIKE_LEGACY_ROLES,
  isAdminLikeLegacy,
  isSuperAdminLegacy,
  isTeacherLegacy,
  normalizeRole,
} from "../constants/roles";

export const decodeAuthToken = () => {
  try {
    const token = localStorage.getItem("token");
    if (!token) return {};

    const [, payload] = token.split(".");
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(normalized)) || {};
  } catch {
    return {};
  }
};

/** Legacy JWT role slug (users.role value at login). */
export const getAuthRole = () => decodeAuthToken().role || null;

/** Canonical RBAC role slug (maps admin → principal, etc.). */
export const getCanonicalRole = () => normalizeRole(getAuthRole());

export const isSuperAdmin = () => isSuperAdminLegacy(getAuthRole());

export const isAdminLike = () => isAdminLikeLegacy(getAuthRole());

export const isTeacher = () => isTeacherLegacy(getAuthRole());

export const canAccessNavItem = (item, role = getAuthRole()) => {
  if (!item?.roles?.length) return true;
  return item.roles.includes(role);
};

export { ADMIN_LIKE_LEGACY_ROLES, normalizeRole };
