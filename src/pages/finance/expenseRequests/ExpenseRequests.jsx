import { Link } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import DashboardLayout from "../../../layouts/DashboardLayout";
import {
  approveExpenseRequest,
  createExpenseRequest,
  deleteExpenseRequest,
  fetchAllocationBalance,
  fetchBudgetAllocations,
  fetchExpenseRequestSummary,
  fetchExpenseRequests,
  fetchFinancialYears,
  markExpenseRequestPaid,
  rejectExpenseRequest,
  submitExpenseRequest,
  updateExpenseRequest,
} from "../../../api/finance";
import { fetchStockConfig } from "../../../api/stock";
import { usePermissions } from "../../../hooks/usePermissions";
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

const COLUMN_WIDTHS = ["14%", "18%", "18%", "12%", "12%", "10%", "16%"];

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "paid", label: "Paid" },
];

const emptyForm = {
  budget_allocation_id: "",
  requested_amount: "",
  purpose: "",
  vendor_name: "",
  remarks: "",
  item_name: "",
  quantity: "",
};

const emptyRejectForm = { rejection_remarks: "" };
const emptyPaidForm = {
  payment_voucher_no: "",
  payment_transaction_id: "",
  paid_at: "",
  create_stock_entry: false,
  stock_category: "",
  stock_unit: "pcs",
  purchase_rate: "",
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

const StatusBadge = ({ status }) => {
  const variants = {
    draft: "default",
    pending: "amber",
    approved: "emerald",
    rejected: "default",
    paid: "emerald",
  };

  const labels = {
    draft: "Draft",
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    paid: "Paid",
  };

  return <Badge variant={variants[status] || "default"}>{labels[status] || status}</Badge>;
};

function ExpenseRequests() {
  const { can } = usePermissions();
  const canCreateRequest = can("finance.expense_request.create");
  const canUpdateRequest = can("finance.expense_request.update");
  const canDeleteRequest = can("finance.expense_request.delete");
  const canSubmitRequest = can("finance.expense_request.submit");
  const canApproveRequest = can("finance.expense_request.approve");
  const canRejectRequest = can("finance.expense_request.reject");
  const canMarkPaidRequest = can("finance.expense_request.mark_paid");

  const [financialYears, setFinancialYears] = useState([]);
  const [selectedFyId, setSelectedFyId] = useState("");
  const [allocations, setAllocations] = useState([]);
  const [requests, setRequests] = useState([]);
  const [summary, setSummary] = useState([]);
  const [allocationBalance, setAllocationBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [paidModalOpen, setPaidModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);
  const [actionTarget, setActionTarget] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [rejectForm, setRejectForm] = useState(emptyRejectForm);
  const [paidForm, setPaidForm] = useState(emptyPaidForm);
  const [stockCategories, setStockCategories] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  const financialYearOptions = useMemo(() => {
    const sorted = [...financialYears].sort((left, right) => {
      if (left.status === "active" && right.status !== "active") return -1;
      if (right.status === "active" && left.status !== "active") return 1;
      return String(right.start_date).localeCompare(String(left.start_date));
    });

    return sorted.map((year) => ({
      value: String(year.id),
      label: `${year.year_label}${year.status === "active" ? " (Active)" : ""}`,
    }));
  }, [financialYears]);

  const activeAllocations = useMemo(
    () => allocations.filter((allocation) => allocation.is_active),
    [allocations]
  );

  const pendingCount = useMemo(
    () => summary.find((row) => row.status === "pending")?.request_count || 0,
    [summary]
  );

  useEffect(() => {
    const loadStockConfig = async () => {
      try {
        const response = await fetchStockConfig();
        setStockCategories(response?.data?.data?.categories || []);
      } catch {
        setStockCategories([]);
      }
    };

    if (canMarkPaidRequest) {
      loadStockConfig();
    }
  }, [canMarkPaidRequest]);

  const loadReferenceData = useCallback(async () => {
    try {
      const yearsResponse = await fetchFinancialYears();
      const years = yearsResponse?.data?.data || [];
      setFinancialYears(years);

      const activeYear = years.find((year) => year.status === "active");
      setSelectedFyId((current) => {
        if (current && years.some((year) => String(year.id) === String(current))) {
          return current;
        }
        return activeYear ? String(activeYear.id) : years[0] ? String(years[0].id) : "";
      });
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to load financial years.");
    }
  }, []);

  const loadAllocations = useCallback(async () => {
    if (!selectedFyId) {
      setAllocations([]);
      return;
    }

    try {
      const response = await fetchBudgetAllocations({
        financial_year_id: selectedFyId,
        is_active: "true",
      });
      setAllocations(Array.isArray(response?.data?.data) ? response.data.data : []);
    } catch {
      setAllocations([]);
    }
  }, [selectedFyId]);

  const loadRequests = useCallback(async () => {
    if (!selectedFyId) {
      setRequests([]);
      setSummary([]);
      setLoading(false);
      return;
    }

    setError("");

    try {
      const params = {
        financial_year_id: selectedFyId,
        status: statusFilter || undefined,
      };

      const [requestsResponse, summaryResponse] = await Promise.all([
        fetchExpenseRequests(params),
        fetchExpenseRequestSummary({ financial_year_id: selectedFyId }),
      ]);

      setRequests(Array.isArray(requestsResponse?.data?.data) ? requestsResponse.data.data : []);
      setSummary(Array.isArray(summaryResponse?.data?.data) ? summaryResponse.data.data : []);
    } catch (err) {
      setRequests([]);
      setSummary([]);
      setError(err?.response?.data?.message || "Unable to load expense requests.");
    } finally {
      setLoading(false);
    }
  }, [selectedFyId, statusFilter]);

  useEffect(() => {
    loadReferenceData();
  }, [loadReferenceData]);

  useEffect(() => {
    loadAllocations();
  }, [loadAllocations]);

  useEffect(() => {
    setLoading(true);
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    const loadBalance = async () => {
      if (!formData.budget_allocation_id) {
        setAllocationBalance(null);
        return;
      }

      try {
        const response = await fetchAllocationBalance(formData.budget_allocation_id);
        setAllocationBalance(response?.data?.data || null);
      } catch {
        setAllocationBalance(null);
      }
    };

    loadBalance();
  }, [formData.budget_allocation_id]);

  const openCreateModal = () => {
    setEditingRequest(null);
    setFormData(emptyForm);
    setIsModalOpen(true);
  };

  const openEditModal = (request) => {
    setEditingRequest(request);
    setFormData({
      budget_allocation_id: String(request.budget_allocation_id),
      requested_amount: String(request.requested_amount),
      purpose: request.purpose || "",
      vendor_name: request.vendor_name || "",
      remarks: request.remarks || "",
      item_name: request.item_name || "",
      quantity: request.quantity != null ? String(request.quantity) : "",
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRequest(null);
    setFormData(emptyForm);
    setAllocationBalance(null);
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);

    const payload = {
      budget_allocation_id: Number(formData.budget_allocation_id),
      requested_amount: Number(formData.requested_amount),
      purpose: formData.purpose.trim(),
      vendor_name: formData.vendor_name.trim(),
      remarks: formData.remarks.trim(),
      item_name: formData.item_name.trim() || null,
      quantity: formData.quantity ? Number(formData.quantity) : null,
    };

    try {
      if (editingRequest) {
        await updateExpenseRequest(editingRequest.id, payload);
        toast.success("Expense request updated");
      } else {
        await createExpenseRequest(payload);
        toast.success("Expense request created");
      }

      closeModal();
      setLoading(true);
      await loadRequests();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to save expense request.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (request) => {
    try {
      await deleteExpenseRequest(request.id);
      toast.success("Draft deleted");
      setLoading(true);
      await loadRequests();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to delete expense request.");
    }
  };

  const handleSubmitRequest = async (request) => {
    try {
      await submitExpenseRequest(request.id);
      toast.success("Expense request submitted for approval");
      setLoading(true);
      await loadRequests();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to submit expense request.");
    }
  };

  const handleApprove = async (request) => {
    try {
      await approveExpenseRequest(request.id);
      toast.success("Expense request approved");
      setLoading(true);
      await loadRequests();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to approve expense request.");
    }
  };

  const openRejectModal = (request) => {
    setActionTarget(request);
    setRejectForm(emptyRejectForm);
    setRejectModalOpen(true);
  };

  const handleReject = async (event) => {
    event.preventDefault();
    if (!actionTarget) return;

    setIsSaving(true);
    try {
      await rejectExpenseRequest(actionTarget.id, {
        rejection_remarks: rejectForm.rejection_remarks.trim(),
      });
      toast.success("Expense request rejected");
      setRejectModalOpen(false);
      setActionTarget(null);
      setLoading(true);
      await loadRequests();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to reject expense request.");
    } finally {
      setIsSaving(false);
    }
  };

  const openPaidModal = (request) => {
    setActionTarget(request);
    setPaidForm({
      ...emptyPaidForm,
      purchase_rate:
        request.quantity && Number(request.quantity) > 0
          ? String((Number(request.requested_amount) / Number(request.quantity)).toFixed(2))
          : "",
    });
    setPaidModalOpen(true);
  };

  const handleMarkPaid = async (event) => {
    event.preventDefault();
    if (!actionTarget) return;

    setIsSaving(true);
    try {
      await markExpenseRequestPaid(actionTarget.id, {
        payment_voucher_no: paidForm.payment_voucher_no.trim(),
        payment_transaction_id: paidForm.payment_transaction_id.trim(),
        paid_at: paidForm.paid_at || undefined,
        create_stock_entry: Boolean(paidForm.create_stock_entry),
        stock_category: paidForm.create_stock_entry ? paidForm.stock_category : undefined,
        stock_unit: paidForm.create_stock_entry ? paidForm.stock_unit.trim() : undefined,
        purchase_rate: paidForm.purchase_rate ? Number(paidForm.purchase_rate) : undefined,
      });
      toast.success("Expense request marked as paid");
      setPaidModalOpen(false);
      setActionTarget(null);
      setLoading(true);
      await loadRequests();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to mark expense request as paid.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Expense Requests"
          description="Teachers submit expenses against budget allocations. Admin approves and records payment."
          actions={
            canCreateRequest ? (
              <Button variant="primary" onClick={openCreateModal}>
                New Request
              </Button>
            ) : null
          }
        />

        {error ? <Alert variant="error">{error}</Alert> : null}

        <MetricGrid columns={3}>
          <MetricCard label="Pending Approval" value={pendingCount} accent="amber" />
          <MetricCard
            label="Approved"
            value={summary.find((row) => row.status === "approved")?.request_count || 0}
          />
          <MetricCard
            label="Paid"
            value={summary.find((row) => row.status === "paid")?.request_count || 0}
            accent="emerald"
          />
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
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            options={STATUS_OPTIONS}
          />
        </FilterToolbar>

        <DataTable>
          <DataTableColGroup widths={COLUMN_WIDTHS} />
          <DataTableHead>
            <DataTableRow>
              <DataTableHeaderCell>Submitted</DataTableHeaderCell>
              <DataTableHeaderCell>Budget Line</DataTableHeaderCell>
              <DataTableHeaderCell>Purpose</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Amount</DataTableHeaderCell>
              <DataTableHeaderCell>Status</DataTableHeaderCell>
              <DataTableHeaderCell>By</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Actions</DataTableHeaderCell>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {loading ? (
              <DataTableSkeleton columns={7} rows={4} />
            ) : requests.length === 0 ? (
              <DataTableEmpty colSpan={7} message="No expense requests found." />
            ) : (
              requests.map((request) => (
                <DataTableRow key={request.id}>
                  <DataTableCell>{formatDate(request.submitted_at || request.created_at)}</DataTableCell>
                  <DataTableCell>
                    <div className="font-semibold text-slate-100">{request.budget_head_name}</div>
                    <div className="text-xs text-slate-400">{request.sub_head_name}</div>
                  </DataTableCell>
                  <DataTableCell>{request.purpose}</DataTableCell>
                  <DataTableCell align="right">{formatCurrency(request.requested_amount)}</DataTableCell>
                  <DataTableCell>
                    <StatusBadge status={request.status} />
                  </DataTableCell>
                  <DataTableCell>{request.submitted_by_name || request.created_by_name || "—"}</DataTableCell>
                  <DataTableCell align="right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Link to={`/finance/expense-requests/${request.id}`}>
                        <Button variant="ghost">View</Button>
                      </Link>
                      {canUpdateRequest && request.status === "draft" ? (
                        <>
                          <Button variant="ghost" onClick={() => openEditModal(request)}>
                            Edit
                          </Button>
                          {canSubmitRequest ? (
                            <Button variant="secondary" onClick={() => handleSubmitRequest(request)}>
                              Submit
                            </Button>
                          ) : null}
                          {canDeleteRequest ? (
                            <Button variant="ghost" onClick={() => handleDelete(request)}>
                              Delete
                            </Button>
                          ) : null}
                        </>
                      ) : null}
                      {canApproveRequest && request.status === "pending" ? (
                        <>
                          <Button variant="primary" onClick={() => handleApprove(request)}>
                            Approve
                          </Button>
                          {canRejectRequest ? (
                            <Button variant="secondary" onClick={() => openRejectModal(request)}>
                              Reject
                            </Button>
                          ) : null}
                        </>
                      ) : null}
                      {canMarkPaidRequest && request.status === "approved" ? (
                        <Button variant="primary" onClick={() => openPaidModal(request)}>
                          Mark Paid
                        </Button>
                      ) : null}
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
        title={editingRequest ? "Edit Expense Request" : "New Expense Request"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Budget Allocation">
            <Select
              name="budget_allocation_id"
              value={formData.budget_allocation_id}
              onChange={handleInputChange}
              required
              disabled={Boolean(editingRequest)}
            >
              <option value="">Select allocation</option>
              {activeAllocations.map((allocation) => (
                <option key={allocation.id} value={allocation.id}>
                  {allocation.budget_head_name} → {allocation.sub_head_name} (
                  {formatCurrency(allocation.allocated_amount)})
                </option>
              ))}
            </Select>
          </FormField>

          {allocationBalance ? (
            <Alert variant="info">
              Allocated {formatCurrency(allocationBalance.allocated_amount)} | Committed{" "}
              {formatCurrency(allocationBalance.committed_amount)} | Available{" "}
              {formatCurrency(allocationBalance.available_balance)}
            </Alert>
          ) : null}

          <FormField label="Amount (INR)">
            <Input
              name="requested_amount"
              type="number"
              min="0.01"
              step="0.01"
              value={formData.requested_amount}
              onChange={handleInputChange}
              required
            />
          </FormField>

          <FormField label="Purpose">
            <Input
              name="purpose"
              value={formData.purpose}
              onChange={handleInputChange}
              placeholder="Library books purchase"
              required
            />
          </FormField>

          <FormField label="Vendor (optional)">
            <Input name="vendor_name" value={formData.vendor_name} onChange={handleInputChange} />
          </FormField>

          <FormField label="Remarks (optional)">
            <Input name="remarks" value={formData.remarks} onChange={handleInputChange} />
          </FormField>

          <FormField label="Inventory Item Name (optional)">
            <Input
              name="item_name"
              value={formData.item_name}
              onChange={handleInputChange}
              placeholder="Football set"
            />
          </FormField>

          <FormField label="Quantity (optional)">
            <Input
              name="quantity"
              type="number"
              min="0.01"
              step="0.01"
              value={formData.quantity}
              onChange={handleInputChange}
            />
          </FormField>

          <FormActions>
            <Button type="button" variant="ghost" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSaving}>
              {isSaving ? "Saving..." : editingRequest ? "Update Draft" : "Save Draft"}
            </Button>
          </FormActions>
        </form>
      </ErpModal>

      <ErpModal isOpen={rejectModalOpen} onClose={() => setRejectModalOpen(false)} title="Reject Expense Request">
        <form onSubmit={handleReject} className="space-y-4">
          <FormField label="Rejection Remarks">
            <Input
              name="rejection_remarks"
              value={rejectForm.rejection_remarks}
              onChange={(event) =>
                setRejectForm({ rejection_remarks: event.target.value })
              }
              required
            />
          </FormField>
          <FormActions>
            <Button type="button" variant="ghost" onClick={() => setRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSaving}>
              Reject
            </Button>
          </FormActions>
        </form>
      </ErpModal>

      <ErpModal isOpen={paidModalOpen} onClose={() => setPaidModalOpen(false)} title="Mark Expense as Paid">
        <form onSubmit={handleMarkPaid} className="space-y-4">
          <FormField label="Voucher Number">
            <Input
              name="payment_voucher_no"
              value={paidForm.payment_voucher_no}
              onChange={(event) =>
                setPaidForm((prev) => ({ ...prev, payment_voucher_no: event.target.value }))
              }
              required
            />
          </FormField>
          <FormField label="Transaction ID">
            <Input
              name="payment_transaction_id"
              value={paidForm.payment_transaction_id}
              onChange={(event) =>
                setPaidForm((prev) => ({ ...prev, payment_transaction_id: event.target.value }))
              }
              required
            />
          </FormField>
          <FormField label="Payment Date (optional)">
            <Input
              name="paid_at"
              type="date"
              value={paidForm.paid_at}
              onChange={(event) =>
                setPaidForm((prev) => ({ ...prev, paid_at: event.target.value }))
              }
            />
          </FormField>

          {actionTarget?.item_name && actionTarget?.quantity ? (
            <>
              <Alert variant="info">
                This request includes inventory ({actionTarget.item_name}, qty{" "}
                {actionTarget.quantity}). You can optionally create a stock entry after payment.
              </Alert>
              <label className="flex items-center gap-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={paidForm.create_stock_entry}
                  onChange={(event) =>
                    setPaidForm((prev) => ({
                      ...prev,
                      create_stock_entry: event.target.checked,
                    }))
                  }
                />
                Create stock entry after payment
              </label>
              {paidForm.create_stock_entry ? (
                <>
                  <FormField label="Stock Category">
                    <Select
                      name="stock_category"
                      value={paidForm.stock_category}
                      onChange={(event) =>
                        setPaidForm((prev) => ({
                          ...prev,
                          stock_category: event.target.value,
                        }))
                      }
                      required
                    >
                      <option value="">Select category</option>
                      {stockCategories.map((row) => (
                        <option key={row.value} value={row.value}>
                          {row.label}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label="Unit">
                    <Input
                      name="stock_unit"
                      value={paidForm.stock_unit}
                      onChange={(event) =>
                        setPaidForm((prev) => ({ ...prev, stock_unit: event.target.value }))
                      }
                      required
                    />
                  </FormField>
                  <FormField label="Purchase Rate (optional)">
                    <Input
                      name="purchase_rate"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={paidForm.purchase_rate}
                      onChange={(event) =>
                        setPaidForm((prev) => ({
                          ...prev,
                          purchase_rate: event.target.value,
                        }))
                      }
                    />
                  </FormField>
                </>
              ) : null}
            </>
          ) : null}

          <FormActions>
            <Button type="button" variant="ghost" onClick={() => setPaidModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSaving}>
              Mark Paid
            </Button>
          </FormActions>
        </form>
      </ErpModal>
    </DashboardLayout>
  );
}

export default ExpenseRequests;
