import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  HiOutlineAcademicCap,
  HiOutlineBanknotes,
  HiOutlineBuildingOffice2,
  HiOutlineCalendarDays,
  HiOutlineChartBar,
  HiOutlineClipboardDocumentList,
  HiOutlineSparkles,
  HiOutlineUsers,
  HiOutlineWallet,
} from "react-icons/hi2";
import API from "../../api/axios";
import { fetchActivityDashboard } from "../../api/activities";
import {
  fetchExpenseRequestSummary,
  fetchFinancialYears,
} from "../../api/finance";
import StatsCard from "../../components/StatsCard";
import { Alert } from "../../design-system";
import { usePermissions } from "../../hooks/usePermissions";
import DashboardWidgetError from "./DashboardWidgetError";

const formatCurrency = (value) => {
  const amount = Number(value);
  if (Number.isNaN(amount)) return "₹0.00";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const sumExpenseSummary = (summary, statuses) =>
  summary
    .filter((row) => statuses.includes(row.status))
    .reduce((total, row) => total + Number(row.request_count || 0), 0);

const sumExpenseAmount = (summary, statuses) =>
  summary
    .filter((row) => statuses.includes(row.status))
    .reduce((total, row) => total + Number(row.total_amount || 0), 0);

const QUICK_ACTIONS = [
  {
    label: "Students",
    description: "Review enrollment records",
    to: "/students",
    icon: HiOutlineUsers,
    permission: "student.read",
  },
  {
    label: "Attendance",
    description: "School attendance oversight",
    to: "/attendance",
    icon: HiOutlineChartBar,
    permissions: ["attendance.read", "attendance.student.read"],
  },
  {
    label: "Activities",
    description: "Program activity monitoring",
    to: "/activities",
    icon: HiOutlineSparkles,
    permission: "finance.activity.read",
  },
  {
    label: "Expense Requests",
    description: "Read-only finance pipeline",
    to: "/finance/expense-requests",
    icon: HiOutlineWallet,
    permission: "finance.expense_request.read",
  },
  {
    label: "Cashbook",
    description: "Posted expenditure register",
    to: "/finance/cashbook",
    icon: HiOutlineBanknotes,
    permission: "finance.cashbook.read",
  },
];

function PlatformOversightDashboard({ copy }) {
  const { can, canAny, schools, activeSchoolId } = usePermissions();
  const canViewSummary = can("dashboard.summary.read");
  const canViewActivity = can("finance.activity.read_dashboard");
  const canViewFinance = can("dashboard.finance.read");

  const [summaryStats, setSummaryStats] = useState(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);
  const [activityDashboard, setActivityDashboard] = useState(null);
  const [isActivityLoading, setIsActivityLoading] = useState(true);
  const [expenseSummary, setExpenseSummary] = useState([]);
  const [isExpenseLoading, setIsExpenseLoading] = useState(true);
  const [activeFyLabel, setActiveFyLabel] = useState(null);
  const [summaryError, setSummaryError] = useState(null);
  const [activityError, setActivityError] = useState(null);
  const [expenseError, setExpenseError] = useState(null);
  const [summaryRetry, setSummaryRetry] = useState(0);
  const [programRetry, setProgramRetry] = useState(0);

  const activeSchool = useMemo(
    () => schools.find((school) => school.id === activeSchoolId) || null,
    [schools, activeSchoolId]
  );

  const visibleQuickActions = useMemo(
    () =>
      QUICK_ACTIONS.filter((action) =>
        action.permissions ? canAny(action.permissions) : can(action.permission)
      ),
    [can, canAny]
  );

  useEffect(() => {
    if (!canViewSummary) {
      setSummaryStats(null);
      setIsSummaryLoading(false);
      return;
    }

    const fetchSummary = async () => {
      setIsSummaryLoading(true);
      setSummaryError(null);

      try {
        const response = await API.get("/api/dashboard");
        setSummaryStats(response.data || {});
      } catch (error) {
        console.error(error);
        setSummaryStats(null);
        setSummaryError("Failed to load enrollment and attendance overview.");
      } finally {
        setIsSummaryLoading(false);
      }
    };

    fetchSummary();
  }, [canViewSummary, activeSchoolId, summaryRetry]);

  useEffect(() => {
    const loadProgramMetrics = async () => {
      setIsActivityLoading(canViewActivity);
      setIsExpenseLoading(canViewFinance);
      setActivityError(null);
      setExpenseError(null);

      try {
        const yearsResponse = await fetchFinancialYears();
        const years = yearsResponse?.data?.data || [];
        const activeYear = years.find((year) => year.status === "active") || years[0];
        const fyId = activeYear?.id;

        setActiveFyLabel(activeYear?.year_label || null);

        if (!fyId) {
          setActivityDashboard(null);
          setExpenseSummary([]);
          setIsActivityLoading(false);
          setIsExpenseLoading(false);
          return;
        }

        const fyParams = { financial_year_id: fyId };

        if (canViewActivity) {
          try {
            const response = await fetchActivityDashboard(fyParams);
            setActivityDashboard(response?.data?.data || null);
          } catch (error) {
            console.error(error);
            setActivityDashboard(null);
            setActivityError("Failed to load activity budget metrics.");
          } finally {
            setIsActivityLoading(false);
          }
        } else {
          setActivityDashboard(null);
          setIsActivityLoading(false);
        }

        if (canViewFinance) {
          try {
            const response = await fetchExpenseRequestSummary(fyParams);
            setExpenseSummary(response?.data?.data || []);
          } catch (error) {
            console.error(error);
            setExpenseSummary([]);
            setExpenseError("Failed to load expense request pipeline metrics.");
          } finally {
            setIsExpenseLoading(false);
          }
        } else {
          setExpenseSummary([]);
          setIsExpenseLoading(false);
        }
      } catch (error) {
        console.error(error);
        const message = "Failed to load program metrics.";
        if (canViewActivity) {
          setActivityDashboard(null);
          setActivityError(message);
          setIsActivityLoading(false);
        }
        if (canViewFinance) {
          setExpenseSummary([]);
          setExpenseError(message);
          setIsExpenseLoading(false);
        }
      }
    };

    loadProgramMetrics();
  }, [canViewActivity, canViewFinance, activeSchoolId, programRetry]);

  const safeSummary = summaryStats ?? {};
  const pendingExpenseCount = useMemo(
    () => sumExpenseSummary(expenseSummary, ["pending"]),
    [expenseSummary]
  );
  const approvedExpenseCount = useMemo(
    () => sumExpenseSummary(expenseSummary, ["approved"]),
    [expenseSummary]
  );
  const paidExpenseCount = useMemo(
    () => sumExpenseSummary(expenseSummary, ["paid"]),
    [expenseSummary]
  );
  const pendingExpenseAmount = useMemo(
    () => sumExpenseAmount(expenseSummary, ["pending"]),
    [expenseSummary]
  );

  const overviewStats = [
    {
      title: "Total Students",
      value: isSummaryLoading || summaryError ? "—" : safeSummary.total_students ?? 0,
      icon: HiOutlineUsers,
      accent: "from-orange-500 to-orange-600",
      description: "Active enrollment in context",
    },
    {
      title: "Active Teachers",
      value: isSummaryLoading || summaryError ? "—" : safeSummary.total_teachers ?? 0,
      icon: HiOutlineAcademicCap,
      accent: "from-orange-400 to-amber-600",
      description: "Teaching staff on record",
    },
    {
      title: "Total Classes",
      value: isSummaryLoading || summaryError ? "—" : safeSummary.total_classes ?? 0,
      icon: HiOutlineCalendarDays,
      accent: "from-amber-500 to-orange-600",
      description: "Class sections in context",
    },
    {
      title: "Attendance %",
      value: isSummaryLoading || summaryError ? "—" : `${safeSummary.attendance_percentage ?? 0}%`,
      icon: HiOutlineChartBar,
      accent: "from-emerald-600 to-emerald-500",
      description: "School-wide attendance snapshot",
    },
  ];

  const contextStats = [
    {
      title: copy.schoolsInScopeTitle,
      value: schools.length || "—",
      icon: HiOutlineBuildingOffice2,
      accent: "from-violet-600 to-violet-500",
      description:
        schools.length > 1
          ? copy.schoolsInScopeDescriptionMulti
          : "Single-school drill-down context",
    },
    {
      title: "Active School",
      value: activeSchool?.school_name || "Not selected",
      icon: HiOutlineBuildingOffice2,
      accent: "from-orange-500 to-orange-600",
      description: activeSchool?.udise_code
        ? `UDISE ${activeSchool.udise_code}`
        : "Select a school to drill down",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-orange-300">{copy.leadershipEyebrow}</p>
        <h1 className="mt-3 text-4xl font-bold text-white">{copy.commandCenterTitle}</h1>
        <p className="mt-2 max-w-3xl text-slate-300">
          {copy.heroDescription}
          {activeFyLabel ? ` Active financial year: ${activeFyLabel}.` : null}
        </p>
      </div>

      {schools.length > 1 ? (
        <Alert variant="info">
          Metrics below reflect the currently active school context
          {activeSchool ? ` (${activeSchool.school_name})` : ""}. {copy.multiSchoolAlertSuffix}
        </Alert>
      ) : null}

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

      {schools.length > 0 ? (
        <div className="space-y-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-orange-300">
              {copy.contextSectionEyebrow}
            </p>
            <h2 className="mt-3 text-2xl font-bold text-white">{copy.contextSectionTitle}</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {contextStats.map((stat) => (
              <StatsCard key={stat.title} {...stat} />
            ))}
          </div>
        </div>
      ) : null}

      {canViewSummary ? (
        <div className="space-y-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-orange-300">
              {copy.overviewSectionEyebrow}
            </p>
            <h2 className="mt-3 text-2xl font-bold text-white">{copy.overviewSectionTitle}</h2>
            <p className="mt-2 max-w-2xl text-slate-300">{copy.overviewDescription}</p>
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
      ) : null}

      {canViewActivity ? (
        <div className="space-y-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-orange-300">Programs</p>
            <h2 className="mt-3 text-2xl font-bold text-white">Activity Budget</h2>
            <p className="mt-2 max-w-2xl text-slate-300">
              Budget utilization for school activities in the active financial year.
            </p>
          </div>
          {activityError ? (
            <DashboardWidgetError
              message={activityError}
              onRetry={() => setProgramRetry((key) => key + 1)}
            />
          ) : activityDashboard ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatsCard
                title="Total Budget Pool"
                value={isActivityLoading ? "—" : formatCurrency(activityDashboard.total_budget)}
                icon={HiOutlineWallet}
                accent="from-orange-500 to-orange-600"
                description="School allocation pool (FY)"
              />
              <StatsCard
                title="Allocated"
                value={isActivityLoading ? "—" : formatCurrency(activityDashboard.allocated_budget)}
                icon={HiOutlineSparkles}
                accent="from-amber-500 to-orange-600"
                description="Assigned to activities"
              />
              <StatsCard
                title="Utilized"
                value={isActivityLoading ? "—" : formatCurrency(activityDashboard.utilized_budget)}
                icon={HiOutlineClipboardDocumentList}
                accent="from-orange-400 to-amber-600"
                description="Committed via expense requests"
              />
              <StatsCard
                title="Remaining"
                value={isActivityLoading ? "—" : formatCurrency(activityDashboard.remaining_budget)}
                icon={HiOutlineChartBar}
                accent="from-emerald-600 to-emerald-500"
                description="Available activity budget"
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {canViewFinance ? (
        <div className="space-y-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-orange-300">Finance Oversight</p>
            <h2 className="mt-3 text-2xl font-bold text-white">Expense Request Pipeline</h2>
            <p className="mt-2 max-w-2xl text-slate-300">
              Read-only counts for expense requests in the active financial year.
            </p>
          </div>
          {expenseError ? (
            <DashboardWidgetError
              message={expenseError}
              onRetry={() => setProgramRetry((key) => key + 1)}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <StatsCard
                title="Pending Approval"
                value={isExpenseLoading ? "—" : pendingExpenseCount}
                icon={HiOutlineClipboardDocumentList}
                accent="from-amber-500 to-orange-600"
                description={
                  isExpenseLoading
                    ? "Loading pipeline"
                    : `${formatCurrency(pendingExpenseAmount)} awaiting approval`
                }
              />
              <StatsCard
                title="Approved"
                value={isExpenseLoading ? "—" : approvedExpenseCount}
                icon={HiOutlineWallet}
                accent="from-emerald-600 to-emerald-500"
                description="Approved — awaiting payment desk"
              />
              <StatsCard
                title="Paid"
                value={isExpenseLoading ? "—" : paidExpenseCount}
                icon={HiOutlineBanknotes}
                accent="from-orange-500 to-orange-600"
                description="Disbursed in active FY"
              />
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default PlatformOversightDashboard;
