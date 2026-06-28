import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import DashboardLayout from "../../layouts/DashboardLayout";
import {
  approveActivity,
  completeActivity,
  fetchActivityById,
  fetchActivityTimeline,
  rejectActivity,
  submitActivity,
} from "../../api/activities";
import { isAdminLike } from "../../utils/auth";
import {
  PageHeader,
  MetricGrid,
  MetricCard,
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
} from "../../design-system";

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

const formatDateTime = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const StatusBadge = ({ status }) => {
  const variants = {
    draft: "default",
    submitted: "amber",
    approved: "emerald",
    rejected: "rose",
    completed: "violet",
  };

  const labels = {
    draft: "Draft",
    submitted: "Submitted",
    approved: "Approved",
    rejected: "Rejected",
    completed: "Completed",
  };

  return (
    <Badge variant={variants[status] || "default"}>{labels[status] || status}</Badge>
  );
};

function ActivityDetail() {
  const { id } = useParams();
  const canApprove = isAdminLike();

  const [activity, setActivity] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectForm, setRejectForm] = useState({ rejection_remarks: "" });
  const [isSaving, setIsSaving] = useState(false);

  const loadActivity = async () => {
    setLoading(true);
    setError("");

    try {
      const [activityResponse, timelineResponse] = await Promise.all([
        fetchActivityById(id),
        fetchActivityTimeline(id),
      ]);

      setActivity(activityResponse?.data?.data || null);
      setTimeline(timelineResponse?.data?.data || null);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load activity");
      setActivity(null);
      setTimeline(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivity();
  }, [id]);

  const runWorkflowAction = async (action, successMessage) => {
    setIsSaving(true);
    try {
      await action(id);
      toast.success(successMessage);
      await loadActivity();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Action failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReject = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      await rejectActivity(id, {
        rejection_remarks: rejectForm.rejection_remarks.trim(),
      });
      toast.success("Activity rejected");
      setRejectModalOpen(false);
      setRejectForm({ rejection_remarks: "" });
      await loadActivity();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to reject activity");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <PageHeader title="Activity Detail" description="Loading activity..." />
      </DashboardLayout>
    );
  }

  if (!activity) {
    return (
      <DashboardLayout>
        <PageHeader title="Activity Detail" />
        <Alert variant="error">{error || "Activity not found"}</Alert>
        <Link to="/activities" className="text-primary-600">
          Back to activities
        </Link>
      </DashboardLayout>
    );
  }

  const summary = activity.expense_summary || {};

  return (
    <DashboardLayout>
      <PageHeader
        title={activity.activity_name}
        description={activity.description}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/activities">
              <Button type="button" variant="secondary">
                Back
              </Button>
            </Link>
            {activity.status === "draft" ? (
              <Button
                type="button"
                disabled={isSaving}
                onClick={() => runWorkflowAction(submitActivity, "Activity submitted")}
              >
                Submit
              </Button>
            ) : null}
            {canApprove && activity.status === "submitted" ? (
              <>
                <Button
                  type="button"
                  disabled={isSaving}
                  onClick={() => runWorkflowAction(approveActivity, "Activity approved")}
                >
                  Approve
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isSaving}
                  onClick={() => setRejectModalOpen(true)}
                >
                  Reject
                </Button>
              </>
            ) : null}
            {activity.status === "approved" ? (
              <Button
                type="button"
                variant="secondary"
                disabled={isSaving}
                onClick={() => runWorkflowAction(completeActivity, "Activity completed")}
              >
                Mark completed
              </Button>
            ) : null}
          </div>
        }
      />

      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className="mb-4">
        <StatusBadge status={activity.status} />
      </div>

      <MetricGrid>
        <MetricCard label="Allocated Budget" value={formatCurrency(activity.allocated_budget)} />
        <MetricCard
          label="Total Requested"
          value={formatCurrency(summary.total_requested_amount)}
        />
        <MetricCard
          label="Total Approved"
          value={formatCurrency(summary.total_approved_amount)}
        />
        <MetricCard label="Assigned Teacher" value={activity.teacher_name || "—"} />
      </MetricGrid>

      <section className="mb-8 rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Activity Info</h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-slate-500">School</dt>
            <dd className="font-medium">{activity.school_name || "—"}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">Created</dt>
            <dd className="font-medium">{formatDateTime(activity.created_at)}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">Created by</dt>
            <dd className="font-medium">{activity.created_by_name || "—"}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">Rejection remarks</dt>
            <dd className="font-medium">{activity.rejection_remarks || "—"}</dd>
          </div>
        </dl>
      </section>

      <section className="mb-8 rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Linked Budget Allocation</h2>
        {activity.budget_allocation_id ? (
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-slate-500">Financial year</dt>
              <dd className="font-medium">{activity.budget_year_label || "—"}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Budget head</dt>
              <dd className="font-medium">{activity.budget_head_name || "—"}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Sub head</dt>
              <dd className="font-medium">{activity.budget_sub_head_name || "—"}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Allocation amount</dt>
              <dd className="font-medium">
                {formatCurrency(activity.budget_allocated_amount)}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-slate-600">No budget allocation linked to this activity.</p>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Linked Expense Requests</h2>
        <DataTable>
          <DataTableColGroup widths={["20%", "20%", "20%", "20%", "20%"]} />
          <DataTableHead>
            <DataTableRow>
              <DataTableHeaderCell>Purpose</DataTableHeaderCell>
              <DataTableHeaderCell>Amount</DataTableHeaderCell>
              <DataTableHeaderCell>Status</DataTableHeaderCell>
              <DataTableHeaderCell>Submitted</DataTableHeaderCell>
              <DataTableHeaderCell>Paid</DataTableHeaderCell>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {(activity.expense_requests || []).length === 0 ? (
              <DataTableEmpty colSpan={5}>No expense requests linked yet.</DataTableEmpty>
            ) : (
              activity.expense_requests.map((request) => (
                <DataTableRow key={request.id}>
                  <DataTableCell>{request.purpose}</DataTableCell>
                  <DataTableCell>{formatCurrency(request.requested_amount)}</DataTableCell>
                  <DataTableCell>{request.status}</DataTableCell>
                  <DataTableCell>{formatDateTime(request.submitted_at)}</DataTableCell>
                  <DataTableCell>{formatDateTime(request.paid_at)}</DataTableCell>
                </DataTableRow>
              ))
            )}
          </DataTableBody>
        </DataTable>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Activity Timeline</h2>
        <ol className="space-y-4 border-l border-slate-200 pl-4">
          {(timeline?.events || []).map((event) => (
            <li key={`${event.key}-${event.at}`} className="relative">
              <span className="absolute -left-[1.3rem] top-1 h-2.5 w-2.5 rounded-full bg-primary-500" />
              <p className="font-medium text-slate-900">{event.label}</p>
              <p className="text-sm text-slate-500">{formatDateTime(event.at)}</p>
              {event.by_user_name ? (
                <p className="text-sm text-slate-600">By {event.by_user_name}</p>
              ) : null}
              {event.remarks ? (
                <p className="text-sm text-slate-600">{event.remarks}</p>
              ) : null}
              {event.count ? (
                <p className="text-sm text-slate-600">{event.count} expense request(s)</p>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      <ErpModal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Reject Activity"
      >
        <form onSubmit={handleReject}>
          <FormField label="Rejection remarks" required>
            <Input
              value={rejectForm.rejection_remarks}
              onChange={(event) =>
                setRejectForm({ rejection_remarks: event.target.value })
              }
              required
            />
          </FormField>
          <FormActions>
            <Button type="button" variant="secondary" onClick={() => setRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Reject"}
            </Button>
          </FormActions>
        </form>
      </ErpModal>
    </DashboardLayout>
  );
}

export default ActivityDetail;
