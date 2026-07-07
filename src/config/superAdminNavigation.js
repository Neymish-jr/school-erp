import {
  academicsNavigationSection,
  createFinanceNavigationSection,
  resourcesNavigationSection,
  staffNavigationSection,
} from "./operationalNavigationSections";

/**
 * Super Admin platform control sidebar (Sprint 1).
 * Routes unchanged; Platform section surfaces tenancy and system tools first.
 */
const superAdminNavigation = [
  {
    label: "Platform",
    icon: "mdi:domain",
    children: [
      {
        label: "Dashboard",
        path: "/dashboard",
        permissions: ["dashboard.summary.read"],
      },
      {
        label: "Schools",
        path: "/schools",
        permissions: ["system.school.read"],
      },
      {
        label: "Users",
        path: "/users",
        permissions: ["user.register"],
      },
      {
        label: "Permissions",
        path: "/permissions",
        permissions: ["system.permission_override.grant", "system.permission_override.revoke"],
        permissionMode: "any",
      },
    ],
  },
  academicsNavigationSection,
  staffNavigationSection,
  createFinanceNavigationSection({ budgetStructureRoles: null }),
  resourcesNavigationSection,
  {
    label: "System",
    icon: "mdi:cog",
    children: [
      {
        label: "Tenant Context",
        path: "/system/tenant",
        permissions: ["system.tenant.switch"],
      },
    ],
  },
  {
    label: "Help Center",
    path: "/help-support",
    icon: "mdi:help-circle",
    permissions: ["dashboard.summary.read"],
  },
];

export default superAdminNavigation;
