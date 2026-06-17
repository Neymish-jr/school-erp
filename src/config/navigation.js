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
      { label: "Administrative Charges", path: "/administrative-charges" },
      { label: "Assignments", path: "/teacher-administrative-charges" },
    ],
  },
  {
    label: "Administration",
    icon: "mdi:cog",
    children: [
      { label: "Activities", path: "/activities" },
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
        roles: ["super_admin"],
      },
      { label: "Budget Allocations", path: "/finance/budget-allocations" },
      { label: "Expense Requests", path: "/finance/expense-requests" },
      {
        label: "Cashbook",
        path: "/finance/cashbook",
        roles: ["admin", "super_admin"],
      },
    ],
  },
  {
    label: "Resources",
    icon: "mdi:package",
    children: [
      { label: "Stock Register", path: "/stock-register" },
      { label: "Quotations", path: "/quotations" },
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
