import { Icon } from "@iconify/react";
import { erp } from "../tokens";
import Button from "./Button";

function FilterToolbar({ title, meta, children, onReset, showReset = true }) {
  return (
    <div className={`${erp.card} ${erp.cardPadding}`}>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {title ? (
          <p className="text-sm font-medium text-slate-300">{title}</p>
        ) : (
          <span />
        )}
        {meta ? <div className="text-sm text-slate-500">{meta}</div> : null}
      </div>
      <div className="flex flex-col gap-3 xl:flex-row xl:flex-wrap xl:items-center">
        {children}
        {showReset && onReset ? (
          <Button variant="secondary" onClick={onReset} className="xl:w-auto">
            <Icon icon="mdi:filter-off-outline" className="h-4 w-4" />
            Reset
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function FilterSearch({ value, onChange, placeholder = "Search...", className = "" }) {
  return (
    <div className={`relative min-w-[200px] flex-1 ${className}`}>
      <Icon
        icon="mdi:magnify"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
      />
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`${erp.input} pl-10`}
      />
    </div>
  );
}

function FilterSelect({ value, onChange, options, disabled = false, className = "", "aria-label": ariaLabel }) {
  return (
    <select
      value={value}
      onChange={onChange}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`${erp.select} xl:w-52 ${className}`}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value} className="bg-slate-950">
          {option.label}
        </option>
      ))}
    </select>
  );
}

function FilterCheckbox({ checked, onChange, label }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-700/80 bg-slate-950/60 px-3.5 py-2.5 text-sm font-medium text-slate-300 transition hover:border-slate-600 xl:w-auto">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-cyan-500 focus:ring-cyan-500/30"
      />
      {label}
    </label>
  );
}

export { FilterToolbar, FilterSearch, FilterSelect, FilterCheckbox };
