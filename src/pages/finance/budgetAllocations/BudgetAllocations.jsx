import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import API from "../../../api/axios";
import DashboardLayout from "../../../layouts/DashboardLayout";
import {
  createBudgetAllocation,
  fetchBudgetAllocationSummary,
  fetchBudgetAllocations,
  fetchBudgetHeads,
  fetchBudgetSubHeads,
  fetchFinancialYears,
  updateBudgetAllocation,
  updateBudgetAllocationStatus,
} from "../../../api/finance";
import { isActiveStaffTeacher } from "../../teachers/constants/teacherStatus";
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
  FormField,
  Input,
  Select,
  FormActions,
  Badge,
} from "../../../design-system";

const COLUMN_WIDTHS = ["16%", "16%", "14%", "14%", "16%", "8%", "16%"];

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const emptyForm = {
  budget_sub_head_id: "",
  allocated_amount: "",
  responsible_teacher_id: "",
  remarks: "",
};

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

const StatusBadge = ({ isActive }) =>
  isActive ? <Badge variant="emerald">Active</Badge> : <Badge variant="default">Inactive</Badge>;

function BudgetAllocations() {
  const [financialYears, setFinancialYears] = useState([]);
  const [selectedFyId, setSelectedFyId] = useState("");
  const [allocations, setAllocations] = useState([]);
  const [summary, setSummary] = useState(null);
  const [budgetHeads, setBudgetHeads] = useState([]);
  const [budgetSubHeads, setBudgetSubHeads] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [headFilter, setHeadFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [statusTargetId, setStatusTargetId] = useState(null);

  const selectedFinancialYear = useMemo(
    () => financialYears.find((year) => String(year.id) === String(selectedFyId)),
    [financialYears, selectedFyId]
  );

  const isActiveFinancialYear = selectedFinancialYear?.status === "active";

  const financialYearOptions = useMemo(
    () =>
      financialYears.map((year) => ({
        value: String(year.id),
        label: `${year.year_label}${year.status === "active" ? " (Active)" : ""}`,
      })),
    [financialYears]
  );

  const headFilterOptions = useMemo(
    () => [
      { value: "", label: "All budget heads" },
      ...budgetHeads.map((head) => ({ value: String(head.id), label: head.head_name })),
    ],
    [budgetHeads]
  );

  const statusFilterOptions = [
    { value: "", label: "All statuses" },
    { value: "true", label: "Active" },
    { value: "false", label: "Inactive" },
  ];

  const allocatedSubHeadIds = useMemo(
    () => new Set(allocations.map((allocation) => allocation.budget_sub_head_id)),
    [allocations]
  );

  const availableSubHeads = useMemo(
    () =>
      budgetSubHeads.filter(
        (subHead) =>
          subHead.is_active &&
          (!editingAllocation || subHead.id === editingAllocation.budget_sub_head_id) &&
          !allocatedSubHeadIds.has(subHead.id)
      ),
    [budgetSubHeads, allocatedSubHeadIds, editingAllocation]
  );

  const loadReferenceData = useCallback(async () => {
    try {
      const [yearsResponse, headsResponse, subHeadsResponse, teachersResponse] = await Promise.all([
        fetchFinancialYears(),
        fetchBudgetHeads(),
        fetchBudgetSubHeads({ is_active: "true" }),
        API.get("/api/teachers", {
          headers: getAuthHeaders(),
          params: { page: 1, limit: 1000, search: "" },
        }),
      ]);

      const years = yearsResponse?.data?.data || [];
      const sortedYears = [...years].sort((left, right) => {
        if (left.status === "active" && right.status !== "active") return -1;
        if (right.status === "active" && left.status !== "active") return 1;
        return String(right.start_date).localeCompare(String(left.start_date));
      });

      setFinancialYears(sortedYears);
      setBudgetHeads(Array.isArray(headsResponse?.data?.data) ? headsResponse.data.data : []);
      setBudgetSubHeads(Array.isArray(subHeadsResponse?.data?.data) ? subHeadsResponse.data.data : []);
      setTeachers((teachersResponse?.data?.data?.teachers || []).filter(isActiveStaffTeacher));

      const activeYear = sortedYears.find((year) => year.status === "active");
      setSelectedFyId((current) => {
        if (current && sortedYears.some((year) => String(year.id) === String(current))) {
          return current;
        }
        return activeYear ? String(activeYear.id) : sortedYears[0] ? String(sortedYears[0].id) : "";
      });
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to load reference data.");
    }
  }, []);

  const loadAllocations = useCallback(async () => {
    if (!selectedFyId) {
      setAllocations([]);
      setSummary(null);
      setLoading(false);
      return;
    }

    setError("");

    try {
      const params = {
        financial_year_id: selectedFyId,
        budget_head_id: headFilter || undefined,
        is_active: statusFilter || undefined,
      };

      const [allocationsResponse, summaryResponse] = await Promise.all([
        fetchBudgetAllocations(params),
        fetchBudgetAllocationSummary({ financial_year_id: selectedFyId }),
      ]);

      setAllocations(Array.isArray(allocationsResponse?.data?.data) ? allocationsResponse.data.data : []);
      setSummary(summaryResponse?.data?.data || null);
    } catch (err) {
      setAllocations([]);
      setSummary(null);
      setError(err?.response?.data?.message || "Unable to load budget allocations.");
    } finally {
      setLoading(false);
    }
  }, [selectedFyId, headFilter, statusFilter]);

  useEffect(() => {
    loadReferenceData();
  }, [loadReferenceData]);

  useEffect(() => {
    setLoading(true);
    loadAllocations();
  }, [loadAllocations]);

  const totalAllocated = Number(summary?.totals?.total_allocated || 0);
  const activeCount = Number(summary?.totals?.active_allocation_count || 0);

  const openCreateModal = () => {
    if (!isActiveFinancialYear) {
      toast.error("Allocations can only be created for the active financial year.");
      return;
    }

    setEditingAllocation(null);
    setFormData(emptyForm);
    setIsModalOpen(true);
  };

  const openEditModal = (allocation) => {
    setEditingAllocation(allocation);
    setFormData({
      budget_sub_head_id: String(allocation.budget_sub_head_id),
      allocated_amount: String(allocation.allocated_amount),
      responsible_teacher_id: allocation.responsible_teacher_id
        ? String(allocation.responsible_teacher_id)
        : "",
      remarks: allocation.remarks || "",
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAllocation(null);
    setFormData(emptyForm);
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);

    const amount = Number(formData.allocated_amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Allocated amount must be greater than zero.");
      setIsSaving(false);
      return;
    }

    const payload = {
      allocated_amount: amount,
      responsible_teacher_id: formData.responsible_teacher_id
        ? Number(formData.responsible_teacher_id)
        : null,
      remarks: formData.remarks.trim(),
    };

    try {
      if (editingAllocation) {
        await updateBudgetAllocation(editingAllocation.id, payload);
        toast.success("Budget allocation updated successfully");
      } else {
        await createBudgetAllocation({
          financial_year_id: Number(selectedFyId),
          budget_sub_head_id: Number(formData.budget_sub_head_id),
          ...payload,
        });
        toast.success("Budget allocation created successfully");
      }

      closeModal();
      setLoading(true);
      await loadAllocations();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to save budget allocation.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (allocation) => {
    setStatusTargetId(allocation.id);

    try {
      await updateBudgetAllocationStatus(allocation.id, !allocation.is_active);
      toast.success(allocation.is_active ? "Allocation deactivated" : "Allocation activated");
      setLoading(true);
      await loadAllocations();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to update allocation status.");
    } finally {
      setStatusTargetId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Budget Allocations"
          description="Allocate funds to budget sub heads for each financial year. One allocation per sub head per year."
          actions={
            <Button variant="primary" onClick={openCreateModal} disabled={!isActiveFinancialYear}>
              Add Allocation
            </Button>
          }
        />

        {error ? <Alert variant="error">{error}</Alert> : null}

        {!isActiveFinancialYear && selectedFyId ? (
          <Alert variant="warning">
            Selected financial year is closed. You can view allocations but new ones require an active year.
          </Alert>
        ) : null}

        <MetricGrid columns={3}>
          <MetricCard
            label={selectedFinancialYear ? `Total (${selectedFinancialYear.year_label})` : "Total Allocated"}
            value={formatCurrency(totalAllocated)}
          />
          <MetricCard label="Active Allocations" value={activeCount} accent="emerald" />
          <MetricCard label="Budget Heads Used" value={summary?.by_head?.length || 0} />
        </MetricGrid>

        <FilterToolbar>
          <FilterSelect
            value={selectedFyId}
            onChange={(event) => setSelectedFyId(event.target.value)}
            options={
              financialYearOptions.length
                ? financialYearOptions
                : [{ value: "", label: "No financial years" }]
            }
          />
          <FilterSelect
            value={headFilter}
            onChange={(event) => setHeadFilter(event.target.value)}
            options={headFilterOptions}
          />
          <FilterSelect
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            options={statusFilterOptions}
          />
        </FilterToolbar>

        <DataTable>
          <DataTableColGroup widths={COLUMN_WIDTHS} />
          <DataTableHead>
            <DataTableRow>
              <DataTableHeaderCell>Budget Head</DataTableHeaderCell>
              <DataTableHeaderCell>Sub Head</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Amount</DataTableHeaderCell>
              <DataTableHeaderCell>Responsible</DataTableHeaderCell>
              <DataTableHeaderCell>Remarks</DataTableHeaderCell>
              <DataTableHeaderCell>Status</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Actions</DataTableHeaderCell>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {loading ? (
              <DataTableSkeleton columns={7} rows={4} />
            ) : allocations.length === 0 ? (
              <DataTableEmpty colSpan={7} message="No budget allocations for this financial year." />
            ) : (
              allocations.map((allocation) => (
                <DataTableRow key={allocation.id}>
                  <DataTableCell>
                    <div className="font-semibold text-slate-100">{allocation.budget_head_name}</div>
                    <div className="font-mono text-xs text-slate-400">{allocation.budget_head_code}</div>
                  </DataTableCell>
                  <DataTableCell>
                    <div className="font-semibold text-slate-100">{allocation.sub_head_name}</div>
                    <div className="font-mono text-xs text-slate-400">{allocation.sub_head_code}</div>
                  </DataTableCell>
                  <DataTableCell align="right">
                    <span className="font-medium text-slate-100">
                      {formatCurrency(allocation.allocated_amount)}
                    </span>
                  </DataTableCell>
                  <DataTableCell>
                    {allocation.responsible_teacher_name || "Principal / School"}
                  </DataTableCell>
                  <DataTableCell>
                    <span className="text-slate-300">{allocation.remarks || "—"}</span>
                  </DataTableCell>
                  <DataTableCell>
                    <StatusBadge isActive={allocation.is_active} />
                  </DataTableCell>
                  <DataTableCell align="right">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        disabled={!allocation.is_active}
                        onClick={() => openEditModal(allocation)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={statusTargetId === allocation.id}
                        onClick={() => handleToggleStatus(allocation)}
                      >
                        {allocation.is_active ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  </DataTableCell>
                </DataTableRow>
              ))
            )}
          </DataTableBody>
        </DataTable>
      </div>

      <ErpModal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingAllocation ? "Edit Budget Allocation" : "Create Budget Allocation"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {!editingAllocation ? (
            <FormField label="Budget Sub Head">
              <Select
                name="budget_sub_head_id"
                value={formData.budget_sub_head_id}
                onChange={handleInputChange}
                required
              >
                <option value="">Select sub head</option>
                {availableSubHeads.map((subHead) => (
                  <option key={subHead.id} value={subHead.id}>
                    {subHead.budget_head_name} → {subHead.sub_head_name}
                  </option>
                ))}
              </Select>
            </FormField>
          ) : (
            <FormField label="Budget Sub Head">
              <Input
                value={`${editingAllocation.budget_head_name} → ${editingAllocation.sub_head_name}`}
                disabled
                readOnly
              />
            </FormField>
          )}

          <FormField label="Allocated Amount (INR)">
            <Input
              name="allocated_amount"
              type="number"
              min="0.01"
              step="0.01"
              value={formData.allocated_amount}
              onChange={handleInputChange}
              placeholder="50000.00"
              required
            />
          </FormField>

          <FormField label="Responsible Teacher (optional)">
            <Select
              name="responsible_teacher_id"
              value={formData.responsible_teacher_id}
              onChange={handleInputChange}
            >
              <option value="">Principal / School</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.teacher_name}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Remarks (optional)">
            <Input
              name="remarks"
              value={formData.remarks}
              onChange={handleInputChange}
              placeholder="Optional notes"
            />
          </FormField>

          <FormActions>
            <Button type="button" variant="ghost" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSaving}>
              {isSaving ? "Saving..." : editingAllocation ? "Update" : "Create"}
            </Button>
          </FormActions>
        </form>
      </ErpModal>
    </DashboardLayout>
  );
}

export default BudgetAllocations;
