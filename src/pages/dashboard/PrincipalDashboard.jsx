import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  HiOutlineAcademicCap,
  HiOutlineBanknotes,
  HiOutlineCalendarDays,
  HiOutlineChartBar,
  HiOutlineChartPie,
  HiOutlineClipboardDocumentList,
  HiOutlineScale,
  HiOutlineSparkles,
  HiOutlineUserGroup,
  HiOutlineUserMinus,
  HiOutlineUsers,
  HiOutlineWallet,
} from "react-icons/hi2";
import API from "../../api/axios";
import { fetchActivities } from "../../api/activities";
import {
  fetchExpenseRequestSummary,
  fetchFinanceDashboardMetrics,
  fetchFinancialYears,
} from "../../api/finance";
import StatsCard from "../../components/StatsCard";
import { usePermissions } from "../../hooks/usePermissions";
import {
  computeVacancyPercentage,
  formatDashboardCurrency as formatCurrency,
  parseWidgetValue,
  sumExpenseSummary,
} from "./dashboardMetrics";
import DashboardWidgetError from "./DashboardWidgetError";

const fetchSubmittedActivityCount = async (fyParams) => {
  const response = await fetchActivities({ ...fyParams, status: "submitted" });
  const activities = response?.data?.data || [];
  return activities.length;
};

const QUICK_ACTIONS = [
  {
    label: "Review activities",
    description: "Approve or reject submitted work",
    to: "/activities",
    icon: HiOutlineSparkles,
    permission: "finance.activity.read",
  },
  {
    label: "Expense requests",
    description: "Pending financial approvals",
    to: "/finance/expense-requests",
    icon: HiOutlineWallet,
    permission: "finance.expense_request.read",
  },
  {
    label: "Staff posts",
    description: "Vacancy and assignments",
    to: "/staff-posts",
    icon: HiOutlineUserGroup,
    permission: "staff_post.read",
  },
  {
    label: "School charges",
    description: "Assign administrative incharges",
    to: "/school-charges",
    icon: HiOutlineClipboardDocumentList,
    permissions: ["administration.charge.read", "administration.charge_assignment.read"],
  },
];

