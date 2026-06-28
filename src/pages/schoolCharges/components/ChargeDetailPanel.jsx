import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchChargeDetails } from "../../../api/charges";
import { isAdminLike } from "../../../utils/auth";
import {
  Alert,
  Badge,
  Button,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableColGroup,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  ErpDrawer,
  erp,
} from "../../../design-system";
import ChargeAssignModal from "./ChargeAssignModal";
import ChargeRelieveModal from "./ChargeRelieveModal";

const formatDate = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const sortTimeline = (assignments = []) =>
  [...assignments].sort((left, right) => {
    const leftDate = new Date(left.assigned_on || 0).getTime();
    const rightDate = new Date(right.assigned_on || 0).getTime();
    return leftDate - rightDate;
  });

function SectionCard({ title, description, children }) {
  return (
    <section className={`${erp.card} ${erp.cardPadding}`}>
      <div className="mb-4">
        <h3 className="text-base font-semibold text-white">{title}</h3>
        {description ? <p className="mt-1 text-sm text-slate-400">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function DetailField({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-100">{value || "—"}</dd>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-5">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className={`${erp.card} ${erp.cardPadding} space-y-3`}>
          <div className="h-4 w-40 animate-pulse rounded bg-slate-800" />
          <div className="h-16 animate-pulse rounded-xl bg-slate-800/80" />
          <div className="h-16 animate-pulse rounded-xl bg-slate-800/80" />
        </div>
      ))}
    </div>
  );
}

