import { useEffect, useMemo, useState } from "react";

import {
  Filter,
  Plus,
  Save,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";
import API from "../../api/axios";
import { usePermissions } from "../../hooks/usePermissions";
import TeacherScheduleView from "./TeacherScheduleView";
import { DAY_LABELS, DAY_ORDER } from "./timetableConstants";

import { sortClassesNaturally } from "../../utils/sortClasses";
import { isActiveStaffTeacher } from "../teachers/constants/teacherStatus";

const emptyForm = {
  class_section_id: "",
  subject_id: "",
  teacher_id: "",
  selected_days: [],
  period_number: "",
  start_time: "09:00",
  end_time: "10:00",
};

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");

  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
};

function TimetableAdminView({ readOnly = false }) {
  const { can } = usePermissions();
  const canCreateTimetable = !readOnly && can("timetable.create");
  const canDeleteTimetable = !readOnly && can("timetable.delete");

  const [timetables, setTimetables] =
    useState([]);

  const [classSections, setClassSections] =
    useState([]);

  const [subjects, setSubjects] =
    useState([]);

  const [teachers, setTeachers] =
    useState([]);

  const [
    selectedClassSectionId,
    setSelectedClassSectionId,
  ] = useState("all");

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const [isModalOpen, setIsModalOpen] =
    useState(false);

  const [isSaving, setIsSaving] =
    useState(false);

  const [formData, setFormData] =
    useState(emptyForm);

  const fetchTimetableData = async () => {
    setIsLoading(true);
    setError("");

    const [timetableResult, classSectionResult, subjectsResult, teachersResult] =
      await Promise.allSettled([
        API.get("/api/timetable", {
          headers: getAuthHeaders(),
        }),
        API.get("/api/class-sections", {
          headers: getAuthHeaders(),
        }),
        API.get("/api/subjects", {
          headers: getAuthHeaders(),
        }),
        API.get("/api/teachers", {
          headers: getAuthHeaders(),
        }),
      ]);

    if (timetableResult.status === "fulfilled") {
      setTimetables(timetableResult.value?.data?.data || []);
    } else {
      setTimetables([]);
      setError(
        timetableResult.reason?.response?.data?.message ||
          "Failed to fetch timetable entries"
      );
    }

    if (classSectionResult.status === "fulfilled") {
      const sortedClassSections = sortClassesNaturally(
        classSectionResult.value?.data?.data || []
      );
      setClassSections(sortedClassSections);
    } else {
      setClassSections([]);
    }

    if (subjectsResult.status === "fulfilled") {
      setSubjects(subjectsResult.value?.data?.data || []);
    } else {
      setSubjects([]);
    }

    if (teachersResult.status === "fulfilled") {
      const teacherData = teachersResult.value?.data?.data;
      setTeachers(
        Array.isArray(teacherData?.teachers)
          ? teacherData.teachers
          : Array.isArray(teacherData?.rows)
          ? teacherData.rows
          : Array.isArray(teacherData)
          ? teacherData
          : []
      );
    } else {
      setTeachers([]);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    fetchTimetableData();
  }, []);

  const groupedTimetables =
    useMemo(() => {
      const filtered =
        selectedClassSectionId === "all"
          ? timetables
          : timetables.filter(
              (item) =>
                Number(
                  item.class_section_id
                ) ===
                Number(
                  selectedClassSectionId
                )
            );

      return DAY_ORDER.reduce(
        (acc, day) => {
          acc[day] = filtered
            .filter(
              (item) => item.day === day
            )
            .sort(
              (a, b) =>
                Number(a.period_number) -
                Number(b.period_number)
            );

          return acc;
        },
        {}
      );
    }, [
      timetables,
      selectedClassSectionId,
    ]);

  const subjectMap = useMemo(() => {
    return subjects.reduce(
      (acc, item) => {
        acc[item.id] =
          item.subject_name;

        return acc;
      },
      {}
    );
  }, [subjects]);

  const teacherMap = useMemo(() => {
    return teachers.reduce(
      (acc, item) => {
        acc[item.id] =
          item.teacher_name;

        return acc;
      },
      {}
    );
  }, [teachers]);

  const filteredTeachers = useMemo(
    () => teachers.filter(isActiveStaffTeacher),
    [teachers]
  );

  const handleChange = (e) => {
    const { name, value } =
      e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDayChange = (day) => {
    setFormData((prev) => {
      const exists =
        prev.selected_days.includes(
          day
        );

      return {
        ...prev,

        selected_days: exists
          ? prev.selected_days.filter(
              (d) => d !== day
            )
          : [
              ...prev.selected_days,
              day,
            ],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccessMessage("");

    if (
      !formData.class_section_id ||
      !formData.subject_id ||
      !formData.teacher_id ||
      !formData.period_number ||
      formData.selected_days.length === 0
    ) {
      setError(
        "Please complete all required fields."
      );

      return;
    }

    if (
      formData.start_time >=
      formData.end_time
    ) {
      setError(
        "End time must be later than start time."
      );

      return;
    }

    setIsSaving(true);

    try {
      for (const day of formData.selected_days) {
        await API.post(
          "/api/timetable",
          {
            class_section_id: Number(
              formData.class_section_id
            ),

            subject_id: Number(
              formData.subject_id
            ),

            teacher_id: Number(
              formData.teacher_id
            ),

            day,

            period_number: Number(
              formData.period_number
            ),

            start_time:
              formData.start_time,

            end_time:
              formData.end_time,
          },
          {
            headers:
              getAuthHeaders(),
          }
        );
      }

      setSuccessMessage(
        "Timetable created successfully."
      );

      setFormData(emptyForm);

      setIsModalOpen(false);

      fetchTimetableData();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Failed to save timetable"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmDelete =
      window.confirm(
        "Delete this timetable entry?"
      );

    if (!confirmDelete) {
      return;
    }

    try {
      await API.delete(
        `/api/timetable/${id}`,
        {
          headers:
            getAuthHeaders(),
        }
      );

      fetchTimetableData();
    } catch (err) {
      setError(
        "Failed to delete timetable"
      );
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">

        <div className="rounded-[28px] border border-orange-400/20 bg-slate-950 p-6">

          <div className="flex items-center justify-between flex-wrap gap-4">

            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-orange-400/40 bg-orange-500/10 px-3 py-1 text-sm font-medium text-orange-200">
                <Sparkles size={16} />
                Timetable Management
              </p>

              <h1 className="mt-4 text-3xl font-bold text-white">
                Smart Timetable Dashboard
              </h1>

              <p className="mt-2 text-slate-300">
                Manage schedules with modern UI
              </p>
            </div>

            {canCreateTimetable ? (
              <button
                onClick={() =>
                  setIsModalOpen(true)
                }
                className="inline-flex items-center gap-2 rounded-xl bg-orange-400 px-5 py-3 font-semibold text-white"
              >
                <Plus size={16} />
                Add Timetable
              </button>
            ) : null}
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl">

          <div className="flex items-center justify-between flex-wrap gap-4">

            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-orange-200">
                Filter
              </p>

              <h2 className="mt-2 text-xl font-semibold text-white">
                View timetable
              </h2>
            </div>

            <div className="flex items-center gap-3">

              <div className="inline-flex items-center gap-2 rounded-xl border border-orange-400/30 bg-slate-950/60 px-3 py-2 text-sm text-slate-200">
                <Filter size={16} />
                Filter Class
              </div>

              <select
                value={
                  selectedClassSectionId
                }

                onChange={(e) =>
                  setSelectedClassSectionId(
                    e.target.value
                  )
                }

                className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white"
              >
                <option value="all">
                  All Classes
                </option>

                {classSections.map(
                  (item) => (
                    <option
                      key={item.id}
                      value={item.id}
                    >
                      {item.class_name}{" "}
                      {
                        item.section_name
                      }
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-2">

            {DAY_ORDER.map((day) => {
              const entries =
                groupedTimetables[
                  day
                ] || [];

              if (!entries.length) {
                return null;
              }

              return (
                <div
                  key={day}
                  className="rounded-3xl border border-white/10 bg-slate-950/60 p-5"
                >
                  <div className="flex items-center justify-between">

                    <h3 className="text-xl font-bold text-white">
                      {
                        DAY_LABELS[day]
                      }
                    </h3>

                    <span className="rounded-full bg-orange-500/10 px-3 py-1 text-sm text-orange-200">
                      {entries.length}{" "}
                      periods
                    </span>
                  </div>

                  <div className="mt-5 space-y-4">

                    {entries.map(
                      (entry) => (
                        <div
                          key={entry.id}
                          className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                        >
                          <div className="flex items-start justify-between">

                            <div>
                              <h4 className="text-white font-semibold">
                                {
                                  subjectMap[
                                    entry
                                      .subject_id
                                  ]
                                }
                              </h4>

                              <p className="mt-1 text-slate-300 text-sm">
                                {
                                  teacherMap[
                                    entry
                                      .teacher_id
                                  ]
                                }
                              </p>
                            </div>

                            {canDeleteTimetable ? (
                              <button
                                onClick={() =>
                                  handleDelete(
                                    entry.id
                                  )
                                }

                                className="rounded-lg bg-rose-500/10 p-2 text-rose-200"
                              >
                                <Trash2 size={15} />
                              </button>
                            ) : null}
                          </div>

                          <div className="mt-4 flex gap-2 flex-wrap">

                            <span className="rounded-full bg-slate-900 px-3 py-1 text-sm text-slate-200">
                              Period{" "}
                              {
                                entry.period_number
                              }
                            </span>

                            <span className="rounded-full bg-slate-900 px-3 py-1 text-sm text-slate-200">
                              {String(
                                entry.start_time
                              ).slice(
                                0,
                                5
                              )}{" "}
                              -{" "}
                              {String(
                                entry.end_time
                              ).slice(
                                0,
                                5
                              )}
                            </span>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {isModalOpen && canCreateTimetable ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
            <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-orange-300">
                    Timetable Entry
                  </p>

                  <h2 className="mt-2 text-2xl font-bold text-white">
                    Add Timetable
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-3 py-1 text-sm text-slate-200 transition hover:border-slate-500 hover:text-white"
                >
                  <X size={15} />
                  Close
                </button>
              </div>

              <form
                onSubmit={handleSubmit}
                className="mt-6 grid gap-4 md:grid-cols-2"
              >
                <label className="text-sm text-slate-200">
                  Class Section
                  <select
                    name="class_section_id"
                    value={formData.class_section_id}
                    onChange={handleChange}
                    className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
                  >
                    <option value="">
                      Select class section
                    </option>

                    {classSections.map((item) => (
                      <option
                        key={item.id}
                        value={item.id}
                      >
                        {item.class_name} {item.section_name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm text-slate-200">
                  Subject
                  <select
                    name="subject_id"
                    value={formData.subject_id}
                    onChange={handleChange}
                    className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
                  >
                    <option value="">
                      Select subject
                    </option>

                    {subjects.map((subject) => (
                      <option
                        key={subject.id}
                        value={subject.id}
                      >
                        {subject.subject_name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm text-slate-200 md:col-span-2">
                  Teacher
                  <select
                    name="teacher_id"
                    value={formData.teacher_id}
                    onChange={handleChange}
                    className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
                  >
                    <option value="">
                      Select teacher
                    </option>

                    {filteredTeachers.map((teacher) => (
                      <option
                        key={teacher.id}
                        value={teacher.id}
                      >
                        {teacher.teacher_name}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="md:col-span-2">
                  <p className="text-sm text-slate-200">
                    Days
                  </p>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {DAY_ORDER.map((day) => {
                      const isSelected =
                        formData.selected_days.includes(day);

                      return (
                        <label
                          key={day}
                          className={`rounded-2xl border px-4 py-3 text-sm transition ${
                            isSelected
                              ? "border-orange-400 bg-orange-500/10"
                              : "border-slate-700 bg-slate-950"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-100">
                              {DAY_LABELS[day]}
                            </span>

                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleDayChange(day)}
                              className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-orange-500"
                            />
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <label className="text-sm text-slate-200">
                  Period Number
                  <input
                    type="number"
                    min="1"
                    name="period_number"
                    value={formData.period_number}
                    onChange={handleChange}
                    className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
                    placeholder="e.g. 1"
                  />
                </label>

                <label className="text-sm text-slate-200">
                  Start Time
                  <input
                    type="time"
                    name="start_time"
                    value={formData.start_time}
                    onChange={handleChange}
                    className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
                  />
                </label>

                <label className="text-sm text-slate-200">
                  End Time
                  <input
                    type="time"
                    name="end_time"
                    value={formData.end_time}
                    onChange={handleChange}
                    className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
                  />
                </label>

                <div className="flex justify-end gap-3 pt-2 md:col-span-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-2xl border border-slate-700 px-4 py-3 text-sm font-semibold text-white transition hover:border-slate-500"
                  >
                    Close
                  </button>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Save size={16} />
                    {isSaving
                      ? "Saving..."
                      : "Save Timetable"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  );
}

function Timetable() {
  const { role, loading } = usePermissions();

  if (!loading && role === "teacher") {
    return <TeacherScheduleView />;
  }

  if (!loading && role === "office_staff") {
    return <TimetableAdminView readOnly />;
  }

  return <TimetableAdminView />;
}

export default Timetable;
