import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  HiOutlineBell,
  HiOutlineCalendarDays,
  HiOutlineClipboardDocumentCheck,
  HiOutlineClipboardDocumentList,
  HiOutlinePencilSquare,
  HiOutlineSparkles,
  HiOutlineWallet,
} from "react-icons/hi2";
import { fetchActivities, fetchActivityDashboard } from "../../api/activities";
import {
  fetchExpenseRequestSummary,
  fetchFinancialYears,
} from "../../api/finance";
import StatsCard from "../../components/StatsCard";
import { usePermissions } from "../../hooks/usePermissions";
import { sumExpenseSummary, formatDashboardCurrency as formatCurrency } from "./dashboardMetrics";
import DashboardWidgetError from "./DashboardWidgetError";

const fetchActivityCountByStatus = async (fyParams, status) => {
  const response = await fetchActivities({ ...fyParams, status });
  return (response?.data?.data || []).length;
};

const QUICK_ACTIONS = [
  {
    label: "Mark attendance",
    description: "Today's class register",
    to: "/attendance",
    icon: HiOutlineClipboardDocumentCheck,
    permissions: ["attendance.read", "attendance.student.read"],
  },
  {
    label: "My Schedule",
    description: "View today's periods",
    to: "/timetable",
    icon: HiOutlineCalendarDays,
    permission: "timetable.read",
  },
  {
    label: "New activity",
    description: "Plan and submit work",
    to: "/activities",
    icon: HiOutlineSparkles,
    permission: "finance.activity.read",
  },
  {
    label: "Expense request",
    description: "Raise a purchase request",
    to: "/finance/expense-requests",
    icon: HiOutlineWallet,
    permission: "finance.expense_request.read",
  },
  {
    label: "My Responsibilities",
    description: "View incharge assignments",
    to: "/my-responsibilities",
    icon: HiOutlineBell,
    permission: "dashboard.summary.read",
  },
];

