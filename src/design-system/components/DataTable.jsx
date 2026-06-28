import { erp } from "../tokens";
import CellCenter from "./CellCenter";

function DataTable({ children, footer, fixedLayout = false }) {
  return (
    <div className={erp.tableWrap}>
      <div className={`${erp.tableScroll} erp-scrollbar`}>
        <table className={`${erp.table} ${fixedLayout ? erp.tableFixed : ""}`}>
          {children}
        </table>
      </div>
      {footer}
    </div>
  );
}

function DataTableColGroup({ widths = [] }) {
  return (
    <colgroup>
      {widths.map((width, index) => (
        <col key={index} style={{ width }} />
      ))}
    </colgroup>
  );
}

function DataTableHead({ children }) {
  return <thead className={erp.thead}>{children}</thead>;
}

function DataTableBody({ children }) {
  return <tbody className={erp.tbody}>{children}</tbody>;
}

function DataTableRow({ children, className = "" }) {
  return <tr className={`${erp.tr} ${className}`}>{children}</tr>;
}

function DataTableHeaderCell({
  children,
  className = "",
  align = "left",
  width,
  tone = "default",
}) {
  const alignClass = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  const toneClass = tone === "directory" ? erp.thDirectory : erp.th;

  return (
    <th
      className={`${toneClass} ${alignClass} ${className}`}
      style={width ? { width } : undefined}
    >
      {children}
    </th>
  );
}

function DataTableCell({
  children,
  className = "",
  align = "left",
  muted = false,
  width,
  centerContent = false,
}) {
  const alignClass = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  const content = centerContent ? <CellCenter>{children}</CellCenter> : children;

  return (
    <td
      className={`${erp.td} ${alignClass} ${muted ? erp.tdMuted : ""} ${className}`}
      style={width ? { width } : undefined}
    >
      {content}
    </td>
  );
}

function DataTableEmpty({ colSpan, message = "No records found." }) {
  return (
    <DataTableRow>
      <td colSpan={colSpan} className="px-4 py-16 text-center">
        <p className="text-sm text-slate-500">{message}</p>
      </td>
    </DataTableRow>
  );
}

function DataTableSkeleton({ rows = 5, cols, columns }) {
  const columnCount = cols || columns || 6;

  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <DataTableRow key={rowIndex}>
          {Array.from({ length: columnCount }).map((__, colIndex) => (
            <DataTableCell key={colIndex}>
              <div
                className="h-4 animate-pulse rounded-md bg-slate-800"
                style={{ width: `${60 + ((colIndex * 17) % 40)}%` }}
              />
            </DataTableCell>
          ))}
        </DataTableRow>
      ))}
    </>
  );
}

function DataTableFooter({ children }) {
  return (
    <div className="flex flex-col gap-3 border-t border-slate-800/80 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
      {children}
    </div>
  );
}

export {
  DataTable,
  DataTableColGroup,
  DataTableHead,
  DataTableBody,
  DataTableRow,
  DataTableHeaderCell,
  DataTableCell,
  DataTableEmpty,
  DataTableSkeleton,
  DataTableFooter,
};
