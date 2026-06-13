/**
 * ERP Design System — shared Tailwind class tokens.
 * Government dark-theme palette: slate base + cyan accent.
 */

export const erp = {
  page: "space-y-6",
  card: "rounded-2xl border border-slate-800/80 bg-slate-900/70 backdrop-blur-sm",
  cardPadding: "p-5",
  cardPaddingLg: "p-6",

  eyebrow: "text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400/90",
  title: "text-2xl font-bold tracking-tight text-white sm:text-3xl",
  subtitle: "mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-400",

  input:
    "w-full rounded-xl border border-slate-700/80 bg-slate-950/80 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50",
  select:
    "w-full rounded-xl border border-slate-700/80 bg-slate-950/80 px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50",

  tableWrap: "overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/70",
  tableScroll: "overflow-x-auto",
  table: "min-w-full text-left text-sm",
  tableFixed: "w-full table-fixed",
  thead: "border-b border-slate-800 bg-slate-950/90",
  th: "whitespace-nowrap px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wider text-slate-400",
  thDirectory:
    "whitespace-nowrap px-4 py-3.5 align-middle text-sm font-medium normal-case tracking-normal text-slate-400",
  tbody: "divide-y divide-slate-800/80",
  tr: "transition-colors hover:bg-slate-800/40",
  td: "whitespace-nowrap px-4 py-3.5 align-middle text-slate-200",
  tdMuted: "text-slate-500",

  btnPrimary:
    "inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 disabled:cursor-not-allowed disabled:opacity-50",
  btnSecondary:
    "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-600/40 disabled:cursor-not-allowed disabled:opacity-50",
  btnGhost:
    "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50",
  btnDanger:
    "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-rose-400 transition hover:bg-rose-500/10 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-50",
};

export const alertVariants = {
  error: "border-rose-500/30 bg-rose-500/10 text-rose-100",
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-100",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-100",
  info: "border-cyan-500/30 bg-cyan-500/10 text-cyan-100",
};