function TeacherDashboard() {
  const { administrativeCharges, can, canAny } = usePermissions();
  const [isLoading, setIsLoading] = useState(true);
  const [activityDashboard, setActivityDashboard] = useState(null);
  const [draftActivityCount, setDraftActivityCount] = useState(0);
  const [submittedActivityCount, setSubmittedActivityCount] = useState(0);
  const [expenseSummary, setExpenseSummary] = useState([]);
  const [activeFyLabel, setActiveFyLabel] = useState(null);
  const [workflowError, setWorkflowError] = useState(null);
  const [workflowRetry, setWorkflowRetry] = useState(0);

  const visibleQuickActions = useMemo(
    () =>
      QUICK_ACTIONS.filter((action) =>
        action.permissions ? canAny(action.permissions) : can(action.permission)
      ),
    [can, canAny]
  );

  useEffect(() => {
    const loadTeacherDashboard = async () => {
      setIsLoading(true);
      setWorkflowError(null);

      try {
        const yearsResponse = await fetchFinancialYears();
        const years = yearsResponse?.data?.data || [];
        const activeYear = years.find((year) => year.status === "active") || years[0];
        const fyId = activeYear?.id;

        setActiveFyLabel(activeYear?.year_label || null);

        if (!fyId) {
          setActivityDashboard(null);
          setDraftActivityCount(0);
          setSubmittedActivityCount(0);
          setExpenseSummary([]);
          return;
        }

        const fyParams = { financial_year_id: fyId };

        const [dashboardResponse, draftCount, submittedCount, summaryResponse] =
          await Promise.all([
            fetchActivityDashboard(fyParams),
            fetchActivityCountByStatus(fyParams, "draft"),
            fetchActivityCountByStatus(fyParams, "submitted"),
            fetchExpenseRequestSummary(fyParams),
          ]);

        setActivityDashboard(dashboardResponse?.data?.data || null);
        setDraftActivityCount(draftCount);
        setSubmittedActivityCount(submittedCount);
        setExpenseSummary(summaryResponse?.data?.data || []);
      } catch (error) {
        console.error(error);
        setActivityDashboard(null);
        setWorkflowError("Failed to load activities and expense metrics.");
      } finally {
        setIsLoading(false);
      }
    };

    loadTeacherDashboard();
  }, [workflowRetry]);

  const pendingExpenseRequests = useMemo(
    () => sumExpenseSummary(expenseSummary, ["pending"]),
    [expenseSummary]
  );
  const draftExpenseRequests = useMemo(
    () => sumExpenseSummary(expenseSummary, ["draft"]),
    [expenseSummary]
  );

  const workflowStats = [
    {
      title: "Draft Activities",
      value: isLoading ? "—" : draftActivityCount,
      icon: HiOutlineSparkles,
      accent: "from-orange-500 to-orange-600",
      description: "Ready to submit for approval",
    },
    {
      title: "Submitted Activities",
      value: isLoading ? "—" : submittedActivityCount,
      icon: HiOutlineClipboardDocumentList,
      accent: "from-amber-500 to-orange-600",
      description: "Awaiting principal review",
    },
    {
      title: "Draft Expense Requests",
      value: isLoading ? "—" : draftExpenseRequests,
      icon: HiOutlineWallet,
      accent: "from-orange-400 to-amber-600",
      description: "Complete and submit when ready",
    },
    {
      title: "Pending Expense Requests",
      value: isLoading ? "—" : pendingExpenseRequests,
      icon: HiOutlineClipboardDocumentCheck,
      accent: "from-emerald-600 to-emerald-500",
      description: "Submitted — awaiting approval",
    },
  ];

  const placeholderStats = [
    {
      title: "Today's Timetable",
      value: "—",
      icon: HiOutlineCalendarDays,
      accent: "from-slate-600 to-slate-500",
      description: "Period preview coming in a later sprint",
    },
    {
      title: "Pending Attendance",
      value: "—",
      icon: HiOutlineClipboardDocumentCheck,
      accent: "from-slate-600 to-slate-500",
      description: "Classes not marked today — coming soon",
    },
    {
      title: "Pending Marks Entry",
      value: "—",
      icon: HiOutlinePencilSquare,
      accent: "from-slate-600 to-slate-500",
      description: "Open evaluations — coming soon",
    },
    {
      title: "My Responsibilities",
      value: isLoading ? "—" : administrativeCharges.length,
      icon: HiOutlineBell,
      accent: "from-violet-600 to-violet-500",
      description:
        administrativeCharges.length > 0 ? (
          <>
            Active assignments —{" "}
            <Link to="/my-responsibilities" className="text-violet-300 underline hover:text-violet-200">
              view all
            </Link>
          </>
        ) : (
          "No incharge roles assigned"
        ),
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-orange-300">Teacher Workspace</p>
        <h1 className="mt-3 text-4xl font-bold text-white">My Day</h1>
        <p className="mt-2 max-w-2xl text-slate-300">
          Your daily teaching workflow — attendance, schedule, assessments, activities, and expense
          requests in one place.
          {activeFyLabel ? ` Active financial year: ${activeFyLabel}.` : null}
        </p>
      </div>

      {visibleQuickActions.length > 0 ? (
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-orange-300">Quick Actions</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {visibleQuickActions.map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className="group flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 transition hover:border-orange-500/40 hover:bg-slate-900"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/15 text-orange-300 transition group-hover:bg-orange-500/25">
                  <action.icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block font-semibold text-white">{action.label}</span>
                  <span className="mt-1 block text-sm text-slate-400">{action.description}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-orange-300">My Work</p>
          <h2 className="mt-3 text-2xl font-bold text-white">Activities &amp; Expenses</h2>
          <p className="mt-2 max-w-2xl text-slate-300">
            Counts from your assigned activities and expense requests for the active financial year.
          </p>
        </div>
        {workflowError ? (
          <DashboardWidgetError
            message={workflowError}
            onRetry={() => setWorkflowRetry((key) => key + 1)}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {workflowStats.map((stat) => (
              <StatsCard key={stat.title} {...stat} />
            ))}
          </div>
        )}
      </div>

      {workflowError ? (
        <div className="space-y-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-orange-300">Activity Budget</p>
            <h2 className="mt-3 text-2xl font-bold text-white">My Activity Utilization</h2>
          </div>
          <DashboardWidgetError
            message={workflowError}
            onRetry={() => setWorkflowRetry((key) => key + 1)}
          />
        </div>
      ) : activityDashboard ? (
        <div className="space-y-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-orange-300">Activity Budget</p>
            <h2 className="mt-3 text-2xl font-bold text-white">My Activity Utilization</h2>
            <p className="mt-2 max-w-2xl text-slate-300">
              Budget linked to your activities (scoped to your account).
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatsCard
              title="Allocated Budget"
              value={formatCurrency(activityDashboard.allocated_budget)}
              icon={HiOutlineWallet}
              accent="from-orange-500 to-orange-600"
              description="Across your activities"
            />
            <StatsCard
              title="Utilized Budget"
              value={formatCurrency(activityDashboard.utilized_budget)}
              icon={HiOutlineClipboardDocumentList}
              accent="from-amber-500 to-orange-600"
              description="Committed expense requests"
            />
            <StatsCard
              title="Remaining Budget"
              value={formatCurrency(activityDashboard.remaining_budget)}
              icon={HiOutlineSparkles}
              accent="from-emerald-600 to-emerald-500"
              description="Available for new requests"
            />
            <StatsCard
              title="School Pool (FY)"
              value={formatCurrency(activityDashboard.total_budget)}
              icon={HiOutlineCalendarDays}
              accent="from-orange-400 to-amber-600"
              description="Total school allocation pool"
            />
          </div>
        </div>
      ) : null}

      <div className="space-y-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-orange-300">Coming Soon</p>
          <h2 className="mt-3 text-2xl font-bold text-white">Daily Reminders</h2>
          <p className="mt-2 max-w-2xl text-slate-300">
            Timetable preview, attendance reminders, and marks entry queues will appear here in a
            future sprint.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {placeholderStats.map((stat) => (
            <StatsCard key={stat.title} {...stat} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default TeacherDashboard;
