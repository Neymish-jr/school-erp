/**
 * Horizontal group for related toolbar actions (Import / Export / Template).
 */
function ButtonGroup({ children, className = "" }) {
  return <div className={`flex flex-wrap items-center gap-3 ${className}`.trim()}>{children}</div>;
}

export default ButtonGroup;
