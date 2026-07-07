import { Icon } from "@iconify/react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { PageHeader, Alert, Button } from "../../design-system";

const FAQ_ITEMS = [
  {
    question: "How do I mark student attendance?",
    answer:
      "Open Attendance (or My Schedule → Attendance for teachers), select class, section, and date, then save the register for each student.",
  },
  {
    question: "How does the expense request workflow work?",
    answer:
      "Teachers create and submit requests. The principal approves or rejects them. Office staff marks approved requests as paid, which posts entries to the cashbook.",
  },
  {
    question: "Who can manage the school timetable?",
    answer:
      "Principals can add and remove timetable entries. Teachers and office staff can view schedules in read-only mode.",
  },
  {
    question: "What are School Charges and My Responsibilities?",
    answer:
      "Principals assign administrative incharge roles (e.g. PM SHRI, Sports) via School Charges. Assigned teachers see their duties under My Responsibilities.",
  },
];

const FUTURE_SECTIONS = [
  { label: "Video Tutorials", icon: "mdi:play-circle-outline" },
  { label: "Release Notes", icon: "mdi:newspaper-variant-outline" },
  { label: "System Status", icon: "mdi:traffic-light-outline" },
];

function HelpSection({ title, description, children }) {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
      <h2 className="text-xl font-bold text-white">{title}</h2>
      {description ? <p className="mt-2 text-sm text-slate-400">{description}</p> : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function HelpCenter() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <PageHeader
          eyebrow="Help & Support"
          title="Help Center"
          description="Guides, answers, and contact options for using the School ERP."
        />

        <HelpSection
          title="User Guide"
          description="Quick orientation for common tasks in the ERP."
        >
          <ul className="space-y-4 text-sm text-slate-300">
            <li className="flex gap-3">
              <Icon icon="mdi:view-dashboard" className="mt-0.5 h-5 w-5 shrink-0 text-orange-400" />
              <span>
                <strong className="text-white">Dashboard</strong> — Your role-specific home shows
                quick actions, pending work, and summary widgets.
              </span>
            </li>
            <li className="flex gap-3">
              <Icon icon="mdi:account-school" className="mt-0.5 h-5 w-5 shrink-0 text-orange-400" />
              <span>
                <strong className="text-white">Students &amp; Academics</strong> — Manage enrollment,
                classes, attendance, assessments, and report cards from the Academics section.
              </span>
            </li>
            <li className="flex gap-3">
              <Icon icon="mdi:cash-multiple" className="mt-0.5 h-5 w-5 shrink-0 text-orange-400" />
              <span>
                <strong className="text-white">Finance</strong> — Activities, expense requests,
                quotations, budget allocations, and cashbook follow the approval → payment workflow.
              </span>
            </li>
            <li className="flex gap-3">
              <Icon icon="mdi:shield-account" className="mt-0.5 h-5 w-5 shrink-0 text-orange-400" />
              <span>
                <strong className="text-white">Permissions</strong> — Buttons and pages you see depend
                on your role. Contact your administrator if you need additional access.
              </span>
            </li>
          </ul>
        </HelpSection>

        <HelpSection title="FAQs" description="Frequently asked questions.">
          <dl className="space-y-5">
            {FAQ_ITEMS.map((item) => (
              <div key={item.question} className="border-b border-slate-800 pb-5 last:border-0 last:pb-0">
                <dt className="font-semibold text-white">{item.question}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-slate-300">{item.answer}</dd>
              </div>
            ))}
          </dl>
        </HelpSection>

        <HelpSection
          title="Contact Administrator"
          description="Reach your school or district IT team for account and access issues."
        >
          <Alert variant="info">
            For login problems, role changes, or data corrections, contact your school principal or
            district ERP administrator. Include your name, role, school name, and a short description
            of the issue.
          </Alert>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                School support
              </p>
              <p className="mt-2 text-sm text-slate-200">Principal / office staff desk</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                District support
              </p>
              <p className="mt-2 text-sm text-slate-200">DPO / BEO oversight team</p>
            </div>
          </div>
        </HelpSection>

        <HelpSection title="Coming Soon" description="Additional help resources in development.">
          <div className="grid gap-3 sm:grid-cols-3">
            {FUTURE_SECTIONS.map((section) => (
              <Button
                key={section.label}
                type="button"
                variant="secondary"
                disabled
                className="flex h-auto flex-col items-start gap-2 py-4 text-left opacity-60"
              >
                <Icon icon={section.icon} className="h-6 w-6 text-slate-400" />
                <span>{section.label}</span>
              </Button>
            ))}
          </div>
        </HelpSection>
      </div>
    </DashboardLayout>
  );
}

export default HelpCenter;
