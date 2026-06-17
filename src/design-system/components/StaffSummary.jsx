import { erp } from "../tokens";

function StaffSummary({
  total,
  active,
  former,
  isLoading = false,
  filteredCount,
  className = "",
}) {
  const value = (count) => (isLoading ? "…" : count);

  return (
    <div
      className={`${erp.card} flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <p className="text-sm text-slate-400">
        <span>
          <span className="font-medium text-slate-300">Total Staff:</span>{" "}
          <span className="tabular-nums text-slate-200">{value(total)}</span>
        </span>
        <span className="mx-2 text-slate-600" aria-hidden="true">
          •
        </span>
        <span>
          <span className="font-medium text-slate-300">Active:</span>{" "}
          <span className="tabular-nums text-emerald-400">{value(active)}</span>
        </span>
        <span className="mx-2 text-slate-600" aria-hidden="true">
          •
        </span>
        <span>
          <span className="font-medium text-slate-300">Former:</span>{" "}
          <span className="tabular-nums text-amber-400">{value(former)}</span>
        </span>
      </p>
      {filteredCount !== undefined ? (
        <p className="text-xs text-slate-500 sm:text-sm">
          Showing{" "}
          <span className="font-medium tabular-nums text-slate-400">
            {isLoading ? "…" : filteredCount}
          </span>{" "}
          {filteredCount === 1 ? "result" : "results"}
        </p>
      ) : null}
    </div>
  );
}

export default StaffSummary;
