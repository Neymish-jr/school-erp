import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import DashboardLayout from "../../layouts/DashboardLayout";
import {
  approveActivity,
  completeActivity,
  fetchActivityAllocationAvailability,
  fetchActivityById,
  fetchActivityTimeline,
  rejectActivity,
  submitActivity,
  updateActivity,
} from "../../api/activities";
import { fetchBudgetAllocations } from "../../api/finance";
import API from "../../api/axios";
import { usePermissions } from "../../hooks/usePermissions";
import { isActiveStaffTeacher } from "../teachers/constants/teacherStatus";
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
  Select,
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

const isEditableActivityStatus = (status) => status === "draft" || status === "rejected";

const isSubmittableActivityStatus = (status) => status === "draft" || status === "rejected";

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
  const { can, role } = usePermissions();
  const canUpdateActivity = can("finance.activity.update");
  const canSubmitActivity = can("finance.activity.submit");
  const canApproveActivity = can("finance.activity.approve");
  const canRejectActivity = can("finance.activity.reject");
  const canCompleteActivity = can("finance.activity.complete");
  const canReadTimeline = can("finance.activity.read_timeline");
  const isTeacherUser = role === "teacher";

  const [activity, setActivity] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [timelineUnavailable, setTimelineUnavailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [rejectForm, setRejectForm] = useState({ rejection_remarks: "" });
  const [formData, setFormData] = useState({
    activity_name: "",
    description: "",
    allocated_budget: "",
    assigned_teacher_id: "",
    budget_allocation_id: "",
  });
  const [allocations, setAllocations] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [budgetAvailability, setBudgetAvailability] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const allocationOptions = useMemo(
    () =>
      allocations
        .filter((allocation) => allocation.is_active)
        .map((allocation) => ({
          value: String(allocation.id),
          label: `${allocation.sub_head_name} — ${formatCurrency(allocation.allocated_amount)}`,
        })),
    [allocations]
  );

  const teacherOptions = useMemo(
    () =>
      teachers.map((teacher) => ({
        value: String(teacher.id),
        label: teacher.teacher_name,
      })),
    [teachers]
  );

  const loadTimeline = useCallback(async () => {
    if (!canReadTimeline) {
      setTimeline(null);
      setTimelineUnavailable(true);
      return;
    }

    try {
      const timelineResponse = await fetchActivityTimeline(id);
      setTimeline(timelineResponse?.data?.data || null);
      setTimelineUnavailable(false);
    } catch (err) {
      setTimeline(null);
      setTimelineUnavailable(err?.response?.status === 403);
    }
  }, [canReadTimeline, id]);

  const loadActivity = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const activityResponse = await fetchActivityById(id);
      setActivity(activityResponse?.data?.data || null);
      await loadTimeline();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load activity");
      setActivity(null);
      setTimeline(null);
      setTimelineUnavailable(false);
    } finally {
      setLoading(false);
    }
  }, [id, loadTimeline]);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  const loadEditReferenceData = async (financialYearId) => {
    if (financialYearId) {
      const allocationsResponse = await fetchBudgetAllocations({
        financial_year_id: financialYearId,
        is_active: true,
      });
      setAllocations(allocationsResponse?.data?.data || []);
    } else {
      setAllocations([]);
    }

    if (!isTeacherUser) {
      const teachersResponse = await API.get("/api/teachers", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setTeachers((teachersResponse?.data?.data?.teachers || []).filter(isActiveStaffTeacher));
    }
  };

  const refreshBudgetAvailability = async (allocationId) => {
    if (!allocationId) {
      setBudgetAvailability(null);
      return null;
    }

    try {
      const response = await fetchActivityAllocationAvailability(allocationId, {
        exclude_activity_id: id,
      });
      const availability = response?.data?.data || null;
      setBudgetAvailability(availability);
      return availability;
    } catch {
      setBudgetAvailability(null);
      return null;
    }
  };

  const openEditModal = async () => {
    if (!activity) {
      return;
    }

    setFormData({
      activity_name: activity.activity_name || "",
      description: activity.description || "",
      allocated_budget: String(activity.allocated_budget ?? ""),
      assigned_teacher_id: activity.assigned_teacher_id
        ? String(activity.assigned_teacher_id)
        : "",
      budget_allocation_id: activity.budget_allocation_id
        ? String(activity.budget_allocation_id)
        : "",
    });
    setBudgetAvailability(null);
    setEditModalOpen(true);

    try {
      await loadEditReferenceData(activity.budget_financial_year_id);
      if (activity.budget_allocation_id) {
        await refreshBudgetAvailability(Number(activity.budget_allocation_id));
      }
    } catch {
      toast.error("Failed to load edit form data");
    }
  };

  useEffect(() => {
    if (!editModalOpen || !formData.budget_allocation_id) {
      return;
    }

    refreshBudgetAvailability(Number(formData.budget_allocation_id));
  }, [editModalOpen, formData.budget_allocation_id]);

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

  const handleSaveEdit = async (event) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      if (formData.budget_allocation_id) {
        const budget = Number(formData.allocated_budget);
        const availability = await refreshBudgetAvailability(
          Number(formData.budget_allocation_id)
        );

        if (
          availability &&
          Number.isFinite(budget) &&
          budget > Number(availability.available_balance)
        ) {
          toast.error(
            `Allocated budget exceeds available balance (${formatCurrency(
              availability.available_balance
            )}).`
          );
          return;
        }
      }

      await updateActivity(id, {
        activity_name: formData.activity_name.trim(),
        description: formData.description.trim(),
        allocated_budget: Number(formData.allocated_budget),
        ...(formData.budget_allocation_id
          ? { budget_allocation_id: Number(formData.budget_allocation_id) }
          : { budget_allocation_id: null }),
        ...(!isTeacherUser && formData.assigned_teacher_id
          ? { assigned_teacher_id: Number(formData.assigned_teacher_id) }
          : {}),
      });

      toast.success("Activity updated");
      setEditModalOpen(false);
      await loadActivity();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update activity");
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
            {canUpdateActivity && isEditableActivityStatus(activity.status) ? (
              <Button type="button" variant="secondary" disabled={isSaving} onClick={openEditModal}>
                Edit
              </Button>
            ) : null}
            {canSubmitActivity && isSubmittableActivityStatus(activity.status) ? (
              <Button
                type="button"
                disabled={isSaving}
                onClick={() =>
                  runWorkflowAction(
                    submitActivity,
                    activity.status === "rejected"
                      ? "Activity resubmitted"
                      : "Activity submitted"
                  )
                }
              >
                {activity.status === "rejected" ? "Resubmit" : "Submit"}
              </Button>
            ) : null}
            {canApproveActivity && activity.status === "submitted" ? (
              <Button
                type="button"
                disabled={isSaving}
                onClick={() => runWorkflowAction(approveActivity, "Activity approved")}
              >
                Approve
              </Button>
            ) : null}
            {canRejectActivity && activity.status === "submitted" ? (
              <Button
                type="button"
                variant="secondary"
                disabled={isSaving}
                onClick={() => setRejectModalOpen(true)}
              >
                Reject
              </Button>
            ) : null}
            {canCompleteActivity && activity.status === "approved" ? (
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
        {timelineUnavailable ? (
          <p className="text-sm text-slate-600">
            Timeline is not available for your role. Other activity details are shown above.
          </p>
        ) : (timeline?.events || []).length === 0 ? (
          <p className="text-sm text-slate-600">No timeline events recorded yet.</p>
        ) : (
          <ol className="space-y-4 border-l border-slate-200 pl-4">
            {timeline.events.map((event) => (
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
        )}
      </section>

      <ErpModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Activity"
      >
        <form onSubmit={handleSaveEdit}>
          <FormField label="Activity name" required>
            <Input
              name="activity_name"
              value={formData.activity_name}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  activity_name: event.target.value,
                }))
              }
              required
            />
          </FormField>
          <FormField label="Description" required>
            <Input
              name="description"
              value={formData.description}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              required
            />
          </FormField>
          <FormField label="Allocated budget (₹)" required>
            <Input
              name="allocated_budget"
              type="number"
              min="1"
              step="0.01"
              value={formData.allocated_budget}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  allocated_budget: event.target.value,
                }))
              }
              required
            />
            {budgetAvailability ? (
              <p className="mt-1 text-xs text-slate-500">
                Available for this allocation:{" "}
                {formatCurrency(budgetAvailability.available_balance)}
              </p>
            ) : null}
          </FormField>
          <FormField label="Budget allocation">
            <Select
              name="budget_allocation_id"
              value={formData.budget_allocation_id}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  budget_allocation_id: event.target.value,
                }))
              }
            >
              <option value="">Optional — link to allocation</option>
              {allocationOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </FormField>
          {!isTeacherUser ? (
            <FormField label="Assigned teacher" required>
              <Select
                name="assigned_teacher_id"
                value={formData.assigned_teacher_id}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    assigned_teacher_id: event.target.value,
                  }))
                }
                required
              >
                <option value="">Select teacher</option>
                {teacherOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </FormField>
          ) : null}
          <FormActions>
            <Button type="button" variant="secondary" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save changes"}
            </Button>
          </FormActions>
        </form>
      </ErpModal>

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
