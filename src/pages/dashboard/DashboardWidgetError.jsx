import { Alert } from "../../design-system";

function DashboardWidgetError({ message, onRetry }) {
  return (
    <Alert variant="error">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p>{message}</p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="shrink-0 rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-1.5 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/20"
          >
            Retry
          </button>
        ) : null}
      </div>
    </Alert>
  );
}

export default DashboardWidgetError;
