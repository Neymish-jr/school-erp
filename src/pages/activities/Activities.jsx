import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import DashboardLayout from "../../layouts/DashboardLayout";
import {
  approveActivity,
  completeActivity,
  createActivity,
  fetchActivities,
  fetchActivityAllocationAvailability,
  fetchActivityDashboard,
  rejectActivity,
  submitActivity,
  updateActivity,
} from "../../api/activities";
import { fetchBudgetAllocations, fetchFinancialYears } from "../../api/finance";
import API from "../../api/axios";
import { usePermissions } from "../../hooks/usePermissions";
import { isActiveStaffTeacher } from "../teachers/constants/teacherStatus";
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
} from "../../design-system";

const COLUMN_WIDTHS = ["18%", "14%", "12%", "14%", "12%", "12%", "18%"];

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "completed", label: "Completed" },
];

const emptyForm = {
  activity_name: "",
  description: "",
  allocated_budget: "",
  assigned_teacher_id: "",
  budget_allocation_id: "",
};

const emptyRejectForm = { rejection_remarks: "" };

const ACTIVITY_STATUS_VALUES = STATUS_OPTIONS.map((option) => option.value).filter(Boolean);

const isEditableActivityStatus = (status) => status === "draft" || status === "rejected";

const isSubmittableActivityStatus = (status) => status === "draft" || status === "rejected";

