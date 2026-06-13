import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { erp } from "../tokens";
import Button from "./Button";

function ErpModal({ isOpen, onClose, eyebrow, title, children, size = "md" }) {
  if (!isOpen) return null;

  const sizeClass = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-3xl",
  }[size] || "max-w-lg";

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`w-full ${sizeClass} ${erp.card} ${erp.cardPaddingLg} shadow-2xl shadow-black/40`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="erp-modal-title"
      >
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            {eyebrow ? <p className={erp.eyebrow}>{eyebrow}</p> : null}
            <h2 id="erp-modal-title" className={`${erp.title} text-xl sm:text-2xl ${eyebrow ? "mt-1.5" : ""}`}>
              {title}
            </h2>
          </div>
          <Button variant="ghost" onClick={onClose} className="!p-2" aria-label="Close">
            <Icon icon="mdi:close" className="h-5 w-5" />
          </Button>
        </div>
        {children}
      </div>
    </div>,
    document.getElementById("modal-root") || document.body
  );
}

export default ErpModal;
