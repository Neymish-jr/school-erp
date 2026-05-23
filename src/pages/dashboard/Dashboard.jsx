import {
  HiOutlineAcademicCap,
  HiOutlineCalendarDays,
  HiOutlineCurrencyDollar,
  HiOutlineUsers,
} from "react-icons/hi2";
import DashboardLayout from "../../layouts/DashboardLayout";
import StatsCard from "../../components/StatsCard";

const stats = [
  {
    title: "Total Students",
    value: "1,248",
    change: "12%",
    changeType: "positive",
    description: "Compared to last month",
    icon: HiOutlineUsers,
    accent: "from-cyan-500 to-blue-500",
  },
  {
    title: "Active Teachers",
    value: "84",
    change: "4%",
    changeType: "positive",
    description: "New assignments this week",
    icon: HiOutlineAcademicCap,
    accent: "from-fuchsia-500 to-violet-500",
  },
  {
    title: "Upcoming Events",
    value: "18",
    change: "2%",
    changeType: "negative",
    description: "Pending activities this week",
    icon: HiOutlineCalendarDays,
    accent: "from-amber-400 to-orange-500",
  },
  {
    title: "Monthly Revenue",
    value: "$48.2K",
    change: "8%",
    changeType: "positive",
    description: "Growth over previous month",
    icon: HiOutlineCurrencyDollar,
    accent: "from-emerald-500 to-teal-500",
  },
];

function Dashboard() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">
            Overview
          </p>
          <h1 className="mt-3 text-4xl font-bold text-white">
            School ERP Dashboard
          </h1>
          <p className="mt-2 max-w-2xl text-slate-300">
            Monitor student activity, staff performance, and key financial metrics from one modern dashboard.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <StatsCard key={stat.title} {...stat} />
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Dashboard;