function ChargeDetailPanel({
  isOpen,
  chargeId,
  chargePreviewName = "",
  onClose,
  onAssignmentChange,
}) {
  const [details, setDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isRelieveOpen, setIsRelieveOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  const canManageAssignments = isAdminLike();

  const loadDetails = useCallback(async () => {
    if (!chargeId) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetchChargeDetails(chargeId);
      setDetails(response?.data?.data || null);
    } catch (loadError) {
      setDetails(null);
      setError(
        loadError?.response?.data?.message || "Unable to load charge profile right now."
      );
    } finally {
      setIsLoading(false);
    }
  }, [chargeId]);

  useEffect(() => {
    if (!isOpen || !chargeId) {
      return undefined;
    }

    setDetails(null);
    setActionMessage("");
    loadDetails();

    return undefined;
  }, [isOpen, chargeId, loadDetails]);

  const handleAssignmentSuccess = async () => {
    setActionMessage("Assignment updated successfully.");
    await loadDetails();
    onAssignmentChange?.();
  };

  const timeline = useMemo(
    () => sortTimeline(details?.assignmentHistory || []),
    [details?.assignmentHistory]
  );

  const drawerTitle =
    details?.charge?.charge_name || chargePreviewName || "School Charge";

  const showAssignAction =
    canManageAssignments && details?.charge?.is_active && !details?.currentHolder;
  const showRelieveAction = canManageAssignments && Boolean(details?.currentHolder);

  const drawerFooter =
    !isLoading && !error && details && (showAssignAction || showRelieveAction) ? (
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        {showAssignAction ? (
          <Button type="button" onClick={() => setIsAssignOpen(true)}>
            Assign Teacher
          </Button>
        ) : null}
        {showRelieveAction ? (
          <Button type="button" variant="danger" onClick={() => setIsRelieveOpen(true)}>
            Relieve Holder
          </Button>
        ) : null}
      </div>
    ) : null;

  return (
    <>
      <ErpDrawer
        isOpen={isOpen}
        onClose={onClose}
        eyebrow="School Charge Profile"
        title={drawerTitle}
        size="2xl"
        footer={drawerFooter}
      >
        {isLoading ? <LoadingSkeleton /> : null}

        {!isLoading && error ? (
          <div className="space-y-4">
            <Alert variant="error">{error}</Alert>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        ) : null}

        {!isLoading && !error && details ? (
          <div className="space-y-5">
            {actionMessage ? <Alert variant="success">{actionMessage}</Alert> : null}

            <SectionCard title="Current Holder">
              {details.currentHolder ? (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <Badge variant="emerald">Active</Badge>
                    {details.currentHolder.is_additional_charge ? (
                      <Badge variant="amber">Additional charge</Badge>
                    ) : null}
                  </div>

                  <dl className="grid gap-4 sm:grid-cols-2">
                    <DetailField
                      label="Teacher"
                      value={
                        details.currentHolder.teacher_id ? (
                          <Link
                            to={`/teachers/${details.currentHolder.teacher_id}`}
                            className="font-medium text-orange-300 transition hover:text-orange-200"
                            onClick={onClose}
                          >
                            {details.currentHolder.teacher_name}
                          </Link>
                        ) : (
                          details.currentHolder.teacher_name
                        )
                      }
                    />
                    <DetailField
                      label="Assigned on"
                      value={formatDate(details.currentHolder.assigned_on)}
                    />
                    <DetailField
                      label="Academic year"
                      value={details.currentHolder.academic_year}
                    />
                    <DetailField
                      label="Additional charge"
                      value={details.currentHolder.is_additional_charge ? "Yes" : "No"}
                    />
                    <DetailField
                      label="Assigned by"
                      value={details.currentHolder.assigned_by_user_name}
                    />
                    {details.currentHolder.remarks ? (
                      <div className="sm:col-span-2">
                        <DetailField
                          label="Remarks"
                          value={details.currentHolder.remarks}
                        />
                      </div>
                    ) : null}
                  </dl>
                </div>
              ) : (
                <Alert variant="warning">
                  No active holder for this charge.
                  {canManageAssignments && details.charge?.is_active
                    ? " Use Assign Teacher below to assign a teacher."
                    : " Assign a teacher from the Assignments tab."}
                </Alert>
              )}
            </SectionCard>

            <SectionCard
              title="Assignment Timeline"
              description="Chronological assignment history for this charge."
            >
              {timeline.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-700 px-4 py-10 text-center text-sm text-slate-400">
                  No assignment history recorded yet.
                </div>
              ) : (
                <ol className="relative border-s border-slate-800 ps-2">
                  {timeline.map((assignment, index) => (
                    <li key={assignment.id} className="mb-6 ms-6 last:mb-0">
                      <span
                        className={`absolute -start-3 flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold ${
                          assignment.is_active
                            ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-200"
                            : "border-slate-700 bg-slate-950 text-slate-300"
                        }`}
                      >
                        {index + 1}
                      </span>

                      <div
                        className={`rounded-2xl border p-4 ${
                          assignment.is_active
                            ? "border-emerald-500/30 bg-emerald-500/5"
                            : "border-slate-800 bg-slate-950/60"
                        }`}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-base font-semibold text-white">
                                {assignment.teacher_name}
                              </h4>
                              {assignment.is_active ? (
                                <Badge variant="emerald">Current</Badge>
                              ) : (
                                <Badge variant="default">Relieved</Badge>
                              )}
                              {assignment.is_additional_charge ? (
                                <Badge variant="amber">Additional</Badge>
                              ) : null}
                            </div>
                            <p className="mt-1 text-sm text-slate-400">
                              Academic year {assignment.academic_year}
                            </p>
                          </div>

                          <div className="text-sm text-slate-400">
                            <p>{formatDate(assignment.assigned_on)}</p>
                            <p className="text-xs">
                              {assignment.relieved_on
                                ? `to ${formatDate(assignment.relieved_on)}`
                                : "Present"}
                            </p>
                          </div>
                        </div>

                        {assignment.assigned_by_user_name ? (
                          <p className="mt-3 text-sm text-slate-500">
                            Assigned by {assignment.assigned_by_user_name}
                          </p>
                        ) : null}

                        {assignment.remarks ? (
                          <p className="mt-2 text-sm text-slate-300">
                            <span className="text-slate-500">Remarks:</span> {assignment.remarks}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </SectionCard>

            <SectionCard title="Charge Overview">
              <div className="mb-4 flex flex-wrap gap-2">
                <Badge variant={details.charge?.is_active ? "emerald" : "rose"}>
                  {details.charge?.is_active ? "Active" : "Inactive"}
                </Badge>
                {details.charge?.is_pm_shri ? <Badge variant="violet">PM SHRI</Badge> : null}
              </div>

              <dl className="grid gap-4 sm:grid-cols-2">
                <DetailField label="Charge name" value={details.charge?.charge_name} />
                <DetailField label="Created at" value={formatDateTime(details.charge?.created_at)} />
                <div className="sm:col-span-2">
                  <DetailField
                    label="Description"
                    value={details.charge?.description || "No description provided."}
                  />
                </div>
              </dl>
            </SectionCard>

            <SectionCard
              title="Academic Year Summary"
              description="Derived from assignment academic years."
            >
              {details.financialYearSummary?.length ? (
                <DataTable fixedLayout>
                  <DataTableColGroup widths={["18%", "14%", "16%", "28%", "24%"]} />
                  <DataTableHead>
                    <DataTableRow>
                      <DataTableHeaderCell>Academic year</DataTableHeaderCell>
                      <DataTableHeaderCell>Holders</DataTableHeaderCell>
                      <DataTableHeaderCell>Assignments</DataTableHeaderCell>
                      <DataTableHeaderCell>Active holder</DataTableHeaderCell>
                      <DataTableHeaderCell>Status</DataTableHeaderCell>
                    </DataTableRow>
                  </DataTableHead>
                  <DataTableBody>
                    {details.financialYearSummary.map((row) => (
                      <DataTableRow key={row.academic_year}>
                        <DataTableCell>{row.academic_year}</DataTableCell>
                        <DataTableCell>{row.holder_count}</DataTableCell>
                        <DataTableCell>{row.assignment_count}</DataTableCell>
                        <DataTableCell>{row.active_holder_name || "—"}</DataTableCell>
                        <DataTableCell>
                          {row.is_current ? (
                            <Badge variant="emerald">Current</Badge>
                          ) : (
                            <Badge variant="default">Past</Badge>
                          )}
                        </DataTableCell>
                      </DataTableRow>
                    ))}
                  </DataTableBody>
                </DataTable>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-700 px-4 py-10 text-center text-sm text-slate-400">
                  No academic year summary available yet.
                </div>
              )}
            </SectionCard>
          </div>
        ) : null}
      </ErpDrawer>

      <ChargeAssignModal
        isOpen={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        charge={details?.charge}
        onSuccess={handleAssignmentSuccess}
      />

      <ChargeRelieveModal
        isOpen={isRelieveOpen}
        onClose={() => setIsRelieveOpen(false)}
        charge={details?.charge}
        currentHolder={details?.currentHolder}
        onSuccess={handleAssignmentSuccess}
      />
    </>
  );
}

export default ChargeDetailPanel;
