import { Button } from "../../design-system";

/**
 * Base toolbar action button. Variants align with the ERP design system.
 */
function ToolbarButton({
  variant = "secondary",
  loading = false,
  loadingLabel = "Working…",
  children,
  className = "",
  ...props
}) {
  return (
    <Button
      variant={variant}
      className={className}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? loadingLabel : children}
    </Button>
  );
}

export default ToolbarButton;
