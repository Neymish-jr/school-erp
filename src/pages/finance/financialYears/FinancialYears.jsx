import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import DashboardLayout from "../../../layouts/DashboardLayout";
import {
  activateFinancialYear,
  closeFinancialYear,
  createFinancialYear,
  fetchFinancialYears,
  updateFinancialYear,
} from "../../../api/finance";
import { usePermissions } from "../../../hooks/usePermissions";
import {
  PageHeader,
  MetricGrid,
  MetricCard,
  FilterToolbar,
  FilterSearch,
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
  FormField,
  Input,
  FormActions,
  Badge,
} from "../../../design-system";

const COLUMN_WIDTHS = ["16%", "26%", "12%", "20%", "26%"];

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "closed", label: "Closed" },
];

const emptyForm = {
  year_label: "",
  remarks: "",
};

// TODO: Enable delete UI when RBAC phase introduces super_admin role.
// Backend DELETE /api/financial-years/:id remains protected by isSuperAdmin.

const sortFinancialYears = (years = []) =>
  [...years].sort((left, right) => {
    if (left.status === "active" && right.status !== "active") return -1;
    if (right.status === "active" && left.status !== "active") return 1;
    return String(right.start_date).localeCompare(String(left.start_date));
  });

const formatDisplayDate = (value) => {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateRange = (startDate, endDate) =>
  `${formatDisplayDate(startDate)} → ${formatDisplayDate(endDate)}`;

const StatusBadge = ({ status }) => {
  if (status === "active") {
    return <Badge variant="emerald">Active</Badge>;
  }

  return <Badge variant="default">Closed</Badge>;
};

function FinancialYears() {
  const { can, canAny } = usePermissions();
  const canCreateYear = can("finance.financial_year.create");
  const canUpdateYear = can("finance.financial_year.update");
  const canActivateYear = can("finance.financial_year.activate");
  const canCloseYear = can("finance.financial_year.close");
  const showActionsColumn = canAny([
    "finance.financial_year.update",
    "finance.financial_year.activate",
    "finance.financial_year.close",
  ]);

  const [financialYears, setFinancialYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingYear, setEditingYear] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [actionTargetId, setActionTargetId] = useState(null);

  const loadFinancialYears = useCallback(async () => {
    setError("");

    try {
      const response = await fetchFinancialYears({
        search: search.trim(),
        status: statusFilter || undefined,
      });
      const data = response?.data?.data || [];
      setFinancialYears(Array.isArray(data) ? data : []);
    } catch (err) {
      setFinancialYears([]);
      setError(err?.response?.data?.message || "Unable to load financial years.");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    setLoading(true);
    loadFinancialYears();
  }, [loadFinancialYears]);

  const sortedFinancialYears = useMemo(
    () => sortFinancialYears(financialYears),
    [financialYears]
  );

  const activeCount = useMemo(
    () => financialYears.filter((year) => year.status === "active").length,
    [financialYears]
  );

  const closedCount = useMemo(
    () => financialYears.filter((year) => year.status === "closed").length,
    [financialYears]
  );

  const openCreateModal = () => {
    setEditingYear(null);
    setFormData(emptyForm);
    setIsModalOpen(true);
  };

  const openEditModal = (year) => {
    setEditingYear(year);
    setFormData({
      year_label: year.year_label,
      remarks: year.remarks || "",
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingYear(null);
    setFormData(emptyForm);
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      if (editingYear) {
        await updateFinancialYear(editingYear.id, {
          remarks: formData.remarks.trim(),
        });
        toast.success("Financial year updated successfully");
      } else {
        await createFinancialYear({
          year_label: formData.year_label.trim(),
          remarks: formData.remarks.trim(),
        });
        toast.success("Financial year created successfully");
      }

      closeModal();
      setLoading(true);
      await loadFinancialYears();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to save financial year.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleActivate = async (year) => {
    setActionTargetId(year.id);

    try {
      await activateFinancialYear(year.id);
      toast.success(`${year.year_label} activated`);
      setLoading(true);
      await loadFinancialYears();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to activate financial year.");
    } finally {
      setActionTargetId(null);
    }
  };

  const handleClose = async (year) => {
    setActionTargetId(year.id);

    try {
      await closeFinancialYear(year.id);
      toast.success(`${year.year_label} closed`);
      setLoading(true);
      await loadFinancialYears();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to close financial year.");
    } finally {
      setActionTargetId(null);
    }
  };

  const previewDates = useMemo(() => {
    const match = formData.year_label.trim().match(/^(\d{4})-(\d{2})$/);
    if (!match) return null;

    const startYear = parseInt(match[1], 10);
    const suffix = parseInt(match[2], 10);
    const expectedSuffix = (startYear + 1) % 100;

    if (suffix !== expectedSuffix) return null;

    return formatDateRange(`${startYear}-04-01`, `${startYear + 1}-03-31`);
  }, [formData.year_label]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Financial Years"
          description="Manage Indian government financial years (01 April – 31 March). Dates are system-generated from the year label."
          actions={
            canCreateYear ? (
              <Button variant="primary" onClick={openCreateModal}>
                Add Financial Year
              </Button>
            ) : null
          }
        />

        {error ? <Alert variant="error">{error}</Alert> : null}

        <MetricGrid columns={3}>
          <MetricCard label="Total Years" value={financialYears.length} />
          <MetricCard label="Active" value={activeCount} accent="emerald" />
          <MetricCard label="Closed" value={closedCount} />
        </MetricGrid>

        <FilterToolbar>
          <FilterSearch
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by year label or remarks..."
          />
          <FilterSelect
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            options={STATUS_OPTIONS}
          />
        </FilterToolbar>

        <DataTable>
          <DataTableColGroup widths={COLUMN_WIDTHS} />
          <DataTableHead>
            <DataTableRow>
              <DataTableHeaderCell>Year</DataTableHeaderCell>
              <DataTableHeaderCell>Period</DataTableHeaderCell>
              <DataTableHeaderCell>Status</DataTableHeaderCell>
              <DataTableHeaderCell>Remarks</DataTableHeaderCell>
              {showActionsColumn ? (
                <DataTableHeaderCell align="right">Actions</DataTableHeaderCell>
              ) : null}
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {loading ? (
              <DataTableSkeleton columns={showActionsColumn ? 5 : 4} rows={4} />
            ) : sortedFinancialYears.length === 0 ? (
              <DataTableEmpty colSpan={showActionsColumn ? 5 : 4} message="No financial years found." />
            ) : (
              sortedFinancialYears.map((year) => (
                <DataTableRow key={year.id}>
                  <DataTableCell>
                    <div className="font-semibold text-slate-100">FY {year.year_label}</div>
                  </DataTableCell>
                  <DataTableCell>{formatDateRange(year.start_date, year.end_date)}</DataTableCell>
                  <DataTableCell>
                    <StatusBadge status={year.status} />
                  </DataTableCell>
                  <DataTableCell>
                    <span className="text-slate-300">{year.remarks || "—"}</span>
                  </DataTableCell>
                  {showActionsColumn ? (
                    <DataTableCell align="right">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {canUpdateYear ? (
                          <Button variant="ghost" onClick={() => openEditModal(year)}>
                            Edit
                          </Button>
                        ) : null}
                        {year.status === "closed" && canActivateYear ? (
                          <Button
                            variant="secondary"
                            disabled={actionTargetId === year.id}
                            onClick={() => handleActivate(year)}
                          >
                            Activate
                          </Button>
                        ) : null}
                        {year.status !== "closed" && canCloseYear ? (
                          <Button
                            variant="secondary"
                            disabled={actionTargetId === year.id}
                            onClick={() => handleClose(year)}
                          >
                            Close
                          </Button>
                        ) : null}
                      </div>
                    </DataTableCell>
                  ) : null}
                </DataTableRow>
              ))
            )}
          </DataTableBody>
        </DataTable>
      </div>

      <ErpModal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingYear ? "Edit Financial Year" : "Create Financial Year"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {!editingYear ? (
            <>
              <FormField label="Year Label (YYYY-YY, e.g. 2026-27)">
                <Input
                  name="year_label"
                  value={formData.year_label}
                  onChange={handleInputChange}
                  placeholder="2026-27"
                  required
                />
              </FormField>
              {previewDates ? (
                <Alert variant="info">
                  System period: <strong>{previewDates}</strong>
                </Alert>
              ) : null}
            </>
          ) : (
            <FormField label="Year Label">
              <Input value={`FY ${editingYear.year_label}`} disabled readOnly />
            </FormField>
          )}

          {editingYear ? (
            <FormField label="Period">
              <Input
                value={formatDateRange(editingYear.start_date, editingYear.end_date)}
                disabled
                readOnly
              />
            </FormField>
          ) : null}

          <FormField label="Remarks">
            <Input
              name="remarks"
              value={formData.remarks}
              onChange={handleInputChange}
              placeholder="Optional order reference or notes"
            />
          </FormField>

          <FormActions>
            <Button type="button" variant="ghost" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSaving}>
              {isSaving ? "Saving..." : editingYear ? "Update" : "Create"}
            </Button>
          </FormActions>
        </form>
      </ErpModal>
    </DashboardLayout>
  );
}

export default FinancialYears;
