import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  HiOutlineAcademicCap,
  HiOutlineBanknotes,
  HiOutlineCalendarDays,
  HiOutlineChartBar,
  HiOutlineChartPie,
  HiOutlineClipboardDocumentList,
  HiOutlineArchiveBox,
  HiOutlineScale,
  HiOutlineUsers,
  HiOutlineWallet,
} from "react-icons/hi2";
import API from "../../api/axios";
import {
  fetchCashbookSummary,
  fetchExpenseRequestSummary,
  fetchFinanceDashboardMetrics,
  fetchFinancialYears,
} from "../../api/finance";
import { fetchStockDashboard } from "../../api/stock";
import StatsCard from "../../components/StatsCard";
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

const getSummaryRow = (summary, status) =>
  summary.find((row) => row.status === status) || {
    request_count: 0,
    total_amount: 0,
  };

const QUICK_ACTIONS = [
  {
    label: "Student Records",
    description: "Admit and update student data",
    to: "/students",
    icon: HiOutlineUsers,
    permission: "student.read",
  },
  {
    label: "Payment Queue",
    description: "Mark approved requests as paid",
    to: "/finance/expense-requests",
    icon: HiOutlineClipboardDocumentList,
    permission: "finance.expense_request.read",
  },
  {
    label: "Cashbook",
    description: "Review posted payments",
    to: "/finance/cashbook",
    icon: HiOutlineBanknotes,
    permission: "finance.cashbook.read",
  },
  {
    label: "Stock Register",
    description: "Record inward stock and issues",
    to: "/stock-register",
    icon: HiOutlineArchiveBox,
    permission: "stock.register.read",
  },
];

