import { useEffect, useState } from "react";
import axios from "axios";
import {
  HiOutlineAcademicCap,
  HiOutlineCalendarDays,
  HiOutlineChartBar,
  HiOutlineUsers,
} from "react-icons/hi2";
import DashboardLayout from "../../layouts/DashboardLayout";
import StatsCard from "../../components/StatsCard";

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);

      try {
        const res = await axios.get("http://localhost:3000/api/dashboard");

        setStats(res.data || {});
      } catch (error) {
        console.error(error);
        setStats({});
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const safeStats = stats || {};

  const dashboardStats = [
    {
      title: "Total Students",
      value: isLoading ? 0 : safeStats.total_students ?? 0,
      icon: HiOutlineUsers,
      accent: "from-cyan-500 to-blue-500",
    },
    {
      title: "Active Teachers",
      value: isLoading ? 0 : safeStats.total_teachers ?? 0,
      icon: HiOutlineAcademicCap,
      accent: "from-fuchsia-500 to-violet-500",
    },
    {
      title: "Total Classes",
      value: isLoading ? 0 : safeStats.total_classes ?? 0,
      icon: HiOutlineCalendarDays,
      accent: "from-amber-400 to-orange-500",
    },
    {
      title: "Attendance Percentage",
      value: isLoading ? 0 : safeStats.attendance_percentage ?? 0,
      icon: HiOutlineChartBar,
      accent: "from-emerald-500 to-teal-500",
    },
  ];

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
          {dashboardStats.map((stat) => (
            <StatsCard key={stat.title} {...stat} />
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Dashboard;