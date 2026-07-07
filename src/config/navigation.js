import { ROLES, normalizeRole } from "../constants/roles";
import teacherNavigation from "./teacherNavigation";
import principalNavigation from "./principalNavigation";
import officeStaffNavigation from "./officeStaffNavigation";
import dpoNavigation from "./dpoNavigation";
import beoNavigation from "./beoNavigation";
import superAdminNavigation from "./superAdminNavigation";
import {
  academicsNavigationSection,
  createFinanceNavigationSection,
  helpSupportNavigationSection,
  resourcesNavigationSection,
  staffNavigationSection,
} from "./operationalNavigationSections";

const navigation = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: "mdi:view-dashboard",
    permissions: ["dashboard.summary.read"],
  },
  academicsNavigationSection,
  staffNavigationSection,
  createFinanceNavigationSection(),
  resourcesNavigationSection,
  helpSupportNavigationSection,
];

export const itemIsVisible = (item, { canAny, canAll, role }) => {
  if (item.roles?.length && !item.roles.includes(role)) {
    return false;
  }

  if (!item.permissions?.length) {
    return true;
  }

  if (item.permissionMode === "all") {
    return canAll(item.permissions);
  }

  return canAny(item.permissions);
};

export const isTeacherNavigationRole = (legacyRole, canonicalRole) =>
  canonicalRole === ROLES.TEACHER || normalizeRole(legacyRole) === ROLES.TEACHER;

export const isPrincipalNavigationRole = (legacyRole, canonicalRole) =>
  canonicalRole === ROLES.PRINCIPAL || normalizeRole(legacyRole) === ROLES.PRINCIPAL;

export const isOfficeStaffNavigationRole = (legacyRole, canonicalRole) =>
  canonicalRole === ROLES.OFFICE_STAFF || normalizeRole(legacyRole) === ROLES.OFFICE_STAFF;

export const isDpoNavigationRole = (legacyRole, canonicalRole) =>
  canonicalRole === ROLES.DPO || normalizeRole(legacyRole) === ROLES.DPO;

export const isBeoNavigationRole = (legacyRole, canonicalRole) =>
  canonicalRole === ROLES.BEO || normalizeRole(legacyRole) === ROLES.BEO;

export const isSuperAdminNavigationRole = (legacyRole, canonicalRole) =>
  canonicalRole === ROLES.SUPER_ADMIN || normalizeRole(legacyRole) === ROLES.SUPER_ADMIN;

const filterNavigationTree = (tree, context) =>
  tree
    .map((group) => {
      if (!group.children) {
        return itemIsVisible(group, context) ? group : null;
      }

      const children = group.children.filter((item) => itemIsVisible(item, context));

      if (children.length === 0) {
        return null;
      }

      return { ...group, children };
    })
    .filter(Boolean);

export const getVisibleNavigation = (legacyRole, canAny, canAll, canonicalRole = null) => {
  const context = { canAny, canAll, role: legacyRole };
  let source = navigation;

  if (isTeacherNavigationRole(legacyRole, canonicalRole)) {
    source = teacherNavigation;
  } else if (isPrincipalNavigationRole(legacyRole, canonicalRole)) {
    source = principalNavigation;
  } else if (isOfficeStaffNavigationRole(legacyRole, canonicalRole)) {
    source = officeStaffNavigation;
  } else if (isDpoNavigationRole(legacyRole, canonicalRole)) {
    source = dpoNavigation;
  } else if (isBeoNavigationRole(legacyRole, canonicalRole)) {
    source = beoNavigation;
  } else if (isSuperAdminNavigationRole(legacyRole, canonicalRole)) {
    source = superAdminNavigation;
  }

  return filterNavigationTree(source, context);
};

export default navigation;
