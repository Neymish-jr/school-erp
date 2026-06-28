import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { erp } from "../tokens";
import Button from "./Button";

function ErpDrawer({ isOpen, onClose, eyebrow, title, children, footer, size = "lg" }) {
  if (!isOpen) {
    return null;
  }

  const sizeClass = {
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
  }[size] || "max-w-lg";

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close panel"
      />

      <aside
        className={`relative flex h-full w-full ${sizeClass} flex-col border-l border-slate-800 bg-slate-900 shadow-2xl shadow-black/40`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="erp-drawer-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-800 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            {eyebrow ? <p className={erp.eyebrow}>{eyebrow}</p> : null}
            <h2
              id="erp-drawer-title"
              className={`${erp.title} truncate text-xl sm:text-2xl ${eyebrow ? "mt-1.5" : ""}`}
            >
              {title}
            </h2>
          </div>
          <Button variant="ghost" onClick={onClose} className="!p-2" aria-label="Close">
            <Icon icon="mdi:close" className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
          {footer ? (
            <div className="shrink-0 border-t border-slate-800 bg-slate-900/95 px-5 py-4 sm:px-6">
              {footer}
            </div>
          ) : null}
        </div>
      </aside>
    </div>,
    document.getElementById("modal-root") || document.body
  );
}

export default ErpDrawer;
