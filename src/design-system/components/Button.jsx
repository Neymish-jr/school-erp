import { erp } from "../tokens";

const variants = {
  primary: erp.btnPrimary,
  secondary: erp.btnSecondary,
  ghost: erp.btnGhost,
  danger: erp.btnDanger,
};

function Button({
  variant = "primary",
  type = "button",
  className = "",
  children,
  ...props
}) {
  return (
    <button
      type={type}
      className={`${variants[variant] || variants.primary} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
