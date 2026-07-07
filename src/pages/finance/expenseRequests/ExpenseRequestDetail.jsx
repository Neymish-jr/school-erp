import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import DashboardLayout from "../../../layouts/DashboardLayout";
import {
  approveExpenseRequest,
  deleteExpenseRequest,
  fetchAllocationBalance,
  fetchExpenseRequestById,
  markExpenseRequestPaid,
  rejectExpenseRequest,
  submitExpenseRequest,
  updateExpenseRequest,
} from "../../../api/finance";
import {
  createQuotation,
  fetchQuotationComparison,
  selectQuotation,
} from "../../../api/quotations";
import { fetchStockConfig } from "../../../api/stock";
import { usePermissions } from "../../../hooks/usePermissions";
import {
  PageHeader,
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
  ErpModal,
  FormField,
  Input,
  Select,
  FormActions,
  Badge,
} from "../../../design-system";

const COLUMN_WIDTHS = ["20%", "14%", "14%", "14%", "12%", "14%", "12%"];

const emptyForm = {
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

const emptyQuotationForm = {
  vendor_name: "",
  vendor_contact: "",
  quotation_amount: "",
  quotation_date: new Date().toISOString().slice(0, 10),
  remarks: "",
  attachment: null,
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

const isEditableExpenseStatus = (status) => status === "draft" || status === "rejected";

const isSubmittableExpenseStatus = (status) => status === "draft" || status === "rejected";

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

function ExpenseRequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can, role, user } = usePermissions();
  const canUpdateRequest = can("finance.expense_request.update");
  const canDeleteRequest = can("finance.expense_request.delete");
  const canSubmitRequest = can("finance.expense_request.submit");
  const canApproveRequest = can("finance.expense_request.approve");
  const canRejectRequest = can("finance.expense_request.reject");
  const canMarkPaidRequest = can("finance.expense_request.mark_paid");
  const canShowMarkPaid = canMarkPaidRequest && role !== "principal";
  const canCreateQuotation = can("finance.quotation.create");
  const canReadComparison = can("finance.quotation.read_comparison");
  const isTeacherUser = role === "teacher";
  const authUserId = user?.id;

  const [request, setRequest] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [comparisonUnavailable, setComparisonUnavailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [paidModalOpen, setPaidModalOpen] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [quotationForm, setQuotationForm] = useState(emptyQuotationForm);
  const [rejectForm, setRejectForm] = useState(emptyRejectForm);
  const [paidForm, setPaidForm] = useState(emptyPaidForm);
  const [allocationBalance, setAllocationBalance] = useState(null);
  const [stockCategories, setStockCategories] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  const loadComparison = useCallback(async () => {
    if (!canReadComparison) {
      setComparison(null);
      setComparisonUnavailable(true);
      return;
    }

    try {
      const comparisonResponse = await fetchQuotationComparison(id);
      setComparison(comparisonResponse?.data?.data || null);
      setComparisonUnavailable(false);
    } catch (err) {
      setComparison(null);
      setComparisonUnavailable(err?.response?.status === 403);
    }
  }, [canReadComparison, id]);

  const loadRequest = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const requestResponse = await fetchExpenseRequestById(id);
      setRequest(requestResponse?.data?.data || null);
      await loadComparison();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load expense request");
      setRequest(null);
      setComparison(null);
      setComparisonUnavailable(false);
    } finally {
      setLoading(false);
    }
  }, [id, loadComparison]);

  useEffect(() => {
    loadRequest();
  }, [loadRequest]);

  useEffect(() => {
    const loadStockConfig = async () => {
      try {
        const response = await fetchStockConfig();
        setStockCategories(response?.data?.data?.categories || []);
      } catch {
        setStockCategories([]);
      }
    };

    if (canShowMarkPaid) {
      loadStockConfig();
    }
  }, [canShowMarkPaid]);

  const refreshAllocationBalance = useCallback(async () => {
    if (!request?.budget_allocation_id) {
      setAllocationBalance(null);
      return null;
    }

    try {
      const response = await fetchAllocationBalance(request.budget_allocation_id, {
        exclude_request_id: id,
      });
      const balance = response?.data?.data || null;
      setAllocationBalance(balance);
      return balance;
    } catch {
      setAllocationBalance(null);
      return null;
    }
  }, [id, request?.budget_allocation_id]);

  const openEditModal = async () => {
    if (!request) {
      return;
    }

    setFormData({
      requested_amount: String(request.requested_amount),
      purpose: request.purpose || "",
      vendor_name: request.vendor_name || "",
      remarks: request.remarks || "",
      item_name: request.item_name || "",
      quantity: request.quantity != null ? String(request.quantity) : "",
    });
    setAllocationBalance(null);
    setEditModalOpen(true);

    try {
      await refreshAllocationBalance();
    } catch {
      toast.error("Failed to load edit form data");
    }
  };

  useEffect(() => {
    if (!editModalOpen) {
      return;
    }
    refreshAllocationBalance();
  }, [editModalOpen, refreshAllocationBalance]);

  const canUpload =
    request &&
    ["draft", "pending"].includes(request.status) &&
    (canCreateQuotation ||
      (isTeacherUser && Number(request.created_by_user_id) === Number(authUserId)));

  const canSelect = request?.status === "pending" && canApproveRequest;

  const quotes = useMemo(
    () => comparison?.quotes || request?.quotations || [],
    [comparison?.quotes, request?.quotations]
  );

  const runWorkflowAction = async (action, successMessage) => {
    setIsSaving(true);
    try {
      await action(id);
      toast.success(successMessage);
      await loadRequest();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Action failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleQuotationInputChange = (event) => {
    const { name, value, files } = event.target;
    if (name === "attachment") {
      setQuotationForm((prev) => ({ ...prev, attachment: files?.[0] || null }));
      return;
    }
    setQuotationForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveEdit = async (event) => {
    event.preventDefault();
    setIsSaving(true);

    const requestedAmount = Number(formData.requested_amount);
    const balance = allocationBalance || (await refreshAllocationBalance());

    if (
      balance &&
      Number.isFinite(requestedAmount) &&
      requestedAmount > Number(balance.available_balance)
    ) {
      toast.error(
        `Requested amount exceeds available balance (${formatCurrency(balance.available_balance)}).`
      );
      setIsSaving(false);
      return;
    }

    try {
      await updateExpenseRequest(id, {
        requested_amount: requestedAmount,
        purpose: formData.purpose.trim(),
        vendor_name: formData.vendor_name.trim(),
        remarks: formData.remarks.trim(),
        item_name: formData.item_name.trim() || null,
        quantity: formData.quantity ? Number(formData.quantity) : null,
      });
      toast.success("Expense request updated");
      setEditModalOpen(false);
      await loadRequest();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to save expense request.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsSaving(true);
    try {
      await deleteExpenseRequest(id);
      toast.success("Draft deleted");
      navigate("/finance/expense-requests");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to delete expense request.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReject = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      await rejectExpenseRequest(id, {
        rejection_remarks: rejectForm.rejection_remarks.trim(),
      });
      toast.success("Expense request rejected");
      setRejectModalOpen(false);
      setRejectForm(emptyRejectForm);
      await loadRequest();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to reject expense request.");
    } finally {
      setIsSaving(false);
    }
  };

  const openPaidModal = () => {
    if (!request) {
      return;
    }

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
    setIsSaving(true);
    try {
      await markExpenseRequestPaid(id, {
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
      await loadRequest();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to mark expense request as paid.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUploadQuotation = async (event) => {
    event.preventDefault();
    setIsSaving(true);

    const payload = new FormData();
    payload.append("expense_request_id", String(id));
    payload.append("vendor_name", quotationForm.vendor_name.trim());
    payload.append("vendor_contact", quotationForm.vendor_contact.trim());
    payload.append("quotation_amount", quotationForm.quotation_amount);
    payload.append("quotation_date", quotationForm.quotation_date);
    payload.append("remarks", quotationForm.remarks.trim());
    if (quotationForm.attachment) {
      payload.append("attachment", quotationForm.attachment);
    }

    try {
      await createQuotation(payload);
      toast.success("Quotation uploaded");
      setUploadModalOpen(false);
      setQuotationForm(emptyQuotationForm);
      await loadRequest();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to upload quotation");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectQuotation = async (quotationId) => {
    setIsSaving(true);
    try {
      await selectQuotation(quotationId);
      toast.success("Quotation selected");
      await loadRequest();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to select quotation");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <PageHeader title="Expense Request" description="Loading expense request..." />
      </DashboardLayout>
    );
  }

  if (!request) {
    return (
      <DashboardLayout>
        <PageHeader title="Expense Request" />
        {error ? <Alert variant="error">{error}</Alert> : null}
        <Link to="/finance/expense-requests">
          <Button variant="ghost">Back to List</Button>
        </Link>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Expense Request"
          description="Review request details, compare vendor quotations, and select the winning quote."
          actions={
            <div className="flex flex-wrap gap-2">
              <Link to="/finance/expense-requests">
                <Button variant="ghost">Back to List</Button>
              </Link>
              {canUpdateRequest && isEditableExpenseStatus(request.status) ? (
                <Button variant="secondary" disabled={isSaving} onClick={openEditModal}>
                  Edit
                </Button>
              ) : null}
              {canSubmitRequest && isSubmittableExpenseStatus(request.status) ? (
                <Button
                  variant="secondary"
                  disabled={isSaving}
                  onClick={() =>
                    runWorkflowAction(
                      submitExpenseRequest,
                      request.status === "rejected"
                        ? "Expense request resubmitted"
                        : "Expense request submitted for approval"
                    )
                  }
                >
                  {request.status === "rejected" ? "Resubmit" : "Submit"}
                </Button>
              ) : null}
              {canDeleteRequest && request.status === "draft" ? (
                <Button variant="ghost" disabled={isSaving} onClick={handleDelete}>
                  Delete
                </Button>
              ) : null}
              {canApproveRequest && request.status === "pending" ? (
                <Button
                  variant="primary"
                  disabled={isSaving}
                  onClick={() => runWorkflowAction(approveExpenseRequest, "Expense request approved")}
                >
                  Approve
                </Button>
              ) : null}
              {canRejectRequest && request.status === "pending" ? (
                <Button variant="secondary" disabled={isSaving} onClick={() => setRejectModalOpen(true)}>
                  Reject
                </Button>
              ) : null}
              {canShowMarkPaid && request.status === "approved" ? (
                <Button variant="primary" disabled={isSaving} onClick={openPaidModal}>
                  Mark Paid
                </Button>
              ) : null}
              {canUpload ? (
                <Button variant="primary" onClick={() => setUploadModalOpen(true)}>
                  Upload Quotation
                </Button>
              ) : null}
            </div>
          }
        />

        {error ? <Alert variant="error">{error}</Alert> : null}

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-100">{request.purpose}</h2>
            <StatusBadge status={request.status} />
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 text-sm">
            <div>
              <div className="text-slate-400">Budget Line</div>
              <div className="text-slate-100">
                {request.budget_head_name} → {request.sub_head_name}
              </div>
            </div>
            <div>
              <div className="text-slate-400">Requested Amount</div>
              <div className="text-slate-100">{formatCurrency(request.requested_amount)}</div>
            </div>
            <div>
              <div className="text-slate-400">Vendor</div>
              <div className="text-slate-100">{request.vendor_name || "—"}</div>
            </div>
            <div>
              <div className="text-slate-400">Submitted</div>
              <div className="text-slate-100">
                {formatDate(request.submitted_at || request.created_at)}
              </div>
            </div>
            <div>
              <div className="text-slate-400">Quotations Required</div>
              <div className="text-slate-100">
                {request.quotations_required
                  ? `Yes (≥ ${formatCurrency(request.quotation_threshold || comparison?.quotation_threshold)})`
                  : "No"}
              </div>
            </div>
            <div>
              <div className="text-slate-400">Quotation Count</div>
              <div className="text-slate-100">{request.quotation_count ?? quotes.length}</div>
            </div>
          </div>
          {request.rejection_remarks ? (
            <div className="text-sm">
              <div className="text-slate-400">Rejection Remarks</div>
              <div className="text-slate-200">{request.rejection_remarks}</div>
            </div>
          ) : null}
          {request.remarks ? (
            <div className="text-sm">
              <div className="text-slate-400">Remarks</div>
              <div className="text-slate-200">{request.remarks}</div>
            </div>
          ) : null}
        </div>

        {request.quotations_required && request.status === "pending" && canApproveRequest ? (
          <Alert variant="info">Select a quotation before approving this expense request.</Alert>
        ) : null}

        <div className="space-y-3">
          <h3 className="text-base font-semibold text-slate-100">Quotation Comparison</h3>
          {comparisonUnavailable ? (
            <Alert variant="info">
              Quotation comparison is not available for your role. Basic quotation details may still
              appear below when uploaded.
            </Alert>
          ) : null}
          <DataTable>
            <DataTableColGroup widths={COLUMN_WIDTHS} />
            <DataTableHead>
              <DataTableRow>
                <DataTableHeaderCell>Vendor</DataTableHeaderCell>
                <DataTableHeaderCell align="right">Amount</DataTableHeaderCell>
                <DataTableHeaderCell align="right">Difference</DataTableHeaderCell>
                <DataTableHeaderCell>Date</DataTableHeaderCell>
                <DataTableHeaderCell>Lowest</DataTableHeaderCell>
                <DataTableHeaderCell>Selected</DataTableHeaderCell>
                <DataTableHeaderCell align="right">Actions</DataTableHeaderCell>
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {quotes.length === 0 ? (
                <DataTableEmpty colSpan={7} message="No quotations uploaded yet." />
              ) : (
                quotes.map((quote) => (
                  <DataTableRow key={quote.id}>
                    <DataTableCell>
                      <div className="font-semibold text-slate-100">{quote.vendor_name}</div>
                      <div className="text-xs text-slate-400">{quote.vendor_contact || "—"}</div>
                    </DataTableCell>
                    <DataTableCell align="right">{formatCurrency(quote.quotation_amount)}</DataTableCell>
                    <DataTableCell align="right">
                      {quote.difference_from_lowest == null
                        ? "—"
                        : formatCurrency(quote.difference_from_lowest)}
                    </DataTableCell>
                    <DataTableCell>{formatDate(quote.quotation_date)}</DataTableCell>
                    <DataTableCell>
                      {quote.is_lowest ? <Badge variant="emerald">Lowest</Badge> : "—"}
                    </DataTableCell>
                    <DataTableCell>
                      {quote.is_selected ? <Badge variant="violet">Selected</Badge> : "—"}
                    </DataTableCell>
                    <DataTableCell align="right">
                      {canSelect && !quote.is_selected ? (
                        <Button
                          variant="secondary"
                          disabled={isSaving}
                          onClick={() => handleSelectQuotation(quote.id)}
                        >
                          Select
                        </Button>
                      ) : null}
                    </DataTableCell>
                  </DataTableRow>
                ))
              )}
            </DataTableBody>
          </DataTable>
        </div>
      </div>

      <ErpModal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Expense Request">
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <FormField label="Budget Allocation">
            <Select value={String(request.budget_allocation_id)} disabled>
              <option value={request.budget_allocation_id}>
                {request.budget_head_name} → {request.sub_head_name}
              </option>
            </Select>
          </FormField>

          {allocationBalance ? (
            <Alert variant="info">
              Allocated {formatCurrency(allocationBalance.allocated_amount)} | Expense committed{" "}
              {formatCurrency(allocationBalance.committed_amount)} | Activity committed{" "}
              {formatCurrency(allocationBalance.activity_committed_amount ?? 0)} | Available{" "}
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
            <Input name="purpose" value={formData.purpose} onChange={handleInputChange} required />
          </FormField>

          <FormField label="Vendor (optional)">
            <Input name="vendor_name" value={formData.vendor_name} onChange={handleInputChange} />
          </FormField>

          <FormField label="Remarks (optional)">
            <Input name="remarks" value={formData.remarks} onChange={handleInputChange} />
          </FormField>

          <FormField label="Inventory Item Name (optional)">
            <Input name="item_name" value={formData.item_name} onChange={handleInputChange} />
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
            <Button type="button" variant="ghost" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSaving}>
              {isSaving ? "Saving..." : request.status === "rejected" ? "Save Changes" : "Update Draft"}
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
              onChange={(event) => setRejectForm({ rejection_remarks: event.target.value })}
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
              onChange={(event) => setPaidForm((prev) => ({ ...prev, paid_at: event.target.value }))}
            />
          </FormField>

          {request.item_name && request.quantity ? (
            <>
              <Alert variant="info">
                This request includes inventory ({request.item_name}, qty {request.quantity}). You can
                optionally create a stock entry after payment.
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

      <ErpModal isOpen={uploadModalOpen} onClose={() => setUploadModalOpen(false)} title="Upload Quotation">
        <form onSubmit={handleUploadQuotation} className="space-y-4">
          <FormField label="Vendor Name">
            <Input
              name="vendor_name"
              value={quotationForm.vendor_name}
              onChange={handleQuotationInputChange}
              required
            />
          </FormField>
          <FormField label="Vendor Contact">
            <Input
              name="vendor_contact"
              value={quotationForm.vendor_contact}
              onChange={handleQuotationInputChange}
            />
          </FormField>
          <FormField label="Quotation Amount (INR)">
            <Input
              name="quotation_amount"
              type="number"
              min="0.01"
              step="0.01"
              value={quotationForm.quotation_amount}
              onChange={handleQuotationInputChange}
              required
            />
          </FormField>
          <FormField label="Quotation Date">
            <Input
              name="quotation_date"
              type="date"
              value={quotationForm.quotation_date}
              onChange={handleQuotationInputChange}
              required
            />
          </FormField>
          <FormField label="Remarks">
            <Input name="remarks" value={quotationForm.remarks} onChange={handleQuotationInputChange} />
          </FormField>
          <FormField label="Attachment">
            <Input
              name="attachment"
              type="file"
              onChange={handleQuotationInputChange}
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            />
          </FormField>
          <FormActions>
            <Button type="button" variant="ghost" onClick={() => setUploadModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSaving}>
              {isSaving ? "Uploading..." : "Upload"}
            </Button>
          </FormActions>
        </form>
      </ErpModal>
    </DashboardLayout>
  );
}

export default ExpenseRequestDetail;
