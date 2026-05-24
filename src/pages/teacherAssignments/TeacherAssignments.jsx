import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import API from "../../api/axios";

const EMPTY_FORM = {
  teacher_id: "",
  class_section_id: "",
  subject_id: "",
};

const decodeToken = () => {
  try {
    const token = localStorage.getItem("token");

    if (!token) {
      return {};
    }

    const [, payload] = token.split(".");
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(atob(normalized));

    return decoded || {};
  } catch (error) {
    return {};
  }
};

function TeacherAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classSections, setClassSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [isTeacher, setIsTeacher] = useState(false);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");

    return token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {};
  };

  const fetchDropdownData = async () => {
    try {
      const [teachersResponse, classSectionsResponse, subjectsResponse] = await Promise.all([
        API.get("/api/teachers", {
          headers: getAuthHeaders(),
          params: { page: 1, limit: 1000, search: "" },
        }),
        API.get("/api/class-sections", {
          headers: getAuthHeaders(),
        }),
        API.get("/api/subjects", {
          headers: getAuthHeaders(),
        }),
      ]);

      setTeachers(teachersResponse?.data?.data?.teachers || []);
      setClassSections(classSectionsResponse?.data?.data || []);
      setSubjects(subjectsResponse?.data?.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to load assignment options.");
    }
  };

  const fetchAssignments = async () => {
    setIsLoading(true);
    setError("");

    try {
      const endpoint = isTeacher ? "/api/teacher-subject-assignments/me" : "/api/teacher-subject-assignments";
      const response = await API.get(endpoint, {
        headers: getAuthHeaders(),
      });

      setAssignments(response?.data?.data || []);
    } catch (err) {
      setAssignments([]);
      setError(err?.response?.data?.message || "Unable to load teacher subject assignments.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const payload = decodeToken();
    setIsTeacher(payload.role === "teacher");
  }, []);

  useEffect(() => {
    void fetchDropdownData();
  }, []);

  useEffect(() => {
    if (isTeacher) {
      void fetchAssignments();
    }
  }, [isTeacher]);

  useEffect(() => {
    if (!isTeacher) {
      void fetchAssignments();
    }
  }, [isTeacher]);

  const filteredAssignments = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return assignments;
    }

    return assignments.filter((assignment) => {
      const teacherName = (assignment.teacher_name || "").toLowerCase();
      const className = (assignment.class_name || "").toLowerCase();
      const sectionName = (assignment.section_name || "").toLowerCase();
      const subjectName = (assignment.subject_name || "").toLowerCase();
      const subjectCode = (assignment.subject_code || "").toLowerCase();

      return (
        teacherName.includes(query) ||
        className.includes(query) ||
        sectionName.includes(query) ||
        subjectName.includes(query) ||
        subjectCode.includes(query)
      );
    });
  }, [assignments, search]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.teacher_id || !formData.class_section_id || !formData.subject_id) {
      setError("Please select a teacher, class section, and subject.");
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      await API.post(
        "/api/teacher-subject-assignments",
        {
          teacher_id: Number(formData.teacher_id),
          class_section_id: Number(formData.class_section_id),
          subject_id: Number(formData.subject_id),
        },
        { headers: getAuthHeaders() }
      );

      setSuccessMessage("Assignment created successfully.");
      setFormData(EMPTY_FORM);
      await fetchAssignments();
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to create assignment.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    setIsDeleting(true);
    setError("");
    setSuccessMessage("");

    try {
      await API.delete(`/api/teacher-subject-assignments/${deleteTarget}`, {
        headers: getAuthHeaders(),
      });

      setDeleteTarget(null);
      setSuccessMessage("Assignment deleted successfully.");
      await fetchAssignments();
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to delete assignment.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Teacher Subject Assignments</p>
            <h1 className="mt-3 text-4xl font-bold text-white">Assignments</h1>
            <p className="mt-2 max-w-2xl text-slate-300">
              Assign subjects to teachers by class section, keep the data ready for attendance and future timetable planning, and search the table quickly.
            </p>
          </div>

          {!isTeacher ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-sm text-slate-200">
              Admin view: create and remove assignments.
            </div>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
            <p className="text-sm text-slate-300">Total Assignments</p>
            <p className="mt-2 text-2xl font-bold text-white">{isLoading ? "..." : assignments.length}</p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
            <p className="text-sm text-slate-300">Visible Results</p>
            <p className="mt-2 text-2xl font-bold text-white">{isLoading ? "..." : filteredAssignments.length}</p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
            <p className="text-sm text-slate-300">Attendance Ready</p>
            <p className="mt-2 text-2xl font-bold text-white">{isLoading ? "..." : "Yes"}</p>
          </div>
        </div>

        {!isTeacher ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
            <h2 className="text-lg font-semibold text-white">Assign Subject</h2>
            <form onSubmit={handleSubmit} className="mt-4 grid gap-4 lg:grid-cols-3">
              <label className="text-sm text-slate-200">
                Teacher
                <select
                  name="teacher_id"
                  value={formData.teacher_id}
                  onChange={handleInputChange}
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
                >
                  <option value="">Select teacher</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.teacher_name || teacher.teacher_name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm text-slate-200">
                Class Section
                <select
                  name="class_section_id"
                  value={formData.class_section_id}
                  onChange={handleInputChange}
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
                >
                  <option value="">Select class section</option>
                  {classSections.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.class_name} {entry.section_name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm text-slate-200">
                Subject
                <select
                  name="subject_id"
                  value={formData.subject_id}
                  onChange={handleInputChange}
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
                >
                  <option value="">Select subject</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.subject_name} ({subject.subject_code})
                    </option>
                  ))}
                </select>
              </label>

              <div className="lg:col-span-3 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Saving..." : "Assign Subject"}
                </button>
              </div>
            </form>
          </div>
        ) : null}

        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
          <label className="text-sm font-medium text-slate-200">Search assignments</label>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              placeholder="Search by teacher, class, section, or subject"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
            />
            <button
              type="button"
              onClick={() => setSearch("")}
              className="rounded-2xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-slate-500"
            >
              Reset
            </button>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        {successMessage ? (
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {successMessage}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/80">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-slate-100">
              <thead className="bg-slate-950/80 text-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">Teacher</th>
                  <th className="px-4 py-3 font-semibold">Class</th>
                  <th className="px-4 py-3 font-semibold">Section</th>
                  <th className="px-4 py-3 font-semibold">Subject</th>
                  <th className="px-4 py-3 font-semibold">Code</th>
                  <th className="px-4 py-3 font-semibold">Created At</th>
                  {!isTeacher ? <th className="px-4 py-3 font-semibold">Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index} className="border-t border-slate-800">
                      <td className="px-4 py-4"><div className="h-4 w-36 animate-pulse rounded bg-slate-800" /></td>
                      <td className="px-4 py-4"><div className="h-4 w-20 animate-pulse rounded bg-slate-800" /></td>
                      <td className="px-4 py-4"><div className="h-4 w-16 animate-pulse rounded bg-slate-800" /></td>
                      <td className="px-4 py-4"><div className="h-4 w-28 animate-pulse rounded bg-slate-800" /></td>
                      <td className="px-4 py-4"><div className="h-4 w-16 animate-pulse rounded bg-slate-800" /></td>
                      <td className="px-4 py-4"><div className="h-4 w-24 animate-pulse rounded bg-slate-800" /></td>
                      {!isTeacher ? <td className="px-4 py-4"><div className="h-8 w-20 animate-pulse rounded bg-slate-800" /></td> : null}
                    </tr>
                  ))
                ) : filteredAssignments.length === 0 ? (
                  <tr className="border-t border-slate-800">
                    <td colSpan={isTeacher ? 6 : 7} className="px-4 py-10 text-center text-slate-300">
                      No assignments found for the current search.
                    </td>
                  </tr>
                ) : (
                  filteredAssignments.map((assignment) => (
                    <tr key={assignment.id} className="border-t border-slate-800 transition hover:bg-slate-800/60">
                      <td className="px-4 py-4 font-medium text-white">{assignment.teacher_name || "—"}</td>
                      <td className="px-4 py-4">{assignment.class_name || "—"}</td>
                      <td className="px-4 py-4">{assignment.section_name || "—"}</td>
                      <td className="px-4 py-4">{assignment.subject_name || "—"}</td>
                      <td className="px-4 py-4">{assignment.subject_code || "—"}</td>
                      <td className="px-4 py-4">{assignment.created_at ? new Date(assignment.created_at).toLocaleString() : "—"}</td>
                      {!isTeacher ? (
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(assignment.id)}
                            className="rounded-xl bg-rose-500 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-rose-400"
                          >
                            Delete
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <p className="text-sm uppercase tracking-[0.3em] text-rose-300">Confirm delete</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Delete this assignment?</h2>
            <p className="mt-3 text-sm text-slate-300">
              Removing the assignment will prevent that teacher from being linked to the selected subject in the timetable flow.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-semibold text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded-2xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleting ? "Deleting..." : "Delete Assignment"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}

export default TeacherAssignments;
