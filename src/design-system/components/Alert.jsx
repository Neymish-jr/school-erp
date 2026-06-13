import { Icon } from "@iconify/react";
import { alertVariants } from "../tokens";

const icons = {
  error: "mdi:alert-circle-outline",
  success: "mdi:check-circle-outline",
  warning: "mdi:alert-outline",
  info: "mdi:information-outline",
};

function Alert({ variant = "info", children }) {
  return (
    <div
      role="alert"
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${alertVariants[variant]}`}
    >
      <Icon icon={icons[variant]} className="mt-0.5 h-5 w-5 shrink-0 opacity-80" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export default Alert;
