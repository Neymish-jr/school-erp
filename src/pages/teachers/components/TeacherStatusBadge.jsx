const STATUS_STYLES = {
  active: {
    label: "Active",
    className: "bg-emerald-500/15 text-emerald-200",
    compactClassName: "border-emerald-500/25 bg-emerald-500/5 text-emerald-300",
  },
  deputation: {
    label: "Deputation",
    className: "bg-cyan-500/15 text-cyan-200",
    compactClassName: "border-cyan-500/25 bg-cyan-500/5 text-cyan-300",
  },
  transferred: {
    label: "Transferred",
    className: "bg-slate-500/15 text-slate-300",
    compactClassName: "border-slate-600/40 bg-slate-800/40 text-slate-400",
  },
  retired: {
    label: "Retired",
    className: "bg-violet-500/15 text-violet-200",
    compactClassName: "border-violet-500/25 bg-violet-500/5 text-violet-300",
  },
  resigned: {
    label: "Resigned",
    className: "bg-rose-500/15 text-rose-200",
    compactClassName: "border-rose-500/25 bg-rose-500/5 text-rose-300",
  },
};

export const TEACHER_STATUS_OPTIONS = Object.entries(STATUS_STYLES).map(
  ([value, { label }]) => ({ value, label })
);

export const getTeacherStatusConfig = (status = "active") =>
  STATUS_STYLES[status] || STATUS_STYLES.active;

function TeacherStatusBadge({ status = "active", compact = false }) {
  const config = getTeacherStatusConfig(status);

  if (compact) {
    return (
      <span
        className={`inline-flex shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium leading-none ${config.compactClassName}`}
      >
        {config.label}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${config.className}`}
    >
      {config.label}
    </span>
  );
}

function TeacherStatusSelect({
  status = "active",
  onChange,
  disabled = false,
  ariaLabel,
  compact = false,
}) {
  const config = getTeacherStatusConfig(status);

  const className = compact
    ? `w-[6.75rem] cursor-pointer appearance-none rounded-md border bg-right bg-no-repeat px-2 py-1 pr-6 text-[11px] font-medium leading-tight outline-none transition focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50 ${config.compactClassName}`
    : `inline-flex min-w-[8.5rem] cursor-pointer appearance-none rounded-full border-0 bg-right bg-no-repeat px-3 py-1.5 pr-8 text-xs font-semibold outline-none transition focus:ring-2 focus:ring-cyan-400/40 disabled:cursor-not-allowed disabled:opacity-60 ${config.className}`;

  const chevronStyle = compact
    ? {
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E\")",
        backgroundPosition: "right 0.35rem center",
        backgroundSize: "0.75rem 0.75rem",
      }
    : {
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E\")",
        backgroundPosition: "right 0.5rem center",
        backgroundSize: "1rem 1rem",
      };

  return (
    <select
      value={status}
      onChange={onChange}
      disabled={disabled}
      aria-label={ariaLabel}
      className={className}
      style={chevronStyle}
    >
      {TEACHER_STATUS_OPTIONS.map((option) => (
        <option key={option.value} value={option.value} className="bg-slate-950 text-white">
          {option.label}
        </option>
      ))}
    </select>
  );
}

export default TeacherStatusBadge;
export { TeacherStatusSelect };
