import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock } from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import API from "../../api/axios";
import { usePermissions } from "../../hooks/usePermissions";
import {
  DAY_LABELS,
  DAY_ORDER,
  formatTimetableTime,
  getTodayDayKey,
  sortByPeriod,
} from "./timetableConstants";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

function PeriodCard({ entry, highlight = false }) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        highlight
          ? "border-orange-400/30 bg-orange-500/10"
          : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-semibold text-white">{entry.subject_name || "Subject"}</h4>
          <p className="mt-1 text-sm text-slate-300">
            Class {entry.class_name || "—"}
          </p>
        </div>
        <span className="rounded-full bg-slate-900 px-3 py-1 text-sm text-slate-200">
          Period {entry.period_number}
        </span>
      </div>
      <div className="mt-4 inline-flex items-center gap-2 text-sm text-slate-300">
        <Clock size={14} className="text-orange-300" />
        {formatTimetableTime(entry.start_time)} – {formatTimetableTime(entry.end_time)}
      </div>
    </div>
  );
}

function TeacherScheduleView() {
  const { user, loading: permissionsLoading } = usePermissions();
  const teacherId = user?.teacher_id;

  const [timetables, setTimetables] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const todayKey = useMemo(() => getTodayDayKey(), []);

  useEffect(() => {
    const fetchSchedule = async () => {
      setIsLoading(true);
      setError("");

      try {
        const response = await API.get("/api/timetable", {
          headers: getAuthHeaders(),
        });

        setTimetables(response?.data?.data || []);
      } catch (err) {
        setTimetables([]);
        setError(err?.response?.data?.message || "Unable to load your schedule right now.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSchedule();
  }, []);

  const mySchedule = useMemo(() => {
    if (teacherId == null) {
      return [];
    }

    return timetables
      .filter((entry) => Number(entry.teacher_id) === Number(teacherId))
      .sort((left, right) => {
        const dayDiff =
          DAY_ORDER.indexOf(left.day) - DAY_ORDER.indexOf(right.day);

        if (dayDiff !== 0) {
          return dayDiff;
        }

        return sortByPeriod(left, right);
      });
  }, [timetables, teacherId]);

  const todayPeriods = useMemo(
    () => mySchedule.filter((entry) => entry.day === todayKey).sort(sortByPeriod),
    [mySchedule, todayKey]
  );

  const weeklyByDay = useMemo(
    () =>
      DAY_ORDER.reduce((accumulator, day) => {
        if (day === todayKey) {
          return accumulator;
        }

        const entries = mySchedule.filter((entry) => entry.day === day).sort(sortByPeriod);

        if (entries.length > 0) {
          accumulator[day] = entries;
        }

        return accumulator;
      }, {}),
    [mySchedule, todayKey]
  );

  const weeklyDayKeys = DAY_ORDER.filter((day) => weeklyByDay[day]?.length);

  if (permissionsLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <div className="h-32 animate-pulse rounded-3xl bg-slate-800/80" />
          <div className="h-48 animate-pulse rounded-3xl bg-slate-800/80" />
        </div>
      </DashboardLayout>
    );
  }

  if (teacherId == null) {
    return (
      <DashboardLayout>
        <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/50 px-6 py-16 text-center">
          <h1 className="text-2xl font-bold text-white">My Schedule</h1>
          <p className="mx-auto mt-4 max-w-lg text-slate-300">
            Your login is not linked to a teacher profile. Ask your school administrator to connect
            your account before your schedule can be shown here.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="rounded-[28px] border border-orange-400/20 bg-slate-950 p-6">
          <p className="inline-flex items-center gap-2 rounded-full border border-orange-400/40 bg-orange-500/10 px-3 py-1 text-sm font-medium text-orange-200">
            <CalendarDays size={16} />
            Teacher Workspace
          </p>
          <h1 className="mt-4 text-3xl font-bold text-white">My Schedule</h1>
          <p className="mt-2 max-w-2xl text-slate-300">
            Your assigned teaching periods for today and the rest of the week.
          </p>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        <section className="rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-orange-200">Today</p>
              <h2 className="mt-2 text-xl font-semibold text-white">
                {DAY_LABELS[todayKey]}
              </h2>
            </div>
            <span className="rounded-full bg-orange-500/10 px-3 py-1 text-sm text-orange-200">
              {isLoading ? "…" : `${todayPeriods.length} period${todayPeriods.length === 1 ? "" : "s"}`}
            </span>
          </div>

          <div className="mt-6 space-y-4">
            {isLoading ? (
              Array.from({ length: 2 }).map((_, index) => (
                <div
                  key={index}
                  className="h-24 animate-pulse rounded-2xl border border-slate-800 bg-slate-900/80"
                />
              ))
            ) : todayPeriods.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 px-6 py-10 text-center">
                <p className="text-lg font-medium text-white">You have no scheduled periods today.</p>
                <p className="mt-2 text-sm text-slate-400">
                  Enjoy a lighter day, or check the weekly view below for upcoming classes.
                </p>
              </div>
            ) : (
              todayPeriods.map((entry) => (
                <PeriodCard key={entry.id} entry={entry} highlight />
              ))
            )}
          </div>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-orange-200">This Week</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Weekly timetable</h2>
            <p className="mt-2 text-sm text-slate-400">
              Other teaching days besides today.
            </p>
          </div>

          {isLoading ? (
            <div className="mt-6 grid gap-4 xl:grid-cols-2">
              {Array.from({ length: 2 }).map((_, index) => (
                <div
                  key={index}
                  className="h-40 animate-pulse rounded-3xl border border-slate-800 bg-slate-900/80"
                />
              ))}
            </div>
          ) : mySchedule.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 px-6 py-10 text-center">
              <p className="text-lg font-medium text-white">
                You have no scheduled periods this week.
              </p>
              <p className="mt-2 text-sm text-slate-400">
                When your school publishes your timetable, your classes will appear here automatically.
              </p>
            </div>
          ) : weeklyDayKeys.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 px-6 py-10 text-center">
              <p className="text-lg font-medium text-white">
                You have no other scheduled periods this week.
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Today&apos;s classes are listed above.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 xl:grid-cols-2">
              {weeklyDayKeys.map((day) => {
                const entries = weeklyByDay[day] || [];

                return (
                  <div
                    key={day}
                    className="rounded-3xl border border-white/10 bg-slate-950/60 p-5"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-white">{DAY_LABELS[day]}</h3>
                      <span className="rounded-full bg-orange-500/10 px-3 py-1 text-sm text-orange-200">
                        {entries.length} period{entries.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="mt-5 space-y-4">
                      {entries.map((entry) => (
                        <PeriodCard key={entry.id} entry={entry} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}

export default TeacherScheduleView;
