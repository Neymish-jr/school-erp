import {
  ADMIN_LIKE_LEGACY_ROLES,
  LEGACY_ROLES,
} from "../constants/roles";

const navigation = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: "mdi:view-dashboard",
  },
  {
    label: "Academics",
    icon: "mdi:school",
    children: [
      { label: "Students", path: "/students" },
      { label: "Classes", path: "/classes" },
      { label: "Subjects", path: "/subjects" },
      { label: "Attendance", path: "/attendance" },
      { label: "Results", path: "/results" },
      { label: "Report Cards", path: "/report-card" },
      { label: "Timetable", path: "/timetable" },
    ],
  },
  {
    label: "Staff",
    icon: "mdi:account-tie",
    children: [
      { label: "Teachers", path: "/teachers" },
      { label: "Teacher Subjects", path: "/teacher-subjects" },
      { label: "Staff Posts", path: "/staff-posts" },
      { label: "School Charges", path: "/school-charges" },
    ],
  },
  {
    label: "Finance",
    icon: "mdi:finance",
    children: [
      { label: "Financial Years", path: "/finance/financial-years" },
      {
        label: "Budget Structure",
        path: "/finance/budget-structure",
        roles: [LEGACY_ROLES.SUPER_ADMIN],
      },
      { label: "Budget Allocations", path: "/finance/budget-allocations" },
      { label: "Activities", path: "/activities" },
      { label: "Expense Requests", path: "/finance/expense-requests" },
      { label: "Quotations", path: "/quotations" },
      {
        label: "Cashbook",
        path: "/finance/cashbook",
        roles: [...ADMIN_LIKE_LEGACY_ROLES],
      },
    ],
  },
  {
    label: "Resources",
    icon: "mdi:package",
    children: [
      {
        label: "Stock Register",
        path: "/stock-register",
        roles: [...ADMIN_LIKE_LEGACY_ROLES],
      },
    ],
  },
  {
    label: "Help & Support",
    icon: "mdi:help-circle",
    children: [
      { label: "Placeholder", path: "/help-support" },
    ],
  },
];

export const getVisibleNavigation = (role) =>
  navigation
    .map((group) => {
      if (!group.children) {
        return group;
      }

      const children = group.children.filter((item) => {
        if (!item.roles?.length) return true;
        return item.roles.includes(role);
      });

      if (children.length === 0) {
        return null;
      }

      return { ...group, children };
    })
    .filter(Boolean);

export default navigation;
