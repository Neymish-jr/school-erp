import { useEffect, useState } from "react";

import {

  HiOutlineCalendarDays,

  HiOutlineChartBar,

  HiOutlineAcademicCap,

  HiOutlineUsers,

} from "react-icons/hi2";

import API from "../../api/axios";

import DashboardLayout from "../../layouts/DashboardLayout";

import StatsCard from "../../components/StatsCard";

import { usePermissions } from "../../hooks/usePermissions";

import TeacherDashboard from "./TeacherDashboard";

import PrincipalDashboard from "./PrincipalDashboard";

import OfficeStaffDashboard from "./OfficeStaffDashboard";

import DPODashboard from "./DPODashboard";

import BEODashboard from "./BEODashboard";

import SuperAdminDashboard from "./SuperAdminDashboard";



function Dashboard() {

  const { role, loading: permissionsLoading } = usePermissions();

  const isTeacherView = role === "teacher";

  const isPrincipalView = role === "principal";

  const isOfficeStaffView = role === "office_staff";

  const isDpoView = role === "dpo";

  const isBeoView = role === "beo";

  const isSuperAdminView = role === "super_admin";

  const isRoleDashboardView =

    isTeacherView ||

    isPrincipalView ||

    isOfficeStaffView ||

    isDpoView ||

    isBeoView ||

    isSuperAdminView;



  const [stats, setStats] = useState(null);

  const [isLoading, setIsLoading] = useState(true);



  useEffect(() => {

    if (isRoleDashboardView) {

      setIsLoading(false);

      return;

    }



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

  }, [isRoleDashboardView]);



  const safeStats = stats || {};



  const dashboardStats = [

    {

      title: "Total Students",

      value: isLoading ? 0 : safeStats.total_students ?? 0,

      icon: HiOutlineUsers,

      accent: "from-orange-500 to-orange-600",

    },

    {

      title: "Active Teachers",

      value: isLoading ? 0 : safeStats.total_teachers ?? 0,

      icon: HiOutlineAcademicCap,

      accent: "from-orange-400 to-amber-600",

    },

    {

      title: "Total Classes",

      value: isLoading ? 0 : safeStats.total_classes ?? 0,

      icon: HiOutlineCalendarDays,

      accent: "from-amber-500 to-orange-600",

    },

    {

      title: "Attendance Percentage",

      value: isLoading ? 0 : safeStats.attendance_percentage ?? 0,

      icon: HiOutlineChartBar,

      accent: "from-emerald-600 to-emerald-500",

    },

  ];



  return (

    <DashboardLayout>

      {permissionsLoading ? (

        <div className="space-y-4">

          <div className="h-10 w-64 animate-pulse rounded-xl bg-slate-800" />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

            {Array.from({ length: 4 }).map((_, index) => (

              <div key={index} className="h-32 animate-pulse rounded-3xl bg-slate-800/80" />

            ))}

          </div>

        </div>

      ) : isTeacherView ? (

        <TeacherDashboard />

      ) : isPrincipalView ? (

        <PrincipalDashboard />

      ) : isOfficeStaffView ? (

        <OfficeStaffDashboard />

      ) : isDpoView ? (

        <DPODashboard />

      ) : isBeoView ? (

        <BEODashboard />

      ) : isSuperAdminView ? (

        <SuperAdminDashboard />

      ) : (

        <div className="space-y-8">

          <div>

            <p className="text-sm uppercase tracking-[0.3em] text-orange-300">Overview</p>

            <h1 className="mt-3 text-4xl font-bold text-white">School ERP Dashboard</h1>

            <p className="mt-2 max-w-2xl text-slate-300">

              Monitor student activity, staff performance, and key metrics from one modern

              dashboard.

            </p>

          </div>



          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

            {dashboardStats.map((stat) => (

              <StatsCard key={stat.title} {...stat} />

            ))}

          </div>

        </div>

      )}

    </DashboardLayout>

  );

}



export default Dashboard;

