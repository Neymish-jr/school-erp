import { erp } from "../tokens";

function MetricGrid({ children, columns = 3 }) {
  const gridClass =
    columns === 4
      ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      : columns === 2
        ? "grid gap-4 sm:grid-cols-2"
        : "grid gap-4 sm:grid-cols-2 lg:grid-cols-3";

  return <div className={gridClass}>{children}</div>;
}

function MetricCard({ label, value, hint, accent = "orange" }) {
  const accentBar = {
    orange: "bg-orange-500",
    cyan: "bg-orange-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    violet: "bg-amber-600",
  }[accent] || "bg-orange-500";

  return (
    <article className={`${erp.card} relative overflow-hidden ${erp.cardPadding}`}>
      <div className={`absolute inset-x-0 top-0 h-0.5 ${accentBar}`} />
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </article>
  );
}

export { MetricGrid, MetricCard };