function PrincipalDashboard() {
  const { can, canAny } = usePermissions();
  const canViewFinance = can("dashboard.finance.read");
  const canViewVacancy = can("dashboard.staff_post.read");

  const [summaryStats, setSummaryStats] = useState(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);
  const [financeStats, setFinanceStats] = useState(null);
  const [isFinanceLoading, setIsFinanceLoading] = useState(true);
  const [vacancyStats, setVacancyStats] = useState(null);
  const [isVacancyLoading, setIsVacancyLoading] = useState(false);
  const [showVacancySection, setShowVacancySection] = useState(false);
  const [submittedActivityCount, setSubmittedActivityCount] = useState(0);
  const [expenseSummary, setExpenseSummary] = useState([]);
  const [isWorkflowLoading, setIsWorkflowLoading] = useState(true);
  const [activeFyLabel, setActiveFyLabel] = useState(null);
  const [summaryError, setSummaryError] = useState(null);
  const [financeError, setFinanceError] = useState(null);
  const [vacancyError, setVacancyError] = useState(null);
  const [workflowError, setWorkflowError] = useState(null);
  const [summaryRetry, setSummaryRetry] = useState(0);
  const [financeRetry, setFinanceRetry] = useState(0);
  const [vacancyRetry, setVacancyRetry] = useState(0);
  const [workflowRetry, setWorkflowRetry] = useState(0);

  const visibleQuickActions = useMemo(
    () =>
      QUICK_ACTIONS.filter((action) =>
        action.permissions ? canAny(action.permissions) : can(action.permission)
      ),
    [can, canAny]
  );

  useEffect(() => {
    const fetchSummary = async () => {
      setIsSummaryLoading(true);
      setSummaryError(null);

      try {
        const response = await API.get("/api/dashboard");
        setSummaryStats(response.data || {});
      } catch (error) {
        console.error(error);
        setSummaryStats(null);
        setSummaryError("Failed to load school overview metrics.");
      } finally {
        setIsSummaryLoading(false);
      }
    };

    fetchSummary();
  }, [summaryRetry]);

  useEffect(() => {
    if (!canViewFinance) {
      setFinanceStats(null);
      setIsFinanceLoading(false);
      return;
    }

    const fetchFinance = async () => {
      setIsFinanceLoading(true);
      setFinanceError(null);

      try {
        const response = await fetchFinanceDashboardMetrics();
        setFinanceStats(response?.data?.data || null);
      } catch (error) {
        console.error(error);
        setFinanceStats(null);
        setFinanceError("Failed to load finance dashboard metrics.");
      } finally {
        setIsFinanceLoading(false);
      }
    };

    fetchFinance();
  }, [canViewFinance, financeRetry]);

  useEffect(() => {
    if (!canViewVacancy) {
      setVacancyStats(null);
      setShowVacancySection(false);
      setIsVacancyLoading(false);
      return;
    }

    const fetchVacancy = async () => {
      setIsVacancyLoading(true);
      setVacancyError(null);

      try {
        const [sanctionedRes, filledRes, vacantRes] = await Promise.all([
          API.get("/api/dashboard/staff-posts/sanctioned-strength"),
          API.get("/api/dashboard/staff-posts/filled-positions"),
          API.get("/api/dashboard/staff-posts/vacant-positions"),
        ]);

        const sanctionedStrength = parseWidgetValue(sanctionedRes);
        const filled = parseWidgetValue(filledRes);
        const vacant = parseWidgetValue(vacantRes);

        setVacancyStats({
          sanctionedStrength,
          filled,
          vacant,
          vacancyPercentage: computeVacancyPercentage(vacant, sanctionedStrength),
        });
        setShowVacancySection(true);
      } catch (error) {
        console.error(error);
        setVacancyStats(null);
        setShowVacancySection(true);
        setVacancyError("Failed to load staff vacancy metrics.");
      } finally {
        setIsVacancyLoading(false);
      }
    };

    fetchVacancy();
  }, [canViewVacancy, vacancyRetry]);

  useEffect(() => {
    const loadWorkflowMetrics = async () => {
      setIsWorkflowLoading(true);
      setWorkflowError(null);

      try {
        const yearsResponse = await fetchFinancialYears();
        const years = yearsResponse?.data?.data || [];
        const activeYear = years.find((year) => year.status === "active") || years[0];
        const fyId = activeYear?.id;

        setActiveFyLabel(activeYear?.year_label || null);

        if (!fyId) {
          setSubmittedActivityCount(0);
          setExpenseSummary([]);
          return;
        }

        const fyParams = { financial_year_id: fyId };

        const submittedCount = await fetchSubmittedActivityCount(fyParams);
        setSubmittedActivityCount(submittedCount);

        if (!canViewFinance) {
          const summaryResponse = await fetchExpenseRequestSummary(fyParams);
          setExpenseSummary(summaryResponse?.data?.data || []);
        } else {
          setExpenseSummary([]);
        }
      } catch (error) {
        console.error(error);
        setWorkflowError("Failed to load approval queue metrics.");
      } finally {
        setIsWorkflowLoading(false);
      }
    };

    loadWorkflowMetrics();
  }, [canViewFinance, workflowRetry]);

  const safeSummary = summaryStats ?? {
    total_students: 0,
    total_teachers: 0,
    total_classes: 0,
    attendance_percentage: 0,
  };
  const safeVacancy = vacancyStats ?? {
    sanctionedStrength: 0,
    filled: 0,
    vacant: 0,
    vacancyPercentage: "0",
  };
  const safeFinance = financeStats ?? {
    total_budget_received: 0,
    total_expenditure: 0,
    available_balance: 0,
    budget_utilization_pct: 0,
    pending_requests_count: 0,
    pending_requests_amount: 0,
    year_label: null,
  };

  const pendingExpenseRequests = useMemo(() => {
    if (canViewFinance) {
      return safeFinance.pending_requests_count;
    }

    return sumExpenseSummary(expenseSummary, ["pending"]);
  }, [canViewFinance, safeFinance.pending_requests_count, expenseSummary]);

  const overviewStats = [
    {
      title: "Total Students",
      value: isSummaryLoading || summaryError ? "—" : safeSummary.total_students ?? 0,
      icon: HiOutlineUsers,
      accent: "from-orange-500 to-orange-600",
    },
    {
      title: "Active Teachers",
      value: isSummaryLoading || summaryError ? "—" : safeSummary.total_teachers ?? 0,
      icon: HiOutlineAcademicCap,
      accent: "from-orange-400 to-amber-600",
    },
    {
      title: "Total Classes",
      value: isSummaryLoading || summaryError ? "—" : safeSummary.total_classes ?? 0,
      icon: HiOutlineCalendarDays,
      accent: "from-amber-500 to-orange-600",
    },
    {
      title: "Attendance Percentage",
      value: isSummaryLoading || summaryError ? "—" : safeSummary.attendance_percentage ?? 0,
      icon: HiOutlineChartBar,
      accent: "from-emerald-600 to-emerald-500",
    },
  ];

  const approvalStats = [
    {
      title: "Activities Awaiting Approval",
      value: isWorkflowLoading ? "—" : submittedActivityCount,
      icon: HiOutlineSparkles,
      accent: "from-amber-500 to-orange-600",
      description: "Submitted by teachers — review in Activities",
    },
    {
      title: "Expense Requests Pending",
      value: canViewFinance
        ? isFinanceLoading
          ? "—"
          : pendingExpenseRequests
        : isWorkflowLoading
          ? "—"
          : pendingExpenseRequests,
      icon: HiOutlineClipboardDocumentList,
      accent: "from-orange-500 to-orange-600",
      description: "Awaiting principal approval",
    },
    {
      title: "Finance Queue (FY)",
      value: isFinanceLoading ? "—" : safeFinance.pending_requests_count,
      icon: HiOutlineWallet,
      accent: "from-emerald-600 to-emerald-500",
      description: isFinanceLoading
        ? "Loading finance metrics"
        : `${formatCurrency(safeFinance.pending_requests_amount)} pending amount`,
    },
  ];

  const financeDashboardStats = [
    {
      title: "Total Budget Received",
      value: isFinanceLoading ? "—" : formatCurrency(safeFinance.total_budget_received),
      icon: HiOutlineWallet,
      accent: "from-orange-500 to-orange-600",
      description: safeFinance.year_label
        ? `Active FY ${safeFinance.year_label}`
        : activeFyLabel
          ? `Active FY ${activeFyLabel}`
          : "Active financial year",
    },
    {
      title: "Total Expenditure",
      value: isFinanceLoading ? "—" : formatCurrency(safeFinance.total_expenditure),
      icon: HiOutlineBanknotes,
      accent: "from-amber-500 to-orange-600",
      description: "Posted cashbook payments",
    },
    {
      title: "Available Balance",
      value: isFinanceLoading ? "—" : formatCurrency(safeFinance.available_balance),
      icon: HiOutlineScale,
      accent: "from-emerald-600 to-emerald-500",
      description: "Budget received minus expenditure",
    },
    {
      title: "Budget Utilization",
      value: isFinanceLoading ? "—" : `${safeFinance.budget_utilization_pct}%`,
      icon: HiOutlineChartPie,
      accent: "from-orange-400 to-amber-600",
      description: "Expenditure as share of budget",
    },
    {
      title: "Pending Requests",
      value: isFinanceLoading ? "—" : safeFinance.pending_requests_count,
      icon: HiOutlineClipboardDocumentList,
      accent: "from-amber-500 to-orange-600",
      description: isFinanceLoading
        ? "Awaiting approval"
        : `${formatCurrency(safeFinance.pending_requests_amount)} pending amount`,
    },
  ];

  const vacancyDashboardStats = [
    {
      title: "Sanctioned Positions",
      value: isVacancyLoading ? 0 : safeVacancy.sanctionedStrength,
      icon: HiOutlineUsers,
      accent: "from-orange-500 to-orange-700",
    },
    {
      title: "Filled Positions",
      value: isVacancyLoading ? 0 : safeVacancy.filled,
      icon: HiOutlineUserGroup,
      accent: "from-emerald-600 to-emerald-500",
    },
    {
      title: "Vacant Positions",
      value: isVacancyLoading ? 0 : safeVacancy.vacant,
      icon: HiOutlineUserMinus,
      accent: "from-rose-500 to-red-500",
    },
    {
      title: "Vacancy Percentage",
      value: isVacancyLoading ? "0%" : `${safeVacancy.vacancyPercentage}%`,
      icon: HiOutlineChartPie,
      accent: "from-amber-500 to-orange-600",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-orange-300">School Leadership</p>
        <h1 className="mt-3 text-4xl font-bold text-white">School Command Center</h1>
        <p className="mt-2 max-w-2xl text-slate-300">
          Monitor enrollment, attendance, staff strength, and financial health — then act on pending
          approvals.
          {activeFyLabel ? ` Active financial year: ${activeFyLabel}.` : null}
        </p>
      </div>

      {visibleQuickActions.length > 0 ? (
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-orange-300">Quick Actions</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
          <p className="text-sm uppercase tracking-[0.3em] text-orange-300">School Overview</p>
          <h2 className="mt-3 text-2xl font-bold text-white">Enrollment &amp; Attendance</h2>
        </div>
        {summaryError ? (
          <DashboardWidgetError
            message={summaryError}
            onRetry={() => setSummaryRetry((key) => key + 1)}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {overviewStats.map((stat) => (
              <StatsCard key={stat.title} {...stat} />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-orange-300">Approvals</p>
          <h2 className="mt-3 text-2xl font-bold text-white">Pending Decisions</h2>
          <p className="mt-2 max-w-2xl text-slate-300">
            Work waiting for principal review in the active financial year.
          </p>
        </div>
        {workflowError ? (
          <DashboardWidgetError
            message={workflowError}
            onRetry={() => setWorkflowRetry((key) => key + 1)}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {approvalStats.map((stat) => (
              <StatsCard key={stat.title} {...stat} />
            ))}
          </div>
        )}
      </div>

      {canViewFinance ? (
        <div className="space-y-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-orange-300">Finance</p>
            <h2 className="mt-3 text-2xl font-bold text-white">Budget &amp; Expenditure</h2>
            <p className="mt-2 max-w-2xl text-slate-300">
              Live budget utilization from allocations, cashbook expenditure, and pending expense
              requests.
            </p>
          </div>
          {financeError ? (
            <DashboardWidgetError
              message={financeError}
              onRetry={() => setFinanceRetry((key) => key + 1)}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {financeDashboardStats.map((stat) => (
                <StatsCard key={stat.title} {...stat} />
              ))}
            </div>
          )}
        </div>
      ) : null}

      {showVacancySection ? (
        <div className="space-y-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-orange-300">Staff Vacancy</p>
            <h2 className="mt-3 text-2xl font-bold text-white">Vacancy Summary</h2>
            <p className="mt-2 max-w-2xl text-slate-300">
              Sanctioned staff strength, filled positions, and current vacancy rate for your school.
            </p>
          </div>
          {vacancyError ? (
            <DashboardWidgetError
              message={vacancyError}
              onRetry={() => setVacancyRetry((key) => key + 1)}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {vacancyDashboardStats.map((stat) => (
                <StatsCard key={stat.title} {...stat} />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default PrincipalDashboard;
