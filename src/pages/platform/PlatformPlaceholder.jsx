import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { Alert, Badge, Button, PageHeader, erp } from "../../design-system";

const PLATFORM_MODULES = {
  schools: {
    title: "Schools",
    features: [
      "School Directory",
      "Add/Edit Schools",
      "Principal Assignment",
      "UDISE Management",
      "School Status",
      "Tenant Context",
    ],
  },
  users: {
    title: "Users",
    features: [
      "User Directory",
      "User Provisioning",
      "Password Reset",
      "Teacher Linking",
      "Role Assignment",
      "Login History",
    ],
  },
  permissions: {
    title: "Permissions",
    features: [
      "Permission Matrix",
      "Role Management",
      "Permission Overrides",
      "Administrative Charge Permissions",
      "Audit History",
    ],
  },
  tenant: {
    title: "Tenant Context",
    features: [
      "Active School Switcher",
      "Multi-school Context",
      "Tenant Audit",
      "Platform Rollups",
    ],
  },
};

function PlatformPlaceholder({ module = "schools" }) {
  const navigate = useNavigate();
  const config = PLATFORM_MODULES[module] || PLATFORM_MODULES.schools;

  return (
    <DashboardLayout>
      <div className={`${erp.page} max-w-4xl`}>
        <PageHeader
          eyebrow="Platform Administration"
          title={config.title}
          description={`${config.title} management is planned for a future platform release.`}
          actions={<Badge variant="amber">Planned for v1.1</Badge>}
        />

        <Alert variant="info">
          <p className="font-semibold text-orange-50">
            This module is intentionally deferred from Release Candidate v0.95.0-rc1.
          </p>
          <p className="mt-2 text-orange-100/90">
            The current release focuses on operational school management — students, staff,
            academics, and finance workflows within an active school context.
          </p>
        </Alert>

        <section className={`${erp.card} ${erp.cardPaddingLg}`}>
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-300">
              <Icon icon="mdi:road-variant" className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-white">Planned Features</h2>
              <p className="mt-1 text-sm text-slate-400">
                The following capabilities are scoped for the platform administration program.
              </p>
              <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                {config.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2.5 rounded-xl border border-slate-800/80 bg-slate-950/40 px-3.5 py-2.5 text-sm text-slate-200"
                  >
                    <Icon
                      icon="mdi:checkbox-blank-circle-outline"
                      className="h-4 w-4 shrink-0 text-orange-400/80"
                    />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-sm leading-relaxed text-slate-500">
            This page is intentionally unavailable in the Release Candidate. The navigation exists
            so future platform functionality can be added without changing application structure.
          </p>
          <Button variant="secondary" className="shrink-0" onClick={() => navigate("/dashboard")}>
            <Icon icon="mdi:view-dashboard-outline" className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default PlatformPlaceholder;
