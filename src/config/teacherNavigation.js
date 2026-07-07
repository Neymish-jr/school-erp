/**
 * Teacher workspace sidebar — flat daily-workflow order (Sprint 1).
 * Routes unchanged; labels match ROLE_EXPERIENCE/06_TEACHER.md.
 */
const teacherNavigation = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: "mdi:view-dashboard",
    permissions: ["dashboard.summary.read"],
  },
  {
    label: "My Schedule",
    path: "/timetable",
    icon: "mdi:calendar-clock",
    permissions: ["timetable.read"],
  },
  {
    label: "My Subjects",
    path: "/teacher-subjects",
    icon: "mdi:book-education-outline",
    permissions: ["teacher_subject_assignment.read_own"],
  },
  {
    label: "Attendance",
    path: "/attendance",
    icon: "mdi:clipboard-check-outline",
    permissions: ["attendance.read", "attendance.student.read"],
    permissionMode: "any",
  },
  {
    label: "Assessments",
    path: "/results",
    icon: "mdi:school-outline",
    permissions: ["result.read"],
  },
  {
    label: "Report Cards",
    path: "/report-card",
    icon: "mdi:card-account-details-outline",
    permissions: ["report_card.read"],
  },
  {
    label: "Activities",
    path: "/activities",
    icon: "mdi:run-fast",
    permissions: ["finance.activity.read"],
  },
  {
    label: "My Expense Requests",
    path: "/finance/expense-requests",
    icon: "mdi:cash-multiple",
    permissions: ["finance.expense_request.read"],
  },
  {
    label: "Quotations",
    path: "/quotations",
    icon: "mdi:file-document-outline",
    permissions: ["finance.quotation.read"],
  },
  {
    label: "My Responsibilities",
    path: "/my-responsibilities",
    icon: "mdi:shield-account-outline",
    permissions: ["dashboard.summary.read"],
  },
  {
    label: "Help & Support",
    icon: "mdi:help-circle",
    children: [
      {
        label: "Help Center",
        path: "/help-support",
        permissions: ["dashboard.summary.read"],
      },
    ],
  },
];

export default teacherNavigation;
