import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  HiOutlineAcademicCap,
  HiOutlineBanknotes,
  HiOutlineBuildingOffice2,
  HiOutlineCalendarDays,
  HiOutlineChartBar,
  HiOutlineChartPie,
  HiOutlineClipboardDocumentList,
  HiOutlineCog6Tooth,
  HiOutlineKey,
  HiOutlineScale,
  HiOutlineShieldCheck,
  HiOutlineUserGroup,
  HiOutlineUserMinus,
  HiOutlineUsers,
  HiOutlineWallet,
} from "react-icons/hi2";
import API from "../../api/axios";
import { fetchFinanceDashboardMetrics } from "../../api/finance";
import StatsCard from "../../components/StatsCard";
import { Alert } from "../../design-system";
import { usePermissions } from "../../hooks/usePermissions";
import {
  computeVacancyPercentage,
  formatDashboardCurrency,
  parseWidgetValue,
} from "./dashboardMetrics";
import DashboardWidgetError from "./DashboardWidgetError";

const QUICK_ACTIONS = [
  {
    label: "Schools",
    description: "Browse platform schools",
    to: "/schools",
    icon: HiOutlineBuildingOffice2,
    permission: "system.school.read",
  },
  {
    label: "Users",
    description: "Provision operator accounts",
    to: "/users",
    icon: HiOutlineUsers,
    permission: "user.register",
  },
  {
    label: "Budget Structure",
    description: "Global heads and sub-heads",
    to: "/finance/budget-structure",
    icon: HiOutlineScale,
    permission: "finance.budget_head.read",
  },
  {
    label: "Permissions",
    description: "Manage permission overrides",
    to: "/permissions",
    icon: HiOutlineKey,
    permissions: ["system.permission_override.grant", "system.permission_override.revoke"],
  },
  {
    label: "Expense Requests",
    description: "Review approval pipeline",
    to: "/finance/expense-requests",
    icon: HiOutlineWallet,
    permission: "finance.expense_request.read",
  },
];

