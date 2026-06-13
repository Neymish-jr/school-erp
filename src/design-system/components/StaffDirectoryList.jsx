import { erp } from "../tokens";

function StaffDirectoryList({ children, className = "" }) {
  return (
    <div className={`${erp.card} divide-y divide-slate-800/80 overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

function StaffDirectoryEmpty({ message = "No staff found." }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-800/80 text-slate-500">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="h-6 w-6"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
          />
        </svg>
      </div>
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}

function StaffDirectorySkeleton({ rows = 5 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="flex animate-pulse items-center justify-between gap-3 px-4 py-2.5"
        >
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="h-3.5 w-36 rounded bg-slate-800" />
            <div className="h-3 w-48 rounded bg-slate-800/70" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-14 rounded bg-slate-800" />
            <div className="h-6 w-14 rounded-lg bg-slate-800" />
          </div>
        </div>
      ))}
    </>
  );
}

function StaffDirectoryFooter({ children }) {
  return (
    <div className="border-t border-slate-800/80 px-4 py-2.5">{children}</div>
  );
}

export {
  StaffDirectoryList,
  StaffDirectoryEmpty,
  StaffDirectorySkeleton,
  StaffDirectoryFooter,
};
