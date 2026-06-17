import { motion } from "framer-motion";

function StatsCard({
  title,
  value,
  change,
  changeType = "positive",
  icon: Icon,
  description,
  accent = "from-orange-500 to-orange-600",
}) {
  const isPositive = changeType === "positive";

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-5 shadow-[0_25px_80px_-32px_rgba(249,115,22,0.25)]"
    >
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent}`} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-300">{title}</p>
          <h2 className="mt-3 text-3xl font-bold text-white">{value}</h2>
        </div>

        <div className={`rounded-2xl bg-gradient-to-br ${accent} p-3 text-white shadow-lg`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="text-sm text-slate-300">{description}</p>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
            isPositive
              ? "bg-emerald-500/15 text-emerald-300"
              : "bg-rose-500/15 text-rose-300"
          }`}
        >
          {isPositive ? "+" : "-"}
          {change}
        </span>
      </div>
    </motion.article>
  );
}

export default StatsCard;
