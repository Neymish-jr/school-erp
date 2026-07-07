import { Navigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { Badge, PageHeader } from "../../design-system";
import { usePermissions } from "../../hooks/usePermissions";

const getChargeAcademicYear = (charge) =>
  charge?.academic_year ?? charge?.academicYear ?? null;

const getChargeDescription = (charge) =>
  charge?.description?.trim() || null;

const getChargeStatus = (charge) => {
  if (charge?.status) {
    return String(charge.status);
  }

  if (charge?.is_active === false) {
    return "Inactive";
  }

  return "Active";
};

function ResponsibilityCard({ charge }) {
  const academicYear = getChargeAcademicYear(charge);
  const description = getChargeDescription(charge);
  const status = getChargeStatus(charge);
  const isActive = status.toLowerCase() === "active";

  return (
    <article className="flex h-full flex-col rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-6 shadow-[0_25px_80px_-32px_rgba(139,92,246,0.2)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-300">
            <Icon icon="mdi:shield-account-outline" className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-white">{charge.charge_name || "Responsibility"}</h2>
            {charge.charge_code ? (
              <p className="mt-1 text-sm text-slate-400">{charge.charge_code}</p>
            ) : null}
          </div>
        </div>
        <Badge variant={isActive ? "emerald" : "default"}>{status}</Badge>
      </div>

      <dl className="mt-6 space-y-4 text-sm">
        {academicYear ? (
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Academic Year
            </dt>
            <dd className="mt-1 font-medium text-slate-200">{academicYear}</dd>
          </div>
        ) : null}

        {description ? (
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Description
            </dt>
            <dd className="mt-1 leading-relaxed text-slate-300">{description}</dd>
          </div>
        ) : null}

        {!academicYear && !description ? (
          <p className="text-slate-400">
            You are the assigned in-charge for this responsibility. Program tools will appear here in
            a future update.
          </p>
        ) : null}
      </dl>
    </article>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/50 px-6 py-16 text-center">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800 text-violet-300">
        <Icon icon="mdi:clipboard-text-outline" className="h-8 w-8" />
      </span>
      <h2 className="mt-6 text-2xl font-bold text-white">No responsibilities assigned yet</h2>
      <p className="mx-auto mt-3 max-w-lg text-slate-300">
        When your principal assigns an administrative charge — such as PM SHRI In-Charge, Sports
        In-Charge, or Examination In-Charge — it will appear here as your personal workspace.
      </p>
      <p className="mx-auto mt-4 max-w-lg text-sm text-slate-500">
        You do not need to manage the school charge catalog. Assignments are handled by school
        administration.
      </p>
    </div>
  );
}

function MyResponsibilities() {
  const { role, loading, administrativeCharges } = usePermissions();

  if (!loading && role && role !== "teacher") {
    return <Navigate to="/school-charges" replace />;
  }

  const responsibilities = Array.isArray(administrativeCharges) ? administrativeCharges : [];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <PageHeader
          eyebrow="Teacher Workspace"
          title="My Responsibilities"
          description="Administrative incharge roles assigned to you for the current school year. Each card reflects an active assignment from school administration."
        />

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-48 animate-pulse rounded-3xl border border-slate-800 bg-slate-900/80"
              />
            ))}
          </div>
        ) : responsibilities.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {responsibilities.map((charge) => (
              <ResponsibilityCard
                key={charge.assignment_id ?? charge.id ?? charge.charge_code}
                charge={charge}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default MyResponsibilities;
