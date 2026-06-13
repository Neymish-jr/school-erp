function CellCenter({ children, className = "" }) {
  return (
    <div className={`flex w-full items-center justify-center gap-1 ${className}`}>
      {children}
    </div>
  );
}

export default CellCenter;