function OfficeStaffDashboard() {
  const { can, canAny } = usePermissions();
  const canViewFinance = can("dashboard.finance.read");
  const canViewStock = can("stock.dashboard.read");

  const [summaryStats, setSummaryStats] = useState(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);
  const [financeStats, setFinanceStats] = useState(null);
  const [isFinanceLoading, setIsFinanceLoading] = useState(true);
  const [expenseSummary, setExpenseSummary] = useState([]);
  const [isPaymentLoading, setIsPaymentLoading] = useState(true);
  const [cashbookSummary, setCashbookSummary] = useState(null);
  const [isCashbookLoading, setIsCashbookLoading] = useState(true);
  const [stockDashboard, setStockDashboard] = useState(null);
  const [isStockLoading, setIsStockLoading] = useState(true);
  const [activeFyLabel, setActiveFyLabel] = useState(null);
  const [activeFyId, setActiveFyId] = useState(null);
  const [summaryError, setSummaryError] = useState(null);
  const [financeError, setFinanceError] = useState(null);
  const [paymentError, setPaymentError] = useState(null);
  const [cashbookError, setCashbookError] = useState(null);
  const [stockError, setStockError] = useState(null);
  const [summaryRetry, setSummaryRetry] = useState(0);
  const [financeRetry, setFinanceRetry] = useState(0);
  const [paymentRetry, setPaymentRetry] = useState(0);
  const [cashbookRetry, setCashbookRetry] = useState(0);
  const [stockRetry, setStockRetry] = useState(0);
  const [fyRetry, setFyRetry] = useState(0);

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
        setSummaryError("Failed to load student records summary.");
      } finally {
        setIsSummaryLoading(false);
      }
    };

    fetchSummary();
  }, [summaryRetry]);

  useEffect(() => {
    const loadFinancialYear = async () => {
      try {
        const yearsResponse = await fetchFinancialYears();
        const years = yearsResponse?.data?.data || [];
        const activeYear = years.find((year) => year.status === "active") || years[0];

        setActiveFyId(activeYear?.id || null);
        setActiveFyLabel(activeYear?.year_label || null);
        setPaymentError(null);
        setCashbookError(null);
      } catch (error) {
        console.error(error);
        setActiveFyId(null);
        setActiveFyLabel(null);
        setPaymentError("Failed to load financial year context.");
        setCashbookError("Failed to load financial year context.");
      }
    };

    loadFinancialYear();
  }, [fyRetry]);

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
        setFinanceError("Failed to load finance summary.");
      } finally {
        setIsFinanceLoading(false);
      }
    };

    fetchFinance();
  }, [canViewFinance, financeRetry]);

  useEffect(() => {
    const loadPaymentQueue = async () => {
      setIsPaymentLoading(true);
      if (activeFyId) {
        setPaymentError(null);
      }

      try {
        if (!activeFyId) {
          setExpenseSummary([]);
          return;
        }

        const summaryResponse = await fetchExpenseRequestSummary({
          financial_year_id: activeFyId,
        });
        setExpenseSummary(summaryResponse?.data?.data || []);
      } catch (error) {
        console.error(error);
        setExpenseSummary([]);
        setPaymentError("Failed to load payment queue metrics.");
      } finally {
        setIsPaymentLoading(false);
      }
    };

    loadPaymentQueue();
  }, [activeFyId, paymentRetry]);

  useEffect(() => {
    const loadCashbook = async () => {
      setIsCashbookLoading(true);
      if (activeFyId) {
        setCashbookError(null);
      }

      try {
        if (!activeFyId) {
          setCashbookSummary(null);
          return;
        }

        const response = await fetchCashbookSummary({
          financial_year_id: activeFyId,
        });
        setCashbookSummary(response?.data?.data || null);
      } catch (error) {
        console.error(error);
        setCashbookSummary(null);
        setCashbookError("Failed to load cashbook summary.");
      } finally {
        setIsCashbookLoading(false);
      }
    };

    loadCashbook();
  }, [activeFyId, cashbookRetry]);

  useEffect(() => {
    if (!canViewStock) {
      setStockDashboard(null);
      setIsStockLoading(false);
      return;
    }

    const loadStock = async () => {
      setIsStockLoading(true);
      setStockError(null);

      try {
        const response = await fetchStockDashboard();
        setStockDashboard(response?.data?.data || null);
      } catch (error) {
        console.error(error);
        setStockDashboard(null);
        setStockError("Failed to load stock summary.");
      } finally {
        setIsStockLoading(false);
      }
    };

    loadStock();
  }, [canViewStock, stockRetry]);

  const safeSummary = summaryStats ?? {
    total_students: 0,
    total_teachers: 0,
    total_classes: 0,
    attendance_percentage: 0,
  };
  const safeFinance = financeStats ?? {
    total_budget_received: 0,
    total_expenditure: 0,
    available_balance: 0,
    budget_utilization_pct: 0,
    year_label: null,
  };
  const approvedSummary = useMemo(
    () => getSummaryRow(expenseSummary, "approved"),
    [expenseSummary]
  );
  const paidSummary = useMemo(() => getSummaryRow(expenseSummary, "paid"), [expenseSummary]);

  const studentRecordsStats = [
    {
      title: "Total Students",
      value: isSummaryLoading || summaryError ? "—" : safeSummary.total_students ?? 0,
      icon: HiOutlineUsers,
      accent: "from-orange-500 to-orange-600",
      description: "Enrolled in this school",
    },
    {
      title: "Total Classes",
      value: isSummaryLoading || summaryError ? "—" : safeSummary.total_classes ?? 0,
      icon: HiOutlineCalendarDays,
      accent: "from-amber-500 to-orange-600",
      description: "Class sections on record",
    },
    {
      title: "Attendance Rate",
      value: isSummaryLoading || summaryError ? "—" : `${safeSummary.attendance_percentage ?? 0}%`,
      icon: HiOutlineChartBar,
      accent: "from-emerald-600 to-emerald-500",
      description: "School-wide attendance snapshot",
    },
    {
      title: "Active Teachers",
      value: isSummaryLoading || summaryError ? "—" : safeSummary.total_teachers ?? 0,
      icon: HiOutlineAcademicCap,
      accent: "from-orange-400 to-amber-600",
      description: "Teaching staff on record",
    },
  ];

  const financeSummaryStats = [
    {
      title: "Budget Received",
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
  ];

  const paymentQueueStats = [
    {
      title: "Approved Awaiting Payment",
      value: isPaymentLoading ? "—" : approvedSummary.request_count,
      icon: HiOutlineClipboardDocumentList,
      accent: "from-amber-500 to-orange-600",
      description: isPaymentLoading
        ? "Loading payment queue"
        : `${formatCurrency(approvedSummary.total_amount)} ready to disburse`,
    },
    {
      title: "Paid This FY",
      value: isPaymentLoading ? "—" : paidSummary.request_count,
      icon: HiOutlineWallet,
      accent: "from-emerald-600 to-emerald-500",
      description: isPaymentLoading
        ? "Loading payment history"
        : `${formatCurrency(paidSummary.total_amount)} disbursed`,
    },
  ];

  const cashbookStats = [
    {
      title: "Payments Posted (FY)",
      value: isCashbookLoading ? "—" : cashbookSummary?.payment_count ?? 0,
      icon: HiOutlineBanknotes,
      accent: "from-orange-500 to-orange-600",
      description: activeFyLabel ? `Cashbook entries in ${activeFyLabel}` : "Active financial year",
    },
    {
      title: "Total Outflow (FY)",
      value: isCashbookLoading ? "—" : formatCurrency(cashbookSummary?.total_outflow || 0),
      icon: HiOutlineWallet,
      accent: "from-amber-500 to-orange-600",
      description: "Posted payment amounts in cashbook",
    },
    {
      title: "Budget Heads Used",
      value: isCashbookLoading ? "—" : cashbookSummary?.expenditure_by_head?.length || 0,
      icon: HiOutlineChartPie,
      accent: "from-emerald-600 to-emerald-500",
      description: "Heads with recorded payments",
    },
  ];

  const stockSummaryStats = [
    {
      title: "Stock Items",
      value: isStockLoading ? "—" : stockDashboard?.total_items ?? 0,
      icon: HiOutlineArchiveBox,
      accent: "from-orange-500 to-orange-600",
      description: "Distinct items in register",
    },
    {
      title: "Inventory Value",
      value: isStockLoading ? "—" : formatCurrency(stockDashboard?.total_value || 0),
      icon: HiOutlineScale,
      accent: "from-amber-500 to-orange-600",
      description: "Total stock on hand",
    },
    {
      title: "Low Stock Alerts",
      value: isStockLoading ? "—" : stockDashboard?.low_stock_count ?? 0,
      icon: HiOutlineChartBar,
      accent: "from-rose-500 to-red-500",
      description: "Items below threshold",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-orange-300">School Office</p>
        <h1 className="mt-3 text-4xl font-bold text-white">Office Desk</h1>
        <p className="mt-2 max-w-2xl text-slate-300">
          Manage student records, process approved payments, reconcile cashbook entries, and track
          inventory from one desk.
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
          <p className="text-sm uppercase tracking-[0.3em] text-orange-300">Records Desk</p>
          <h2 className="mt-3 text-2xl font-bold text-white">Student Records Summary</h2>
          <p className="mt-2 max-w-2xl text-slate-300">
            Enrollment and attendance reference for admissions and daily desk work.
          </p>
        </div>
        {summaryError ? (
          <DashboardWidgetError
            message={summaryError}
            onRetry={() => setSummaryRetry((key) => key + 1)}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {studentRecordsStats.map((stat) => (
              <StatsCard key={stat.title} {...stat} />
            ))}
          </div>
        )}
      </div>

      {canViewFinance ? (
        <div className="space-y-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-orange-300">Finance Desk</p>
            <h2 className="mt-3 text-2xl font-bold text-white">Finance Summary</h2>
            <p className="mt-2 max-w-2xl text-slate-300">
              Budget position for the active financial year — use alongside cashbook reconciliation.
            </p>
          </div>
          {financeError ? (
            <DashboardWidgetError
              message={financeError}
              onRetry={() => setFinanceRetry((key) => key + 1)}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {financeSummaryStats.map((stat) => (
                <StatsCard key={stat.title} {...stat} />
              ))}
            </div>
          )}
        </div>
      ) : null}

      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-orange-300">Payment Desk</p>
            <h2 className="mt-3 text-2xl font-bold text-white">Approved Awaiting Payment</h2>
            <p className="mt-2 max-w-2xl text-slate-300">
              Expense requests approved by the principal and ready for disbursement.
            </p>
          </div>
          <Link
            to="/finance/expense-requests"
            className="inline-flex items-center justify-center rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-400"
          >
            Open Payment Queue
          </Link>
        </div>
        {paymentError ? (
          <DashboardWidgetError
            message={paymentError}
            onRetry={() => {
              setFyRetry((key) => key + 1);
              setPaymentRetry((key) => key + 1);
            }}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {paymentQueueStats.map((stat) => (
              <StatsCard key={stat.title} {...stat} />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-orange-300">Cashbook</p>
            <h2 className="mt-3 text-2xl font-bold text-white">Cashbook Summary</h2>
            <p className="mt-2 max-w-2xl text-slate-300">
              Posted payments for reconciliation and accounts reporting.
            </p>
          </div>
          <Link
            to="/finance/cashbook"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:border-orange-500/40"
          >
            Open Cashbook
          </Link>
        </div>
        {cashbookError ? (
          <DashboardWidgetError
            message={cashbookError}
            onRetry={() => {
              setFyRetry((key) => key + 1);
              setCashbookRetry((key) => key + 1);
            }}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {cashbookStats.map((stat) => (
              <StatsCard key={stat.title} {...stat} />
            ))}
          </div>
        )}
      </div>

      {canViewStock ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-orange-300">Inventory</p>
              <h2 className="mt-3 text-2xl font-bold text-white">Stock Summary</h2>
              <p className="mt-2 max-w-2xl text-slate-300">
                Inventory on hand and low-stock alerts for the school store desk.
              </p>
            </div>
            <Link
              to="/stock-register"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:border-orange-500/40"
            >
              Open Stock Register
            </Link>
          </div>
          {stockError ? (
            <DashboardWidgetError
              message={stockError}
              onRetry={() => setStockRetry((key) => key + 1)}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {stockSummaryStats.map((stat) => (
                <StatsCard key={stat.title} {...stat} />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default OfficeStaffDashboard;
