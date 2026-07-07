import ToolbarButton from "./ToolbarButton";

function TemplateButton({
  label = "Download Template",
  loading = false,
  loadingLabel = "Downloading…",
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

export default TemplateButton;
