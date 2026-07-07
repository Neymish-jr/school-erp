import { LEGACY_ROLES } from "../constants/roles";

/** Shared Academics sidebar section — used by default and role-specific navigation trees. */
export const academicsNavigationSection = {
  label: "Academics",
  icon: "mdi:school",
  children: [
    { label: "Students", path: "/students", permissions: ["student.read"] },
    { label: "Classes", path: "/classes", permissions: ["class.read"] },
    { label: "Subjects", path: "/subjects", permissions: ["subject.read"] },
    {
      label: "Attendance",
      path: "/attendance",
      permissions: ["attendance.read", "attendance.student.read"],
      permissionMode: "any",
    },
    { label: "Results", path: "/results", permissions: ["result.read"] },
    { label: "Report Cards", path: "/report-card", permissions: ["report_card.read"] },
    { label: "Timetable", path: "/timetable", permissions: ["timetable.read"] },
  ],
};

/** Shared Staff sidebar section. */
export const staffNavigationSection = {
  label: "Staff",
  icon: "mdi:account-tie",
  children: [
    { label: "Teachers", path: "/teachers", permissions: ["teacher.read"] },
    {
      label: "Teacher Subjects",
      path: "/teacher-subjects",
      permissions: ["teacher_subject_assignment.read"],
    },
    { label: "Staff Posts", path: "/staff-posts", permissions: ["staff_post.read"] },
    {
      label: "School Charges",
      path: "/school-charges",
      permissions: ["administration.charge.read", "administration.charge_assignment.read"],
      permissionMode: "any",
    },
  ],
};

const budgetStructureNavItem = {
  label: "Budget Structure",
  path: "/finance/budget-structure",
  permissions: ["finance.budget_head.read"],
};

/**
 * Shared Finance sidebar section.
 * @param {{ budgetStructureRoles?: string[] | null }} options
 *   Pass `null` to always show Budget Structure (super-admin nav).
 */
export const createFinanceNavigationSection = ({ budgetStructureRoles = [LEGACY_ROLES.SUPER_ADMIN] } = {}) => ({
  label: "Finance",
  icon: "mdi:finance",
  children: [
    {
      label: "Financial Years",
      path: "/finance/financial-years",
      permissions: ["finance.financial_year.read"],
    },
    ...(budgetStructureRoles
      ? [{ ...budgetStructureNavItem, roles: budgetStructureRoles }]
      : [budgetStructureNavItem]),
    {
      label: "Budget Allocations",
      path: "/finance/budget-allocations",
      permissions: ["finance.budget_allocation.read"],
    },
    { label: "Activities", path: "/activities", permissions: ["finance.activity.read"] },
    {
      label: "Expense Requests",
      path: "/finance/expense-requests",
      permissions: ["finance.expense_request.read"],
    },
    { label: "Quotations", path: "/quotations", permissions: ["finance.quotation.read"] },
    {
      label: "Cashbook",
      path: "/finance/cashbook",
      permissions: ["finance.cashbook.read"],
    },
  ],
});

/** Shared Resources sidebar section. */
export const resourcesNavigationSection = {
  label: "Resources",
  icon: "mdi:package",
  children: [
    {
      label: "Stock Register",
      path: "/stock-register",
      permissions: ["stock.register.read"],
    },
  ],
};

/** Shared Help & Support sidebar section. */
export const helpSupportNavigationSection = {
  label: "Help & Support",
  icon: "mdi:help-circle",
  children: [
    { label: "Help Center", path: "/help-support", permissions: ["dashboard.summary.read"] },
  ],
};
