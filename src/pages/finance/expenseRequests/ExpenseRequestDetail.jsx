import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import DashboardLayout from "../../../layouts/DashboardLayout";
import { fetchExpenseRequestById } from "../../../api/finance";
import {
  createQuotation,
  fetchQuotationComparison,
  selectQuotation,
} from "../../../api/quotations";
import { decodeAuthToken, isAdminLike, isTeacher } from "../../../utils/auth";
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
  FormActions,
  Badge,
} from "../../../design-system";

const COLUMN_WIDTHS = ["20%", "14%", "14%", "14%", "12%", "14%", "12%"];

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

const emptyQuotationForm = {
  vendor_name: "",
  vendor_contact: "",
  quotation_amount: "",
  quotation_date: new Date().toISOString().slice(0, 10),
  remarks: "",
  attachment: null,
};

function ExpenseRequestDetail() {
  const { id } = useParams();
  const canApprove = isAdminLike();
  const isTeacherUser = isTeacher();

  const [request, setRequest] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [formData, setFormData] = useState(emptyQuotationForm);
  const [isSaving, setIsSaving] = useState(false);

  const loadRequest = async () => {
    setLoading(true);
    setError("");

    try {
      const [requestResponse, comparisonResponse] = await Promise.all([
        fetchExpenseRequestById(id),
        fetchQuotationComparison(id),
      ]);

      setRequest(requestResponse?.data?.data || null);
      setComparison(comparisonResponse?.data?.data || null);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load expense request");
      setRequest(null);
      setComparison(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequest();
  }, [id]);

  const authUserId = decodeAuthToken().id;

  const canUpload =
    request &&
    ["draft", "pending"].includes(request.status) &&
    (canApprove ||
      (isTeacherUser && Number(request.created_by_user_id) === Number(authUserId)));

  const canSelect = request?.status === "pending" && canApprove;

  const handleInputChange = (event) => {
    const { name, value, files } = event.target;
    if (name === "attachment") {
      setFormData((prev) => ({ ...prev, attachment: files?.[0] || null }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleUploadQuotation = async (event) => {
    event.preventDefault();
    setIsSaving(true);

    const payload = new FormData();
    payload.append("expense_request_id", String(id));
    payload.append("vendor_name", formData.vendor_name.trim());
    payload.append("vendor_contact", formData.vendor_contact.trim());
    payload.append("quotation_amount", formData.quotation_amount);
    payload.append("quotation_date", formData.quotation_date);
    payload.append("remarks", formData.remarks.trim());
    if (formData.attachment) {
      payload.append("attachment", formData.attachment);
    }

    try {
      await createQuotation(payload);
      toast.success("Quotation uploaded");
      setUploadModalOpen(false);
      setFormData(emptyQuotationForm);
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

  const quotes = comparison?.quotes || request?.quotations || [];

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
              {canUpload ? (
                <Button variant="primary" onClick={() => setUploadModalOpen(true)}>
                  Upload Quotation
                </Button>
              ) : null}
            </div>
          }
        />

        {error ? <Alert variant="error">{error}</Alert> : null}

        {loading ? (
          <Alert variant="info">Loading expense request...</Alert>
        ) : !request ? null : (
          <>
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
                  <div className="text-slate-100">{formatDate(request.submitted_at || request.created_at)}</div>
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
              {request.remarks ? (
                <div className="text-sm">
                  <div className="text-slate-400">Remarks</div>
                  <div className="text-slate-200">{request.remarks}</div>
                </div>
              ) : null}
            </div>

            {request.quotations_required && request.status === "pending" && canApprove ? (
              <Alert variant="info">
                Select a quotation before approving this expense request.
              </Alert>
            ) : null}

            <div className="space-y-3">
              <h3 className="text-base font-semibold text-slate-100">Quotation Comparison</h3>
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
                        <DataTableCell align="right">
                          {formatCurrency(quote.quotation_amount)}
                        </DataTableCell>
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
          </>
        )}
      </div>

      <ErpModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="Upload Quotation"
      >
        <form onSubmit={handleUploadQuotation} className="space-y-4">
          <FormField label="Vendor Name">
            <Input
              name="vendor_name"
              value={formData.vendor_name}
              onChange={handleInputChange}
              required
            />
          </FormField>
          <FormField label="Vendor Contact">
            <Input
              name="vendor_contact"
              value={formData.vendor_contact}
              onChange={handleInputChange}
            />
          </FormField>
          <FormField label="Quotation Amount (INR)">
            <Input
              name="quotation_amount"
              type="number"
              min="0.01"
              step="0.01"
              value={formData.quotation_amount}
              onChange={handleInputChange}
              required
            />
          </FormField>
          <FormField label="Quotation Date">
            <Input
              name="quotation_date"
              type="date"
              value={formData.quotation_date}
              onChange={handleInputChange}
              required
            />
          </FormField>
          <FormField label="Remarks">
            <Input name="remarks" value={formData.remarks} onChange={handleInputChange} />
          </FormField>
          <FormField label="Attachment">
            <Input
              name="attachment"
              type="file"
              onChange={handleInputChange}
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
