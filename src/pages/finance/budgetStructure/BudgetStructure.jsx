import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import DashboardLayout from "../../../layouts/DashboardLayout";
import {
  createBudgetHead,
  createBudgetSubHead,
  fetchBudgetHeads,
  fetchBudgetSubHeads,
  updateBudgetHead,
  updateBudgetHeadStatus,
  updateBudgetSubHead,
  updateBudgetSubHeadStatus,
} from "../../../api/finance";
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
  Select,
  FormActions,
  Badge,
} from "../../../design-system";

const HEAD_COLUMN_WIDTHS = ["12%", "28%", "30%", "10%", "20%"];
const SUB_COLUMN_WIDTHS = ["12%", "22%", "22%", "22%", "8%", "14%"];

const emptyHeadForm = { head_name: "", remarks: "" };
const emptySubForm = { budget_head_id: "", sub_head_name: "", remarks: "" };

const StatusBadge = ({ isActive }) =>
  isActive ? <Badge variant="emerald">Active</Badge> : <Badge variant="default">Inactive</Badge>;

function BudgetStructure() {
  const [budgetHeads, setBudgetHeads] = useState([]);
  const [subHeads, setSubHeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [headFilter, setHeadFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedHeadId, setSelectedHeadId] = useState("");

  const [headModalOpen, setHeadModalOpen] = useState(false);
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [editingHead, setEditingHead] = useState(null);
  const [editingSubHead, setEditingSubHead] = useState(null);
  const [headForm, setHeadForm] = useState(emptyHeadForm);
  const [subForm, setSubForm] = useState(emptySubForm);
  const [isSaving, setIsSaving] = useState(false);
  const [statusTarget, setStatusTarget] = useState(null);

  const statusFilterOptions = [
    { value: "", label: "All statuses" },
    { value: "true", label: "Active" },
    { value: "false", label: "Inactive" },
  ];

  const headFilterOptions = useMemo(
    () => [
      { value: "", label: "All budget heads" },
      ...budgetHeads.map((head) => ({ value: String(head.id), label: head.head_name })),
    ],
    [budgetHeads]
  );

  const loadData = useCallback(async () => {
    setError("");

    try {
      const [headsResponse, subHeadsResponse] = await Promise.all([
        fetchBudgetHeads({ search: search.trim(), is_active: statusFilter || undefined }),
        fetchBudgetSubHeads({
          search: search.trim(),
          budget_head_id: headFilter || undefined,
          is_active: statusFilter || undefined,
        }),
      ]);

      setBudgetHeads(Array.isArray(headsResponse?.data?.data) ? headsResponse.data.data : []);
      setSubHeads(Array.isArray(subHeadsResponse?.data?.data) ? subHeadsResponse.data.data : []);
    } catch (err) {
      setBudgetHeads([]);
      setSubHeads([]);
      setError(err?.response?.data?.message || "Unable to load budget structure.");
    } finally {
      setLoading(false);
    }
  }, [search, headFilter, statusFilter]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  const activeHeadCount = useMemo(
    () => budgetHeads.filter((head) => head.is_active).length,
    [budgetHeads]
  );

  const activeSubHeadCount = useMemo(
    () => subHeads.filter((subHead) => subHead.is_active).length,
    [subHeads]
  );

  const visibleSubHeads = useMemo(() => {
    if (!selectedHeadId) return subHeads;
    return subHeads.filter((subHead) => String(subHead.budget_head_id) === String(selectedHeadId));
  }, [subHeads, selectedHeadId]);

  const openCreateHead = () => {
    setEditingHead(null);
    setHeadForm(emptyHeadForm);
    setHeadModalOpen(true);
  };

  const openEditHead = (head) => {
    setEditingHead(head);
    setHeadForm({ head_name: head.head_name || "", remarks: head.remarks || "" });
    setHeadModalOpen(true);
  };

  const openCreateSubHead = () => {
    setEditingSubHead(null);
    setSubForm({
      budget_head_id: selectedHeadId || "",
      sub_head_name: "",
      remarks: "",
    });
    setSubModalOpen(true);
  };

  const openEditSubHead = (subHead) => {
    setEditingSubHead(subHead);
    setSubForm({
      budget_head_id: String(subHead.budget_head_id),
      sub_head_name: subHead.sub_head_name || "",
      remarks: subHead.remarks || "",
    });
    setSubModalOpen(true);
  };

  const handleHeadSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);

    const payload = {
      head_name: headForm.head_name.trim(),
      remarks: headForm.remarks.trim(),
    };

    try {
      if (editingHead) {
        await updateBudgetHead(editingHead.id, payload);
        toast.success("Budget head updated");
      } else {
        await createBudgetHead(payload);
        toast.success("Budget head created");
      }

      setHeadModalOpen(false);
      setLoading(true);
      await loadData();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to save budget head.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);

    const payload = {
      budget_head_id: Number(subForm.budget_head_id),
      sub_head_name: subForm.sub_head_name.trim(),
      remarks: subForm.remarks.trim(),
    };

    try {
      if (editingSubHead) {
        await updateBudgetSubHead(editingSubHead.id, payload);
        toast.success("Budget sub head updated");
      } else {
        await createBudgetSubHead(payload);
        toast.success("Budget sub head created");
      }

      setSubModalOpen(false);
      setLoading(true);
      await loadData();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to save budget sub head.");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleHeadStatus = async (head) => {
    setStatusTarget(`head-${head.id}`);
    try {
      await updateBudgetHeadStatus(head.id, !head.is_active);
      toast.success(head.is_active ? "Budget head deactivated" : "Budget head activated");
      setLoading(true);
      await loadData();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to update budget head status.");
    } finally {
      setStatusTarget(null);
    }
  };

  const toggleSubStatus = async (subHead) => {
    setStatusTarget(`sub-${subHead.id}`);
    try {
      await updateBudgetSubHeadStatus(subHead.id, !subHead.is_active);
      toast.success(subHead.is_active ? "Sub head deactivated" : "Sub head activated");
      setLoading(true);
      await loadData();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to update sub head status.");
    } finally {
      setStatusTarget(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Budget Structure"
          description="State-level budget heads and sub heads maintained by Super Admin. Schools consume this structure through allocations."
          actions={
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={openCreateSubHead}>
                Add Sub Head
              </Button>
              <Button variant="primary" onClick={openCreateHead}>
                Add Budget Head
              </Button>
            </div>
          }
        />

        {error ? <Alert variant="error">{error}</Alert> : null}

        <MetricGrid columns={3}>
          <MetricCard label="Budget Heads" value={budgetHeads.length} />
          <MetricCard label="Active Heads" value={activeHeadCount} accent="emerald" />
          <MetricCard label="Active Sub Heads" value={activeSubHeadCount} />
        </MetricGrid>

        <FilterToolbar>
          <FilterSearch
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search heads or sub heads..."
          />
          <FilterSelect
            value={headFilter}
            onChange={(event) => {
              setHeadFilter(event.target.value);
              setSelectedHeadId(event.target.value);
            }}
            options={headFilterOptions}
          />
          <FilterSelect
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            options={statusFilterOptions}
          />
        </FilterToolbar>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-100">Budget Heads</h2>
          <DataTable>
            <DataTableColGroup widths={HEAD_COLUMN_WIDTHS} />
            <DataTableHead>
              <DataTableRow>
                <DataTableHeaderCell>Code</DataTableHeaderCell>
                <DataTableHeaderCell>Head Name</DataTableHeaderCell>
                <DataTableHeaderCell>Remarks</DataTableHeaderCell>
                <DataTableHeaderCell>Status</DataTableHeaderCell>
                <DataTableHeaderCell align="right">Actions</DataTableHeaderCell>
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {loading ? (
                <DataTableSkeleton columns={5} rows={3} />
              ) : budgetHeads.length === 0 ? (
                <DataTableEmpty colSpan={5} message="No budget heads found." />
              ) : (
                budgetHeads.map((head) => (
                  <DataTableRow
                    key={head.id}
                    className={String(selectedHeadId) === String(head.id) ? "bg-slate-800/40" : ""}
                  >
                    <DataTableCell>
                      <span className="font-mono text-sm text-slate-400">{head.head_code}</span>
                    </DataTableCell>
                    <DataTableCell>
                      <button
                        type="button"
                        className="font-semibold text-slate-100 hover:text-emerald-300"
                        onClick={() =>
                          setSelectedHeadId((current) =>
                            String(current) === String(head.id) ? "" : String(head.id)
                          )
                        }
                      >
                        {head.head_name}
                      </button>
                    </DataTableCell>
                    <DataTableCell>{head.remarks || "—"}</DataTableCell>
                    <DataTableCell>
                      <StatusBadge isActive={head.is_active} />
                    </DataTableCell>
                    <DataTableCell align="right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button variant="ghost" onClick={() => openEditHead(head)}>
                          Edit
                        </Button>
                        <Button
                          variant="secondary"
                          disabled={statusTarget === `head-${head.id}`}
                          onClick={() => toggleHeadStatus(head)}
                        >
                          {head.is_active ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    </DataTableCell>
                  </DataTableRow>
                ))
              )}
            </DataTableBody>
          </DataTable>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-100">
            Budget Sub Heads
            {selectedHeadId
              ? ` — ${budgetHeads.find((head) => String(head.id) === selectedHeadId)?.head_name || ""}`
              : ""}
          </h2>
          <DataTable>
            <DataTableColGroup widths={SUB_COLUMN_WIDTHS} />
            <DataTableHead>
              <DataTableRow>
                <DataTableHeaderCell>Code</DataTableHeaderCell>
                <DataTableHeaderCell>Sub Head</DataTableHeaderCell>
                <DataTableHeaderCell>Parent Head</DataTableHeaderCell>
                <DataTableHeaderCell>Remarks</DataTableHeaderCell>
                <DataTableHeaderCell>Status</DataTableHeaderCell>
                <DataTableHeaderCell align="right">Actions</DataTableHeaderCell>
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {loading ? (
                <DataTableSkeleton columns={6} rows={4} />
              ) : visibleSubHeads.length === 0 ? (
                <DataTableEmpty colSpan={6} message="No budget sub heads found." />
              ) : (
                visibleSubHeads.map((subHead) => (
                  <DataTableRow key={subHead.id}>
                    <DataTableCell>
                      <span className="font-mono text-sm text-slate-400">{subHead.sub_head_code}</span>
                    </DataTableCell>
                    <DataTableCell>
                      <span className="font-semibold text-slate-100">{subHead.sub_head_name}</span>
                    </DataTableCell>
                    <DataTableCell>{subHead.budget_head_name}</DataTableCell>
                    <DataTableCell>{subHead.remarks || "—"}</DataTableCell>
                    <DataTableCell>
                      <StatusBadge isActive={subHead.is_active} />
                    </DataTableCell>
                    <DataTableCell align="right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button variant="ghost" onClick={() => openEditSubHead(subHead)}>
                          Edit
                        </Button>
                        <Button
                          variant="secondary"
                          disabled={statusTarget === `sub-${subHead.id}`}
                          onClick={() => toggleSubStatus(subHead)}
                        >
                          {subHead.is_active ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    </DataTableCell>
                  </DataTableRow>
                ))
              )}
            </DataTableBody>
          </DataTable>
        </div>
      </div>

      <ErpModal
        isOpen={headModalOpen}
        onClose={() => setHeadModalOpen(false)}
        title={editingHead ? "Edit Budget Head" : "Create Budget Head"}
      >
        <form onSubmit={handleHeadSubmit} className="space-y-4">
          {editingHead ? (
            <FormField label="Internal Code">
              <Input value={editingHead.head_code} disabled readOnly />
            </FormField>
          ) : null}
          <FormField label="Head Name">
            <Input
              name="head_name"
              value={headForm.head_name}
              onChange={(event) => setHeadForm((prev) => ({ ...prev, head_name: event.target.value }))}
              required
            />
          </FormField>
          <FormField label="Remarks (optional)">
            <Input
              name="remarks"
              value={headForm.remarks}
              onChange={(event) => setHeadForm((prev) => ({ ...prev, remarks: event.target.value }))}
            />
          </FormField>
          <FormActions>
            <Button type="button" variant="ghost" onClick={() => setHeadModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSaving}>
              {isSaving ? "Saving..." : editingHead ? "Update" : "Create"}
            </Button>
          </FormActions>
        </form>
      </ErpModal>

      <ErpModal
        isOpen={subModalOpen}
        onClose={() => setSubModalOpen(false)}
        title={editingSubHead ? "Edit Budget Sub Head" : "Create Budget Sub Head"}
      >
        <form onSubmit={handleSubSubmit} className="space-y-4">
          {editingSubHead ? (
            <FormField label="Internal Code">
              <Input value={editingSubHead.sub_head_code} disabled readOnly />
            </FormField>
          ) : null}
          <FormField label="Parent Budget Head">
            <Select
              name="budget_head_id"
              value={subForm.budget_head_id}
              onChange={(event) =>
                setSubForm((prev) => ({ ...prev, budget_head_id: event.target.value }))
              }
              required
            >
              <option value="">Select budget head</option>
              {budgetHeads
                .filter((head) => head.is_active || String(head.id) === subForm.budget_head_id)
                .map((head) => (
                  <option key={head.id} value={head.id}>
                    {head.head_name}
                  </option>
                ))}
            </Select>
          </FormField>
          <FormField label="Sub Head Name">
            <Input
              name="sub_head_name"
              value={subForm.sub_head_name}
              onChange={(event) =>
                setSubForm((prev) => ({ ...prev, sub_head_name: event.target.value }))
              }
              required
            />
          </FormField>
          <FormField label="Remarks (optional)">
            <Input
              name="remarks"
              value={subForm.remarks}
              onChange={(event) => setSubForm((prev) => ({ ...prev, remarks: event.target.value }))}
            />
          </FormField>
          <FormActions>
            <Button type="button" variant="ghost" onClick={() => setSubModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSaving}>
              {isSaving ? "Saving..." : editingSubHead ? "Update" : "Create"}
            </Button>
          </FormActions>
        </form>
      </ErpModal>
    </DashboardLayout>
  );
}

export default BudgetStructure;