function SuperAdminDashboard() {
  const { can, canAny, schools, activeSchoolId } = usePermissions();
  const canViewSummary = can("dashboard.summary.read");
  const canViewFinance = can("dashboard.finance.read");
  const canViewVacancy = can("dashboard.staff_post.read");
  const canListSchools = can("system.school.read");

  const [summaryStats, setSummaryStats] = useState(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);
  const [platformSchoolCount, setPlatformSchoolCount] = useState(null);
  const [isSchoolCountLoading, setIsSchoolCountLoading] = useState(false);
  const [vacancyStats, setVacancyStats] = useState(null);
  const [isVacancyLoading, setIsVacancyLoading] = useState(true);
  const [showVacancySection, setShowVacancySection] = useState(false);
  const [financeStats, setFinanceStats] = useState(null);
  const [isFinanceLoading, setIsFinanceLoading] = useState(true);
  const [schoolCountError, setSchoolCountError] = useState(null);
  const [summaryError, setSummaryError] = useState(null);
  const [financeError, setFinanceError] = useState(null);
  const [vacancyError, setVacancyError] = useState(null);
  const [schoolCountRetry, setSchoolCountRetry] = useState(0);
  const [summaryRetry, setSummaryRetry] = useState(0);
  const [financeRetry, setFinanceRetry] = useState(0);
  const [vacancyRetry, setVacancyRetry] = useState(0);

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
      setSummaryError(null);
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
        setSummaryError("Failed to load school operations metrics.");
      } finally {
        setIsSummaryLoading(false);
      }
    };

    fetchSummary();
  }, [canViewSummary, activeSchoolId, summaryRetry]);

  useEffect(() => {
    if (!canListSchools) {
      setPlatformSchoolCount(schools.length || null);
      setSchoolCountError(null);
      setIsSchoolCountLoading(false);
      return;
    }

    const fetchSchoolCount = async () => {
      setIsSchoolCountLoading(true);
      setSchoolCountError(null);

      try {
        const response = await API.get("/api/schools");
        const schoolList = response.data?.data || [];
        setPlatformSchoolCount(schoolList.length);
      } catch (error) {
        console.error(error);
        setPlatformSchoolCount(null);
        setSchoolCountError("Failed to load platform school count.");
      } finally {
        setIsSchoolCountLoading(false);
      }
    };

    fetchSchoolCount();
  }, [canListSchools, schools.length, schoolCountRetry]);

  useEffect(() => {
    if (!canViewVacancy) {
      setVacancyStats(null);
      setVacancyError(null);
      setShowVacancySection(false);
      setIsVacancyLoading(false);
      return;
    }

    const fetchVacancyStats = async () => {
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

    fetchVacancyStats();
  }, [canViewVacancy, activeSchoolId, vacancyRetry]);

  useEffect(() => {
    if (!canViewFinance) {
      setFinanceStats(null);
      setFinanceError(null);
      setIsFinanceLoading(false);
      return;
    }

    const fetchFinanceStats = async () => {
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

    fetchFinanceStats();
  }, [canViewFinance, activeSchoolId, financeRetry]);

  const safeSummary = summaryStats ?? {};
  const safeVacancyStats = vacancyStats ?? {
    sanctionedStrength: 0,
    filled: 0,
    vacant: 0,
    vacancyPercentage: "0",
  };
  const safeFinanceStats = financeStats ?? {
    total_budget_received: 0,
    total_expenditure: 0,
    available_balance: 0,
    budget_utilization_pct: 0,
    pending_requests_count: 0,
    pending_requests_amount: 0,
    year_label: null,
  };

  const platformSummaryStats = [
    {
      title: "Schools",
      value: isSchoolCountLoading || schoolCountError ? "—" : platformSchoolCount ?? schools.length ?? 0,
      icon: HiOutlineBuildingOffice2,
      accent: "from-violet-600 to-violet-500",
      description: "Schools registered on the platform",
    },
    {
      title: "Students",
      value: isSummaryLoading || summaryError ? "—" : safeSummary.total_students ?? 0,
      icon: HiOutlineUsers,
      accent: "from-orange-500 to-orange-600",
      description: activeSchool
        ? `Enrollment in ${activeSchool.school_name}`
        : "Platform-wide active enrollment",
    },
    {
      title: "Teachers",
      value: isSummaryLoading || summaryError ? "—" : safeSummary.total_teachers ?? 0,
      icon: HiOutlineAcademicCap,
      accent: "from-orange-400 to-amber-600",
      description: "Teaching staff in current scope",
    },
    {
      title: "Users",
      value: "—",
      icon: HiOutlineShieldCheck,
      accent: "from-sky-600 to-sky-500",
      description: "User provisioning UI planned for Sprint 2",
    },
  ];

  const operationsStats = [
    {
      title: "Total Classes",
      value: isSummaryLoading || summaryError ? "—" : safeSummary.total_classes ?? 0,
      icon: HiOutlineCalendarDays,
      accent: "from-amber-500 to-orange-600",
      description: "Class sections in current scope",
    },
    {
      title: "Attendance %",
      value: isSummaryLoading || summaryError ? "—" : `${safeSummary.attendance_percentage ?? 0}%`,
      icon: HiOutlineChartBar,
      accent: "from-emerald-600 to-emerald-500",
      description: "School-wide attendance snapshot",
    },
    {
      title: "Active School",
      value: activeSchool?.school_name || "Platform view",
      icon: HiOutlineCog6Tooth,
      accent: "from-orange-500 to-orange-700",
      description: activeSchool?.udise_code
        ? `UDISE ${activeSchool.udise_code}`
        : "Select school context to drill down",
    },
  ];

  const financeDashboardStats = [
    {
      title: "Total Budget Received",
      value: isFinanceLoading ? "—" : formatDashboardCurrency(safeFinanceStats.total_budget_received),
      icon: HiOutlineWallet,
      accent: "from-orange-500 to-orange-600",
      description: safeFinanceStats.year_label
        ? `Active FY ${safeFinanceStats.year_label}`
        : "Active financial year",
    },
    {
      title: "Total Expenditure",
      value: isFinanceLoading ? "—" : formatDashboardCurrency(safeFinanceStats.total_expenditure),
      icon: HiOutlineBanknotes,
      accent: "from-amber-500 to-orange-600",
      description: "Posted cashbook payments",
    },
    {
      title: "Available Balance",
      value: isFinanceLoading ? "—" : formatDashboardCurrency(safeFinanceStats.available_balance),
      icon: HiOutlineScale,
      accent: "from-emerald-600 to-emerald-500",
      description: "Budget received minus expenditure",
    },
    {
      title: "Budget Utilization",
      value: isFinanceLoading ? "—" : `${safeFinanceStats.budget_utilization_pct}%`,
      icon: HiOutlineChartPie,
      accent: "from-orange-400 to-amber-600",
      description: "Expenditure as share of budget",
    },
    {
      title: "Pending Requests",
      value: isFinanceLoading ? "—" : safeFinanceStats.pending_requests_count,
      icon: HiOutlineClipboardDocumentList,
      accent: "from-amber-500 to-orange-600",
      description: isFinanceLoading
        ? "Awaiting approval"
        : `${formatDashboardCurrency(safeFinanceStats.pending_requests_amount)} pending amount`,
    },
  ];

  const vacancyDashboardStats = [
    {
      title: "Sanctioned Positions",
      value: isVacancyLoading ? "—" : safeVacancyStats.sanctionedStrength,
      icon: HiOutlineUsers,
      accent: "from-orange-500 to-orange-700",
      description: "Approved staff posts",
    },
    {
      title: "Filled Positions",
      value: isVacancyLoading ? "—" : safeVacancyStats.filled,
      icon: HiOutlineUserGroup,
      accent: "from-emerald-600 to-emerald-500",
      description: "Currently occupied posts",
    },
    {
      title: "Vacant Positions",
      value: isVacancyLoading ? "—" : safeVacancyStats.vacant,
      icon: HiOutlineUserMinus,
      accent: "from-rose-500 to-red-500",
      description: "Open sanctioned posts",
    },
    {
      title: "Vacancy Rate",
      value: isVacancyLoading ? "—" : `${safeVacancyStats.vacancyPercentage}%`,
      icon: HiOutlineChartPie,
      accent: "from-amber-500 to-orange-600",
      description: "Vacant share of sanctioned strength",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-orange-300">Platform Operations</p>
        <h1 className="mt-3 text-4xl font-bold text-white">Platform Control Center</h1>
        <p className="mt-2 max-w-3xl text-slate-300">
          Cross-tenant oversight for schools, users, and system configuration — drill into any school
          context for operational modules.
        </p>
      </div>

      {schools.length > 1 && activeSchool ? (
        <Alert variant="info">
          Metrics below reflect the active school context ({activeSchool.school_name}). A platform
          school picker is planned for Sprint 2.
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

      <div className="space-y-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-orange-300">Platform Summary</p>
          <h2 className="mt-3 text-2xl font-bold text-white">Tenant Health</h2>
          <p className="mt-2 max-w-2xl text-slate-300">
            High-level counts across the platform and the active school context.
          </p>
        </div>
        {schoolCountError || summaryError ? (
          <DashboardWidgetError
            message={schoolCountError || summaryError}
            onRetry={() => {
              if (schoolCountError) {
                setSchoolCountRetry((key) => key + 1);
              }
              if (summaryError) {
                setSummaryRetry((key) => key + 1);
              }
            }}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {platformSummaryStats.map((stat) => (
              <StatsCard key={stat.title} {...stat} />
            ))}
          </div>
        )}
      </div>

      {canViewSummary ? (
        <div className="space-y-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-orange-300">School Operations</p>
            <h2 className="mt-3 text-2xl font-bold text-white">Enrollment & Attendance</h2>
            <p className="mt-2 max-w-2xl text-slate-300">
              Operational snapshot for the current scope — switches with active school context.
            </p>
          </div>
          {summaryError ? (
            <DashboardWidgetError
              message={summaryError}
              onRetry={() => setSummaryRetry((key) => key + 1)}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {operationsStats.map((stat) => (
                <StatsCard key={stat.title} {...stat} />
              ))}
            </div>
          )}
        </div>
      ) : null}

      {canViewFinance ? (
        <div className="space-y-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-orange-300">Finance</p>
            <h2 className="mt-3 text-2xl font-bold text-white">Budget & Expenditure</h2>
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
              Sanctioned staff strength, filled positions, and current vacancy rate.
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

export default SuperAdminDashboard;
