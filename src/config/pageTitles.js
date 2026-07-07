/**
 * Navbar page titles by route. Role overrides mirror role-specific sidebar labels.
 */
const ROLE_TITLE_OVERRIDES = {
  teacher: {
    "/timetable": "My Schedule",
    "/results": "Assessments",
    "/finance/expense-requests": "My Expense Requests",
  },
  principal: {
    "/dashboard": "School Command Center",
  },
  office_staff: {
    "/dashboard": "Office Desk",
    "/students": "Student Records",
    "/finance/expense-requests": "Payment Queue",
  },
  dpo: {
    "/dashboard": "District Command Center",
  },
  beo: {
    "/dashboard": "Block Command Center",
  },
  super_admin: {
    "/dashboard": "Platform Control Center",
    "/schools": "Schools",
    "/users": "Users",
    "/permissions": "Permissions",
    "/system/tenant": "Tenant Context",
  },
};

const ROUTE_TITLE_RULES = [
  { match: (path) => /^\/finance\/expense-requests\/[^/]+$/.test(path), title: "Expense Request" },
  { match: (path) => /^\/activities\/[^/]+$/.test(path), title: "Activity Detail" },
  { match: (path) => /^\/teachers\/[^/]+$/.test(path), title: "Teacher Profile" },
  { path: "/dashboard", title: "Dashboard" },
  { path: "/students", title: "Students" },
  { path: "/classes", title: "Classes" },
  { path: "/teachers", title: "Teachers" },
  { path: "/subjects", title: "Subjects" },
  { path: "/teacher-subjects", title: "Teacher Subjects" },
  { path: "/attendance", title: "Attendance" },
  { path: "/results", title: "Results" },
  { path: "/report-card", title: "Report Cards" },
  { path: "/timetable", title: "Timetable" },
  { path: "/staff-posts", title: "Staff Posts" },
  { path: "/school-charges", title: "School Charges" },
  { path: "/finance/financial-years", title: "Financial Years" },
  { path: "/finance/budget-structure", title: "Budget Structure" },
  { path: "/finance/budget-heads", title: "Budget Structure" },
  { path: "/finance/budget-allocations", title: "Budget Allocations" },
  { path: "/finance/expense-requests", title: "Expense Requests" },
  { path: "/finance/cashbook", title: "Cashbook" },
  { path: "/cashbook", title: "Cashbook" },
  { path: "/expenses", title: "Expenses" },
  { path: "/stock-register", title: "Stock Register" },
  { path: "/quotations", title: "Quotations" },
  { path: "/my-responsibilities", title: "My Responsibilities" },
  { path: "/activities", title: "Activities" },
  { path: "/help-support", title: "Help Center" },
  { path: "/unauthorized", title: "Access Denied" },
];

export const getPageTitle = (pathname, role = null) => {
  const normalized = pathname.split("?")[0];

  const roleOverrides = role ? ROLE_TITLE_OVERRIDES[role] : null;
  if (roleOverrides?.[normalized]) {
    return roleOverrides[normalized];
  }

  for (const rule of ROUTE_TITLE_RULES) {
    if (rule.match) {
      if (rule.match(normalized)) {
        return rule.title;
      }
      continue;
    }

    if (normalized === rule.path) {
      return rule.title;
    }
  }

  return "School ERP";
};
