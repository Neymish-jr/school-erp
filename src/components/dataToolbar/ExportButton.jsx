import ToolbarButton from "./ToolbarButton";

function ExportButton({
  label = "Export",
  loading = false,
  loadingLabel = "Exporting…",
  disabled = false,
  onClick,
  className = "",
}) {
  return (
    <ToolbarButton
      type="button"
      variant="secondary"
      loading={loading}
      loadingLabel={loadingLabel}
      disabled={disabled}
      className={className}
      onClick={onClick}
    >
      {label}
    </ToolbarButton>
  );
}

export default ExportButton;