const resolveInitialActivityStatusFilter = (role, statusParam) => {
  if (statusParam && ACTIVITY_STATUS_VALUES.includes(statusParam)) {
    return statusParam;
  }

  if (role === "principal") {
    return "submitted";
  }

  return "";
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

function Activities() {
  const { can, role } = usePermissions();
  const [searchParams] = useSearchParams();
  const canCreateActivity = can("finance.activity.create");
  const canUpdateActivity = can("finance.activity.update");
  const canSubmitActivity = can("finance.activity.submit");
  const canApproveActivity = can("finance.activity.approve");
  const canCompleteActivity = can("finance.activity.complete");
  const isTeacherUser = role === "teacher";

  const [financialYears, setFinancialYears] = useState([]);
  const [selectedFyId, setSelectedFyId] = useState("");
  const [activities, setActivities] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [allocations, setAllocations] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState(() =>
    resolveInitialActivityStatusFilter(role, searchParams.get("status"))
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [rejectForm, setRejectForm] = useState(emptyRejectForm);
  const [budgetAvailability, setBudgetAvailability] = useState(null);
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

  const loadReferenceData = useCallback(async () => {
    const yearsResponse = await fetchFinancialYears();
    const years = yearsResponse?.data?.data || [];
    setFinancialYears(years);

    const activeYear = years.find((year) => year.status === "active") || years[0];
    const fyId = activeYear ? String(activeYear.id) : "";
    setSelectedFyId((current) => current || fyId);

    if (!isTeacherUser) {
      const teachersResponse = await API.get("/api/teachers", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setTeachers((teachersResponse?.data?.data?.teachers || []).filter(isActiveStaffTeacher));
    }
  }, [isTeacherUser]);

  const loadActivities = useCallback(async () => {
    if (!selectedFyId) {
      setActivities([]);
      setDashboard(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const params = {
        financial_year_id: selectedFyId,
        ...(statusFilter ? { status: statusFilter } : {}),
      };

      const [activitiesResponse, dashboardResponse, allocationsResponse] = await Promise.all([
        fetchActivities(params),
        fetchActivityDashboard({ financial_year_id: selectedFyId }),
        fetchBudgetAllocations({ financial_year_id: selectedFyId, is_active: true }),
      ]);

      setActivities(activitiesResponse?.data?.data || []);
      setDashboard(dashboardResponse?.data?.data || null);
      setAllocations(allocationsResponse?.data?.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load activities");
      setActivities([]);
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  }, [selectedFyId, statusFilter]);

  useEffect(() => {
    loadReferenceData().catch(() => {
      setError("Failed to load reference data");
    });
  }, [loadReferenceData]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  const openCreateModal = () => {
    setEditingActivityId(null);
    setFormData(emptyForm);
    setBudgetAvailability(null);
    setIsModalOpen(true);
  };

  const openEditModal = (activity) => {
    setEditingActivityId(activity.id);
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
    setIsModalOpen(true);
  };

  const refreshBudgetAvailability = useCallback(
    async (allocationId, excludeActivityId = null) => {
      if (!allocationId) {
        setBudgetAvailability(null);
        return null;
      }

      try {
        const response = await fetchActivityAllocationAvailability(allocationId, {
          ...(excludeActivityId ? { exclude_activity_id: excludeActivityId } : {}),
        });
        const availability = response?.data?.data || null;
        setBudgetAvailability(availability);
        return availability;
      } catch {
        setBudgetAvailability(null);
        return null;
      }
    },
    []
  );

  useEffect(() => {
    if (!isModalOpen || !formData.budget_allocation_id) {
      return;
    }

    refreshBudgetAvailability(
      Number(formData.budget_allocation_id),
      editingActivityId
    );
  }, [
    editingActivityId,
    formData.budget_allocation_id,
    isModalOpen,
    refreshBudgetAvailability,
  ]);

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const validateBudgetBeforeSave = async () => {
    if (!formData.budget_allocation_id) {
      return null;
    }

    const budget = Number(formData.allocated_budget);
    if (!Number.isFinite(budget) || budget <= 0) {
      return "Enter a valid allocated budget.";
    }

    const availability = await refreshBudgetAvailability(
      Number(formData.budget_allocation_id),
      editingActivityId
    );

    if (
      availability &&
      budget > Number(availability.available_balance)
    ) {
      return `Allocated budget exceeds available balance (${formatCurrency(
        availability.available_balance
      )}).`;
    }

    return null;
  };

  const buildActivityPayload = () => ({
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

  const handleSaveActivity = async (event) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      const budgetError = await validateBudgetBeforeSave();
      if (budgetError) {
        toast.error(budgetError);
        return;
      }

      const payload = buildActivityPayload();

      if (editingActivityId) {
        await updateActivity(editingActivityId, payload);
        toast.success("Activity updated");
      } else {
        const response = await createActivity(payload);
        const requiresQuotation = response?.data?.data?.requires_quotation;

        toast.success(
          requiresQuotation
            ? "Activity created. Quotations will be required for amounts above ₹50,000."
            : "Activity created as draft"
        );
      }

      setIsModalOpen(false);
      setEditingActivityId(null);
      setFormData(emptyForm);
      setBudgetAvailability(null);
      await loadActivities();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save activity");
    } finally {
      setIsSaving(false);
    }
  };

  const runAction = async (activity, actionFn, successMessage) => {
    setIsSaving(true);
    try {
      await actionFn(activity.id);
      toast.success(successMessage);
      await loadActivities();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Action failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReject = async (event) => {
    event.preventDefault();
    if (!rejectTarget) return;

    setIsSaving(true);
    try {
      await rejectActivity(rejectTarget.id, {
        rejection_remarks: rejectForm.rejection_remarks.trim(),
      });
      toast.success("Activity rejected");
      setRejectModalOpen(false);
      setRejectTarget(null);
      setRejectForm(emptyRejectForm);
      await loadActivities();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to reject activity");
    } finally {
      setIsSaving(false);
    }
  };

  const dashboardStats = [
    {
      label: "Total Budget",
      value: formatCurrency(dashboard?.total_budget),
    },
    {
      label: "Allocated Budget",
      value: formatCurrency(dashboard?.allocated_budget),
    },
    {
      label: "Utilized Budget",
      value: formatCurrency(dashboard?.utilized_budget),
    },
    {
      label: "Remaining Budget",
      value: formatCurrency(dashboard?.remaining_budget),
    },
  ];

  return (
    <DashboardLayout>
      <PageHeader
        title="Activities"
        description="Plan school activities, submit for principal approval, and track budget utilization."
        actions={
          canCreateActivity ? (
            <Button type="button" onClick={openCreateModal}>
              New Activity
            </Button>
          ) : null
        }
      />

      {error ? <Alert variant="error">{error}</Alert> : null}

      <MetricGrid>
        {dashboardStats.map((stat) => (
          <MetricCard key={stat.label} label={stat.label} value={stat.value} />
        ))}
      </MetricGrid>

      <FilterToolbar>
        <FilterSelect
          label="Financial year"
          value={selectedFyId}
          onChange={(event) => setSelectedFyId(event.target.value)}
          options={financialYearOptions}
        />
        <FilterSelect
          label="Status"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          options={STATUS_OPTIONS}
        />
      </FilterToolbar>

      {loading ? (
        <DataTable>
          <DataTableColGroup widths={COLUMN_WIDTHS} />
          <DataTableHead>
            <DataTableRow>
              <DataTableHeaderCell>Activity</DataTableHeaderCell>
              <DataTableHeaderCell>Teacher</DataTableHeaderCell>
              <DataTableHeaderCell>Budget</DataTableHeaderCell>
              <DataTableHeaderCell>Budget Head</DataTableHeaderCell>
              <DataTableHeaderCell>Status</DataTableHeaderCell>
              <DataTableHeaderCell>Submitted</DataTableHeaderCell>
              <DataTableHeaderCell>Actions</DataTableHeaderCell>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            <DataTableSkeleton columns={COLUMN_WIDTHS.length} />
          </DataTableBody>
        </DataTable>
      ) : (
        <DataTable>
          <DataTableColGroup widths={COLUMN_WIDTHS} />
          <DataTableHead>
            <DataTableRow>
              <DataTableHeaderCell>Activity</DataTableHeaderCell>
              <DataTableHeaderCell>Teacher</DataTableHeaderCell>
              <DataTableHeaderCell>Budget</DataTableHeaderCell>
              <DataTableHeaderCell>Budget Head</DataTableHeaderCell>
              <DataTableHeaderCell>Status</DataTableHeaderCell>
              <DataTableHeaderCell>Submitted</DataTableHeaderCell>
              <DataTableHeaderCell>Actions</DataTableHeaderCell>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {activities.length === 0 ? (
              <DataTableEmpty colSpan={COLUMN_WIDTHS.length}>
                No activities found for the selected filters.
              </DataTableEmpty>
            ) : (
              activities.map((activity) => (
                <DataTableRow key={activity.id}>
                  <DataTableCell>
                    <Link to={`/activities/${activity.id}`} className="font-medium text-primary-600">
                      {activity.activity_name}
                    </Link>
                  </DataTableCell>
                  <DataTableCell>{activity.teacher_name || "—"}</DataTableCell>
                  <DataTableCell>{formatCurrency(activity.allocated_budget)}</DataTableCell>
                  <DataTableCell>{activity.budget_head_name || "—"}</DataTableCell>
                  <DataTableCell>
                    <StatusBadge status={activity.status} />
                  </DataTableCell>
                  <DataTableCell>
                    {activity.submitted_at
                      ? new Date(activity.submitted_at).toLocaleDateString("en-GB")
                      : "—"}
                  </DataTableCell>
                  <DataTableCell>
                    <div className="flex flex-wrap gap-2">
                      {canUpdateActivity && isEditableActivityStatus(activity.status) ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={isSaving}
                          onClick={() => openEditModal(activity)}
                        >
                          Edit
                        </Button>
                      ) : null}
                      {canSubmitActivity && isSubmittableActivityStatus(activity.status) ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={isSaving}
                          onClick={() =>
                            runAction(
                              activity,
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
                        <>
                          <Button
                            type="button"
                            size="sm"
                            disabled={isSaving}
                            onClick={() => runAction(activity, approveActivity, "Activity approved")}
                          >
                            Approve
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={isSaving}
                            onClick={() => {
                              setRejectTarget(activity);
                              setRejectModalOpen(true);
                            }}
                          >
                            Reject
                          </Button>
                        </>
                      ) : null}
                      {canCompleteActivity && activity.status === "approved" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={isSaving}
                          onClick={() => runAction(activity, completeActivity, "Activity completed")}
                        >
                          Complete
                        </Button>
                      ) : null}
                    </div>
                  </DataTableCell>
                </DataTableRow>
              ))
            )}
          </DataTableBody>
        </DataTable>
      )}

      <ErpModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingActivityId(null);
          setBudgetAvailability(null);
        }}
        title={editingActivityId ? "Edit Activity" : "New Activity"}
      >
        <form onSubmit={handleSaveActivity}>
          <FormField label="Activity name" required>
            <Input
              name="activity_name"
              value={formData.activity_name}
              onChange={handleFormChange}
              required
            />
          </FormField>
          <FormField label="Description" required>
            <Input
              name="description"
              value={formData.description}
              onChange={handleFormChange}
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
              onChange={handleFormChange}
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
              onChange={handleFormChange}
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
                onChange={handleFormChange}
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
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving
                ? "Saving..."
                : editingActivityId
                  ? "Save changes"
                  : "Create draft"}
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
              name="rejection_remarks"
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

export default Activities;
