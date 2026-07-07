import { LEGACY_ROLES } from "../constants/roles";

/**
 * Office staff desk-first sidebar (Sprint 1).
 * Routes unchanged; Desk section surfaces records and payment workflow first.
 */
const officeStaffNavigation = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: "mdi:view-dashboard",
    permissions: ["dashboard.summary.read"],
  },
  {
    label: "Desk",
    icon: "mdi:desk",
    children: [
      {
        label: "Student Records",
        path: "/students",
        permissions: ["student.read"],
      },
      {
        label: "Payment Queue",
        path: "/finance/expense-requests",
        permissions: ["finance.expense_request.read"],
      },
      {
        label: "Cashbook",
        path: "/finance/cashbook",
        permissions: ["finance.cashbook.read"],
      },
    ],
  },
  {
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
  },
  {
    label: "Staff",
    icon: "mdi:account-tie",
    children: [
      { label: "Teachers", path: "/teachers", permissions: ["teacher.read"] },
      { label: "Staff Posts", path: "/staff-posts", permissions: ["staff_post.read"] },
      {
        label: "School Charges",
        path: "/school-charges",
        permissions: ["administration.charge.read"],
      },
    ],
  },
  {
    label: "Finance",
    icon: "mdi:finance",
    children: [
      {
        label: "Financial Years",
        path: "/finance/financial-years",
        permissions: ["finance.financial_year.read"],
      },
      {
        label: "Budget Structure",
        path: "/finance/budget-structure",
        permissions: ["finance.budget_head.read"],
        roles: [LEGACY_ROLES.SUPER_ADMIN],
      },
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
  },
  {
    label: "Resources",
    icon: "mdi:package",
    children: [
      {
        label: "Stock Register",
        path: "/stock-register",
        permissions: ["stock.register.read"],
      },
    ],
  },
  {
    label: "Help",
    icon: "mdi:help-circle",
    children: [
      { label: "Help Center", path: "/help-support", permissions: ["dashboard.summary.read"] },
    ],
  },
];

export default officeStaffNavigation;
