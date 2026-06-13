import { useEffect, useState } from "react";
import {
  HiOutlineAcademicCap,
  HiOutlineCalendarDays,
  HiOutlineChartBar,
  HiOutlineChartPie,
  HiOutlineUserGroup,
  HiOutlineUserMinus,
  HiOutlineUsers,
} from "react-icons/hi2";
import API from "../../api/axios";
import DashboardLayout from "../../layouts/DashboardLayout";
import StatsCard from "../../components/StatsCard";

const parseWidgetValue = (response) => {
  const value = response?.data?.data;

  if (typeof value === "number" && !Number.isNaN(value)) {
    return value;
  }

  return 0;
};

const computeVacancyPercentage = (vacant, sanctionedStrength) => {
  if (sanctionedStrength <= 0) {
    return "0";
  }

  return ((vacant / sanctionedStrength) * 100).toFixed(1);
};

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [vacancyStats, setVacancyStats] = useState(null);
  const [isVacancyLoading, setIsVacancyLoading] = useState(true);
  const [showVacancySection, setShowVacancySection] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);

      try {
        const res = await API.get("/api/dashboard");

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

  useEffect(() => {
    const fetchVacancyStats = async () => {
      setIsVacancyLoading(true);

      try {
        const [sanctionedRes, filledRes, vacantRes] = await Promise.all([
          API.get("/api/dashboard/staff-posts/sanctioned-strength"),
          API.get("/api/dashboard/staff-posts/filled-positions"),
          API.get("/api/dashboard/staff-posts/vacant-positions"),
        ]);

        const sanctionedStrength = parseWidgetValue(sanctionedRes);
        const filled = parseWidgetValue(filledRes);
        const vacant = parseWidgetValue(vacantRes);

        setVacancyStats({
          sanctionedStrength,
          filled,
          vacant,
          vacancyPercentage: computeVacancyPercentage(vacant, sanctionedStrength),
        });
        setShowVacancySection(true);
      } catch (error) {
        console.error(error);
        setVacancyStats(null);
        setShowVacancySection(false);
      } finally {
        setIsVacancyLoading(false);
      }
    };

    fetchVacancyStats();
  }, []);

  const safeStats = stats || {};
  const safeVacancyStats = vacancyStats || {
    sanctionedStrength: 0,
    filled: 0,
    vacant: 0,
    vacancyPercentage: "0",
  };

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

  const vacancyDashboardStats = [
    {
      title: "Sanctioned Positions",
      value: isVacancyLoading ? 0 : safeVacancyStats.sanctionedStrength,
      icon: HiOutlineUsers,
      accent: "from-sky-500 to-indigo-500",
    },
    {
      title: "Filled Positions",
      value: isVacancyLoading ? 0 : safeVacancyStats.filled,
      icon: HiOutlineUserGroup,
      accent: "from-emerald-500 to-teal-500",
    },
    {
      title: "Vacant Positions",
      value: isVacancyLoading ? 0 : safeVacancyStats.vacant,
      icon: HiOutlineUserMinus,
      accent: "from-rose-500 to-red-500",
    },
    {
      title: "Vacancy Percentage",
      value: isVacancyLoading ? "0%" : `${safeVacancyStats.vacancyPercentage}%`,
      icon: HiOutlineChartPie,
      accent: "from-violet-500 to-purple-500",
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

        {showVacancySection && (
          <div className="space-y-4">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">
                Staff Vacancy
              </p>
              <h2 className="mt-3 text-2xl font-bold text-white">
                Vacancy Summary
              </h2>
              <p className="mt-2 max-w-2xl text-slate-300">
                Sanctioned staff strength, filled positions, and current vacancy rate for your school.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {vacancyDashboardStats.map((stat) => (
                <StatsCard key={stat.title} {...stat} />
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default Dashboard;