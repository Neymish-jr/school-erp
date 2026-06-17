function Badge({ variant = "default", children }) {
  const styles = {
    default: "bg-slate-700/60 text-slate-200",
    orange: "bg-orange-500/15 text-orange-300",
    cyan: "bg-orange-500/15 text-orange-300",
    emerald: "bg-emerald-500/15 text-emerald-300",
    amber: "bg-amber-500/15 text-amber-300",
    rose: "bg-rose-500/15 text-rose-300",
    violet: "bg-amber-600/15 text-amber-300",
  };

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${styles[variant] || styles.default}`}
    >
      {children}
    </span>
  );
}

function VacancyCell({ vacant, filled, sanctioned, unavailable = false }) {
  if (unavailable) {
    return <span className="text-slate-500">—</span>;
  }

  const isFull = vacant === 0 && sanctioned > 0;
  const isCritical = vacant > 0 && filled === 0;

  return (
    <div className="flex w-full items-center justify-center gap-2">
      <span
        className={`font-semibold tabular-nums ${
          isCritical ? "text-amber-400" : isFull ? "text-emerald-400" : vacant > 0 ? "text-amber-300" : "text-slate-200"
        }`}
      >
        {vacant}
      </span>
      {vacant > 0 ? <Badge variant="amber">Open</Badge> : sanctioned > 0 ? <Badge variant="emerald">Full</Badge> : null}
    </div>
  );
}

export { Badge, VacancyCell };
