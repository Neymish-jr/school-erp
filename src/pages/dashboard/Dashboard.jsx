import { useEffect, useState } from "react";
import {
  HiOutlineAcademicCap,
  HiOutlineBanknotes,
  HiOutlineCalendarDays,
  HiOutlineChartBar,
  HiOutlineChartPie,
  HiOutlineClipboardDocumentList,
  HiOutlineScale,
  HiOutlineUserGroup,
  HiOutlineUserMinus,
  HiOutlineUsers,
  HiOutlineWallet,
} from "react-icons/hi2";
import API from "../../api/axios";
import { fetchFinanceDashboardMetrics } from "../../api/finance";
import DashboardLayout from "../../layouts/DashboardLayout";
import StatsCard from "../../components/StatsCard";
import { getAuthRole } from "../../utils/auth";

const parseWidgetValue = (response) => {
  const value = response?.data?.data;

  if (typeof value === "number" && !Number.isNaN(value)) {
    return value;
  }

  return 0;
};

const computeVacancyPercentage = (vacant, sanctionedStrength) => {
  if (sanctionedStrength <= 0) {
    return "0";
  }

  return ((vacant / sanctionedStrength) * 100).toFixed(1);
};

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

function Dashboard() {
  const role = getAuthRole();
  const canViewFinance = ["admin", "super_admin"].includes(role);

  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [vacancyStats, setVacancyStats] = useState(null);
  const [isVacancyLoading, setIsVacancyLoading] = useState(true);
  const [showVacancySection, setShowVacancySection] = useState(false);
  const [financeStats, setFinanceStats] = useState(null);
  const [isFinanceLoading, setIsFinanceLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);

      try {
        const res = await API.get("/api/dashboard");

        setStats(res.data || {});
      } catch (error) {
        console.error(error);
        setStats({});
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  useEffect(() => {
    const fetchVacancyStats = async () => {
      setIsVacancyLoading(true);

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
        setShowVacancySection(false);
      } finally {
        setIsVacancyLoading(false);
      }
    };

    fetchVacancyStats();
  }, []);

  useEffect(() => {
    if (!canViewFinance) {
      setFinanceStats(null);
      setIsFinanceLoading(false);
      return;
    }

    const fetchFinanceStats = async () => {
      setIsFinanceLoading(true);

      try {
        const response = await fetchFinanceDashboardMetrics();
        setFinanceStats(response?.data?.data || null);
      } catch (error) {
        console.error(error);
        setFinanceStats(null);
      } finally {
        setIsFinanceLoading(false);
      }
    };

    fetchFinanceStats();
  }, [canViewFinance]);

  const safeStats = stats || {};
  const safeVacancyStats = vacancyStats || {
    sanctionedStrength: 0,
    filled: 0,
    vacant: 0,
    vacancyPercentage: "0",
  };
  const safeFinanceStats = financeStats || {
    total_budget_received: 0,
    total_expenditure: 0,
    available_balance: 0,
    budget_utilization_pct: 0,
    pending_requests_count: 0,
    pending_requests_amount: 0,
    year_label: null,
  };

  const dashboardStats = [
    {
      title: "Total Students",
      value: isLoading ? 0 : safeStats.total_students ?? 0,
      icon: HiOutlineUsers,
      accent: "from-orange-500 to-orange-600",
    },
    {
      title: "Active Teachers",
      value: isLoading ? 0 : safeStats.total_teachers ?? 0,
      icon: HiOutlineAcademicCap,
      accent: "from-orange-400 to-amber-600",
    },
    {
      title: "Total Classes",
      value: isLoading ? 0 : safeStats.total_classes ?? 0,
      icon: HiOutlineCalendarDays,
      accent: "from-amber-500 to-orange-600",
    },
    {
      title: "Attendance Percentage",
      value: isLoading ? 0 : safeStats.attendance_percentage ?? 0,
      icon: HiOutlineChartBar,
      accent: "from-emerald-600 to-emerald-500",
    },
  ];

  const financeDashboardStats = [
    {
      title: "Total Budget Received",
      value: isFinanceLoading ? "—" : formatCurrency(safeFinanceStats.total_budget_received),
      icon: HiOutlineWallet,
      accent: "from-orange-500 to-orange-600",
      description: safeFinanceStats.year_label
        ? `Active FY ${safeFinanceStats.year_label}`
        : "Active financial year",
    },
    {
      title: "Total Expenditure",
      value: isFinanceLoading ? "—" : formatCurrency(safeFinanceStats.total_expenditure),
      icon: HiOutlineBanknotes,
      accent: "from-amber-500 to-orange-600",
      description: "Posted cashbook payments",
    },
    {
      title: "Available Balance",
      value: isFinanceLoading ? "—" : formatCurrency(safeFinanceStats.available_balance),
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
        : `${formatCurrency(safeFinanceStats.pending_requests_amount)} pending amount`,
    },
  ];

  const vacancyDashboardStats = [
    {
      title: "Sanctioned Positions",
      value: isVacancyLoading ? 0 : safeVacancyStats.sanctionedStrength,
      icon: HiOutlineUsers,
      accent: "from-orange-500 to-orange-700",
    },
    {
      title: "Filled Positions",
      value: isVacancyLoading ? 0 : safeVacancyStats.filled,
      icon: HiOutlineUserGroup,
      accent: "from-emerald-600 to-emerald-500",
    },
    {
      title: "Vacant Positions",
      value: isVacancyLoading ? 0 : safeVacancyStats.vacant,
      icon: HiOutlineUserMinus,
      accent: "from-rose-500 to-red-500",
    },
    {
      title: "Vacancy Percentage",
      value: isVacancyLoading ? "0%" : `${safeVacancyStats.vacancyPercentage}%`,
      icon: HiOutlineChartPie,
      accent: "from-amber-500 to-orange-600",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-orange-300">
            Overview
          </p>
          <h1 className="mt-3 text-4xl font-bold text-white">
            School ERP Dashboard
          </h1>
          <p className="mt-2 max-w-2xl text-slate-300">
            Monitor student activity, staff performance, and key financial metrics from one modern dashboard.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {dashboardStats.map((stat) => (
            <StatsCard key={stat.title} {...stat} />
          ))}
        </div>

        {canViewFinance ? (
          <div className="space-y-4">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-orange-300">
                Finance
              </p>
              <h2 className="mt-3 text-2xl font-bold text-white">
                Budget & Expenditure
              </h2>
              <p className="mt-2 max-w-2xl text-slate-300">
                Live budget utilization from allocations, cashbook expenditure, and pending expense requests.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {financeDashboardStats.map((stat) => (
                <StatsCard key={stat.title} {...stat} />
              ))}
            </div>
          </div>
        ) : null}

        {showVacancySection && (
          <div className="space-y-4">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-orange-300">
                Staff Vacancy
              </p>
              <h2 className="mt-3 text-2xl font-bold text-white">
                Vacancy Summary
              </h2>
              <p className="mt-2 max-w-2xl text-slate-300">
                Sanctioned staff strength, filled positions, and current vacancy rate for your school.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {vacancyDashboardStats.map((stat) => (
                <StatsCard key={stat.title} {...stat} />
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default Dashboard;
