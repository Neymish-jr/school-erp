const ROUTE_PERMISSION_RULES = [
  { path: "/dashboard", permissions: ["dashboard.summary.read"] },
  { path: "/students", permissions: ["student.read"] },
  { path: "/classes", permissions: ["class.read"] },
  { path: "/subjects", permissions: ["subject.read"] },
  {
    path: "/attendance",
    permissions: ["attendance.read", "attendance.student.read"],
    mode: "any",
  },
  { path: "/results", permissions: ["result.read"] },
  { path: "/report-card", permissions: ["report_card.read"] },
  { path: "/timetable", permissions: ["timetable.read"] },
  { path: "/teachers", permissions: ["teacher.read"] },
  { path: "/teacher-subjects", permissions: ["teacher_subject_assignment.read", "teacher_subject_assignment.read_own"], mode: "any" },
  { path: "/staff-posts", permissions: ["staff_post.read"] },
  {
    path: "/school-charges",
    permissions: ["administration.charge.read", "administration.charge_assignment.read"],
    mode: "any",
  },
  { path: "/finance/financial-years", permissions: ["finance.financial_year.read"] },
  { path: "/finance/budget-structure", permissions: ["finance.budget_head.read"] },
  { path: "/finance/budget-heads", permissions: ["finance.budget_head.read"] },
  { path: "/finance/budget-allocations", permissions: ["finance.budget_allocation.read"] },
  { path: "/activities", permissions: ["finance.activity.read"] },
  { path: "/finance/expense-requests", permissions: ["finance.expense_request.read"] },
  { path: "/quotations", permissions: ["finance.quotation.read"] },
  { path: "/finance/cashbook", permissions: ["finance.cashbook.read"] },
  { path: "/cashbook", permissions: ["finance.cashbook.read"] },
  { path: "/stock-register", permissions: ["stock.register.read"] },
  { path: "/expenses", permissions: ["finance.expense_ledger.read"] },
  { path: "/help-support", permissions: ["dashboard.summary.read"] },
  { path: "/my-responsibilities", permissions: ["dashboard.summary.read"] },
  { path: "/schools", permissions: ["system.school.read"] },
  { path: "/users", permissions: ["user.register"] },
  {
    path: "/permissions",
    permissions: ["system.permission_override.grant", "system.permission_override.revoke"],
    mode: "any",
  },
  { path: "/system/tenant", permissions: ["system.tenant.switch"] },
];

export const getRoutePermissionRule = (pathname) => {
  const normalizedPath = pathname.split("?")[0];

  const exactMatch = ROUTE_PERMISSION_RULES.find((rule) => rule.path === normalizedPath);
  if (exactMatch) {
    return exactMatch;
  }

  const prefixMatches = ROUTE_PERMISSION_RULES.filter(
    (rule) => normalizedPath.startsWith(`${rule.path}/`)
  );

  if (prefixMatches.length === 0) {
    return null;
  }

  return prefixMatches.sort((left, right) => right.path.length - left.path.length)[0];
};

export default ROUTE_PERMISSION_RULES;
