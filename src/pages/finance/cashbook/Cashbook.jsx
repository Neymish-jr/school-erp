import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import DashboardLayout from "../../../layouts/DashboardLayout";
import {
  exportCashbookXlsx,
  fetchBudgetHeads,
  fetchBudgetSubHeads,
  fetchCashbookEntries,
  fetchCashbookEntryById,
  fetchCashbookSummary,
  fetchFinancialYears,
} from "../../../api/finance";
import {
  PageHeader,
  MetricGrid,
  MetricCard,
  FilterToolbar,
  FilterSelect,
  Button,
  Alert,
  DataTable,
  DataTableColGroup,
  DataTableHead,
  DataTableBody,
  DataTableRow,
  DataTableHeaderCell,
  DataTableCell,
  DataTableEmpty,
  DataTableSkeleton,
  ErpModal,
  Input,
} from "../../../design-system";

const COLUMN_WIDTHS = ["10%", "10%", "14%", "14%", "18%", "12%", "12%", "10%"];

const formatCurrency = (value) => {
  const amount = Number(value);
  if (Number.isNaN(amount)) return "—";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

function Cashbook() {
  const [financialYears, setFinancialYears] = useState([]);
  const [budgetHeads, setBudgetHeads] = useState([]);
  const [budgetSubHeads, setBudgetSubHeads] = useState([]);
  const [selectedFyId, setSelectedFyId] = useState("");
  const [selectedHeadId, setSelectedHeadId] = useState("");
  const [selectedSubHeadId, setSelectedSubHeadId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, total_pages: 1 });
  const [isReferenceReady, setIsReferenceReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState("");
  const [detailEntry, setDetailEntry] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const selectedFinancialYear = useMemo(
    () => financialYears.find((fy) => String(fy.id) === String(selectedFyId)),
    [financialYears, selectedFyId]
  );

  const filteredSubHeads = useMemo(() => {
    if (!selectedHeadId) return budgetSubHeads;
    return budgetSubHeads.filter(
      (subHead) => String(subHead.budget_head_id) === String(selectedHeadId)
    );
  }, [budgetSubHeads, selectedHeadId]);

  const financialYearOptions = useMemo(
    () => [
      { value: "", label: "All years" },
      ...financialYears.map((fy) => ({
        value: String(fy.id),
        label: `${fy.year_label} (${fy.status})`,
      })),
    ],
    [financialYears]
  );

  const budgetHeadOptions = useMemo(
    () => [
      { value: "", label: "All heads" },
      ...budgetHeads.map((head) => ({
        value: String(head.id),
        label: head.head_name,
      })),
    ],
    [budgetHeads]
  );

  const budgetSubHeadOptions = useMemo(
    () => [
      { value: "", label: "All sub heads" },
      ...filteredSubHeads.map((subHead) => ({
        value: String(subHead.id),
        label: subHead.sub_head_name,
      })),
    ],
    [filteredSubHeads]
  );

  const loadReferenceData = useCallback(async () => {
    try {
      const [fyRes, headsRes, subHeadsRes] = await Promise.all([
        fetchFinancialYears(),
        fetchBudgetHeads({ is_active: true }),
        fetchBudgetSubHeads({ is_active: true }),
      ]);

      const fyData = fyRes?.data?.data || [];
      setFinancialYears(fyData);
      setBudgetHeads(headsRes?.data?.data || []);
      setBudgetSubHeads(subHeadsRes?.data?.data || []);

      const activeFy = fyData.find((fy) => fy.status === "active");
      if (activeFy) {
        setSelectedFyId(String(activeFy.id));
      } else if (fyData[0]) {
        setSelectedFyId(String(fyData[0].id));
      }
    } catch (loadError) {
      console.error(loadError);
      setError("Failed to load cashbook reference data.");
    } finally {
      setIsReferenceReady(true);
    }
  }, []);

  const loadCashbook = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
      };

      if (selectedFyId) params.financial_year_id = selectedFyId;
      if (selectedHeadId) params.budget_head_id = selectedHeadId;
      if (selectedSubHeadId) params.budget_sub_head_id = selectedSubHeadId;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (search.trim()) params.search = search.trim();

      const [listRes, summaryRes] = await Promise.all([
        fetchCashbookEntries(params),
        fetchCashbookSummary({
          financial_year_id: selectedFyId || undefined,
          budget_head_id: selectedHeadId || undefined,
          budget_sub_head_id: selectedSubHeadId || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
        }),
      ]);

      setEntries(listRes?.data?.data || []);
      if (listRes?.data?.pagination) {
        setPagination(listRes.data.pagination);
      }
      setSummary(summaryRes?.data?.data || null);
    } catch (loadError) {
      console.error(loadError);
      setError(loadError?.response?.data?.message || "Failed to load cashbook entries.");
      setEntries([]);
      setSummary(null);
    } finally {
      setIsLoading(false);
    }
  }, [
    dateFrom,
    dateTo,
    pagination.limit,
    pagination.page,
    search,
    selectedFyId,
    selectedHeadId,
    selectedSubHeadId,
  ]);

  useEffect(() => {
    loadReferenceData();
  }, [loadReferenceData]);

  useEffect(() => {
    if (!isReferenceReady) {
      return;
    }

    loadCashbook();
  }, [loadCashbook, isReferenceReady]);

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const params = {};
      if (selectedFyId) params.financial_year_id = selectedFyId;
      if (selectedHeadId) params.budget_head_id = selectedHeadId;
      if (selectedSubHeadId) params.budget_sub_head_id = selectedSubHeadId;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (search.trim()) params.search = search.trim();

      const response = await exportCashbookXlsx(params);
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const yearLabel = selectedFinancialYear?.year_label || "Export";
      link.href = url;
      link.download = `Cashbook_${yearLabel}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Cashbook exported successfully.");
    } catch (exportError) {
      console.error(exportError);
      toast.error("Failed to export cashbook.");
    } finally {
      setIsExporting(false);
    }
  };

  const openDetail = async (entryId) => {
    setIsDetailOpen(true);
    setIsDetailLoading(true);
    setDetailEntry(null);

    try {
      const response = await fetchCashbookEntryById(entryId);
      setDetailEntry(response?.data?.data || null);
    } catch (detailError) {
      console.error(detailError);
      toast.error("Failed to load cashbook entry details.");
      setIsDetailOpen(false);
    } finally {
      setIsDetailLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Finance"
          title="Cashbook"
          description="Read-only expenditure register sourced from paid expense requests. Ledger entries are immutable once posted."
          actions={
            <Button variant="secondary" onClick={handleExport} disabled={isExporting || isLoading}>
              {isExporting ? "Exporting…" : "Export XLSX"}
            </Button>
          }
        />

        {error ? <Alert variant="error">{error}</Alert> : null}

        <MetricGrid columns={4}>
          <MetricCard
            label="Total Outflow"
            value={formatCurrency(summary?.total_outflow || 0)}
            accent="orange"
          />
          <MetricCard label="Payments Recorded" value={summary?.payment_count || 0} accent="amber" />
          <MetricCard
            label="Budget Heads"
            value={summary?.expenditure_by_head?.length || 0}
          />
          <MetricCard
            label="Financial Year"
            value={selectedFinancialYear?.year_label || "All years"}
            hint="Active filter"
          />
        </MetricGrid>

        <FilterToolbar>
          <FilterSelect
            label="Financial Year"
            value={selectedFyId}
            onChange={(event) => {
              setSelectedFyId(event.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            options={financialYearOptions}
          />

          <FilterSelect
            label="Budget Head"
            value={selectedHeadId}
            onChange={(event) => {
              setSelectedHeadId(event.target.value);
              setSelectedSubHeadId("");
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            options={budgetHeadOptions}
          />

          <FilterSelect
            label="Sub Head"
            value={selectedSubHeadId}
            onChange={(event) => {
              setSelectedSubHeadId(event.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            options={budgetSubHeadOptions}
          />

          <label className="block text-sm">
            <span className="font-medium text-slate-300">From</span>
            <Input
              type="date"
              className="mt-1.5"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium text-slate-300">To</span>
            <Input
              type="date"
              className="mt-1.5"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
            />
          </label>

          <label className="block text-sm md:col-span-2">
            <span className="font-medium text-slate-300">Search</span>
            <Input
              className="mt-1.5"
              placeholder="Voucher, vendor, purpose, UTR…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </FilterToolbar>

        <div className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/70">
          <DataTable>
            <DataTableColGroup widths={COLUMN_WIDTHS} />
            <DataTableHead>
              <DataTableRow>
                <DataTableHeaderCell>Date</DataTableHeaderCell>
                <DataTableHeaderCell>Voucher</DataTableHeaderCell>
                <DataTableHeaderCell>Head</DataTableHeaderCell>
                <DataTableHeaderCell>Sub Head</DataTableHeaderCell>
                <DataTableHeaderCell>Purpose</DataTableHeaderCell>
                <DataTableHeaderCell>Vendor</DataTableHeaderCell>
                <DataTableHeaderCell>Amount</DataTableHeaderCell>
                <DataTableHeaderCell>UTR / Txn ID</DataTableHeaderCell>
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {isLoading ? (
                <DataTableSkeleton cols={8} rows={6} />
              ) : entries.length === 0 ? (
                <DataTableEmpty colSpan={8} message="No cashbook entries found for the selected filters." />
              ) : (
                entries.map((entry) => (
                  <DataTableRow
                    key={entry.id}
                    className="cursor-pointer"
                    onClick={() => openDetail(entry.id)}
                  >
                    <DataTableCell>{formatDate(entry.entry_date)}</DataTableCell>
                    <DataTableCell>{entry.voucher_no || "—"}</DataTableCell>
                    <DataTableCell>{entry.budget_head_name}</DataTableCell>
                    <DataTableCell>{entry.sub_head_name}</DataTableCell>
                    <DataTableCell className="max-w-[16rem] truncate">{entry.description}</DataTableCell>
                    <DataTableCell>{entry.vendor_name || "—"}</DataTableCell>
                    <DataTableCell>{formatCurrency(entry.amount)}</DataTableCell>
                    <DataTableCell>{entry.transaction_id || "—"}</DataTableCell>
                  </DataTableRow>
                ))
              )}
            </DataTableBody>
          </DataTable>
        </div>

        {!isLoading && pagination.total_pages > 1 ? (
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-slate-500">
              Page {pagination.page} of {pagination.total_pages} ({pagination.total} entries)
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                disabled={pagination.page <= 1}
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                disabled={pagination.page >= pagination.total_pages}
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <ErpModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        eyebrow="Ledger Entry"
        title={isDetailLoading ? "Loading…" : detailEntry?.description || "Cashbook Entry"}
        size="lg"
      >
        {isDetailLoading ? (
          <p className="text-slate-400">Loading entry details…</p>
        ) : detailEntry ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Date</p>
              <p className="mt-1 text-white">{formatDate(detailEntry.entry_date)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Amount</p>
              <p className="mt-1 text-white">{formatCurrency(detailEntry.amount)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Voucher No</p>
              <p className="mt-1 text-white">{detailEntry.voucher_no || "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Transaction ID</p>
              <p className="mt-1 text-white">{detailEntry.transaction_id || "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Budget Head</p>
              <p className="mt-1 text-white">{detailEntry.budget_head_name}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Sub Head</p>
              <p className="mt-1 text-white">{detailEntry.sub_head_name}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Vendor</p>
              <p className="mt-1 text-white">{detailEntry.vendor_name || "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Posted By</p>
              <p className="mt-1 text-white">{detailEntry.posted_by_name || "—"}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">Expense Request</p>
              <p className="mt-1 text-white">#{detailEntry.expense_request_id || "—"}</p>
            </div>
          </div>
        ) : null}
      </ErpModal>
    </DashboardLayout>
  );
}

export default Cashbook;
