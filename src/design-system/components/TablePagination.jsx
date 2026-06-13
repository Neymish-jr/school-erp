import { Icon } from "@iconify/react";
import Button from "./Button";

function getPageNumbers(current, total) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const pages = new Set([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);

  const result = [];
  let previous = 0;

  sorted.forEach((page) => {
    if (page - previous > 1) {
      result.push("ellipsis");
    }
    result.push(page);
    previous = page;
  });

  return result;
}

function TablePagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  isLoading = false,
}) {
  const safeTotalPages = Math.max(1, totalPages);
  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);
  const pageNumbers = getPageNumbers(page, safeTotalPages);

  return (
    <>
      <p className="text-sm tabular-nums text-slate-500">
        {totalItems === 0 ? (
          "No results"
        ) : (
          <>
            Showing <span className="font-medium text-slate-300">{start}</span>
            {"–"}
            <span className="font-medium text-slate-300">{end}</span> of{" "}
            <span className="font-medium text-slate-300">{totalItems}</span>
          </>
        )}
      </p>

      <div className="flex items-center gap-1">
        <Button
          variant="secondary"
          onClick={() => onPageChange(1)}
          disabled={page === 1 || isLoading}
          className="!px-2.5 !py-2"
          aria-label="First page"
        >
          <Icon icon="mdi:chevron-double-left" className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1 || isLoading}
          className="!px-2.5 !py-2"
          aria-label="Previous page"
        >
          <Icon icon="mdi:chevron-left" className="h-4 w-4" />
        </Button>

        <div className="hidden items-center gap-1 sm:flex">
          {pageNumbers.map((item, index) =>
            item === "ellipsis" ? (
              <span key={`ellipsis-${index}`} className="px-2 text-slate-600">
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item)}
                disabled={isLoading}
                className={`min-w-[2.25rem] rounded-lg px-2.5 py-2 text-sm font-medium tabular-nums transition ${
                  item === page
                    ? "bg-cyan-500 text-slate-950"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-50"
                }`}
              >
                {item}
              </button>
            )
          )}
        </div>

        <span className="px-2 text-sm tabular-nums text-slate-500 sm:hidden">
          {page} / {safeTotalPages}
        </span>

        <Button
          variant="secondary"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= safeTotalPages || isLoading}
          className="!px-2.5 !py-2"
          aria-label="Next page"
        >
          <Icon icon="mdi:chevron-right" className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          onClick={() => onPageChange(safeTotalPages)}
          disabled={page >= safeTotalPages || isLoading}
          className="!px-2.5 !py-2"
          aria-label="Last page"
        >
          <Icon icon="mdi:chevron-double-right" className="h-4 w-4" />
        </Button>
      </div>
    </>
  );
}

export default TablePagination;
