import { Link } from "react-router-dom";
import Button from "./Button";

function StaffDirectoryRow({
  name,
  designation,
  phone,
  profileTo,
  statusBadge,
  unassignedLabel = "Unassigned",
  phoneFallback = "—",
}) {
  const hasDesignation = designation && designation !== unassignedLabel;
  const metaLine = hasDesignation
    ? designation
    : unassignedLabel;

  return (
    <article className="group px-4 py-2 transition-colors hover:bg-slate-800/30 sm:py-2.5">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <Link
            to={profileTo}
            className="block truncate text-sm font-semibold text-white transition group-hover:text-cyan-400"
          >
            {name}
          </Link>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            <span className={hasDesignation ? "text-slate-400" : ""}>{metaLine}</span>
            <span className="mx-1.5 text-slate-700" aria-hidden="true">
              ·
            </span>
            <span className="tabular-nums">{phone || phoneFallback}</span>
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {statusBadge}
          <Link to={profileTo} className="inline-flex">
            <Button
              variant="ghost"
              className="!px-2 !py-1 !text-xs !font-medium"
              title="View profile"
            >
              Profile
            </Button>
          </Link>
        </div>
      </div>
    </article>
  );
}

export default StaffDirectoryRow;
