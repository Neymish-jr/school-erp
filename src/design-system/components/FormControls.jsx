import { erp } from "../tokens";

function FormField({ label, htmlFor, children, className = "" }) {
  return (
    <label htmlFor={htmlFor} className={`block text-sm ${className}`}>
      <span className="font-medium text-slate-300">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function Input({ className = "", ...props }) {
  return <input className={`${erp.input} ${className}`} {...props} />;
}

function Select({ className = "", children, ...props }) {
  return (
    <select className={`${erp.select} ${className}`} {...props}>
      {children}
    </select>
  );
}

function FormGrid({ children, columns = 2 }) {
  return (
    <div className={`grid gap-4 ${columns === 2 ? "md:grid-cols-2" : ""}`}>{children}</div>
  );
}

function FormActions({ children }) {
  return <div className="flex justify-end gap-3 pt-2">{children}</div>;
}

export { FormField, Input, Select, FormGrid, FormActions };
