import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import API from "../../api/axios";
import { sortClassesNaturally } from "../../utils/sortClasses";

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
      const [
        teachersResponse,
        classSectionsResponse,
        subjectsResponse,
      ] = await Promise.all([
        API.get("/api/teachers", {
          headers: getAuthHeaders(),
          params: {
            page: 1,
            limit: 1000,
            search: "",
          },
        }),

        API.get("/api/class-sections", {
          headers: getAuthHeaders(),
        }),

        API.get("/api/subjects", {
          headers: getAuthHeaders(),
        }),
      ]);

      setTeachers(
        teachersResponse?.data?.data?.teachers || []
      );

      const sortedClassSections = sortClassesNaturally(
        classSectionsResponse?.data?.data || []
      );

      setClassSections(sortedClassSections);

      setSubjects(
        subjectsResponse?.data?.data || []
      );
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Unable to load teacher subject options."
      );
    }
  };

  const fetchAssignments = async () => {
    setIsLoading(true);
    setError("");

    try {
      const endpoint = isTeacher
        ? "/api/teacher-subject-assignments/me"
        : "/api/teacher-subject-assignments";

      const response = await API.get(endpoint, {
        headers: getAuthHeaders(),
      });

      setAssignments(response?.data?.data || []);
    } catch (err) {
      setAssignments([]);

      setError(
        err?.response?.data?.message ||
          "Unable to load teacher subjects."
      );
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
    void fetchAssignments();
  }, [isTeacher]);

  const filteredAssignments = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return assignments;
    }

    return assignments.filter((assignment) => {
      const teacherName =
        (assignment.teacher_name || "").toLowerCase();

      const className =
        (assignment.class_name || "").toLowerCase();

      const sectionName =
        (assignment.section_name || "").toLowerCase();

      const subjectName =
        (assignment.subject_name || "").toLowerCase();

      const subjectCode =
        (assignment.subject_code || "").toLowerCase();

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

    if (
      !formData.teacher_id ||
      !formData.class_section_id ||
      !formData.subject_id
    ) {
      setError(
        "Please select a teacher, class section, and subject."
      );

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
          class_section_id: Number(
            formData.class_section_id
          ),
          subject_id: Number(formData.subject_id),
        },
        {
          headers: getAuthHeaders(),
        }
      );

      setSuccessMessage(
        "Teacher subject created successfully."
      );

      setFormData(EMPTY_FORM);

      await fetchAssignments();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Unable to create teacher subject."
      );
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
      await API.delete(
        `/api/teacher-subject-assignments/${deleteTarget}`,
        {
          headers: getAuthHeaders(),
        }
      );

      setDeleteTarget(null);

      setSuccessMessage(
        "Teacher subject deleted successfully."
      );

      await fetchAssignments();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Unable to delete teacher subject."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-sm uppercase tracking-[0.3em] text-cyan-600">
              TEACHER SUBJECTS
            </h1>

            <p className="mt-2 max-w-2xl text-slate-300">
              Assign subjects to teachers for each class and section. These allocations are used for attendance, results, and timetable generation.
            </p>
          </div>

          {!isTeacher ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-sm text-slate-200">
              Admin view: allocate and manage teacher subjects.
            </div>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
            <p className="text-sm text-slate-300">
              Total Subject Allocations
            </p>

            <p className="mt-2 text-2xl font-bold text-white">
              {isLoading ? "..." : assignments.length}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
            <p className="text-sm text-slate-300">
              Visible Subject Allocations
            </p>

            <p className="mt-2 text-2xl font-bold text-white">
              {isLoading
                ? "..."
                : filteredAssignments.length}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
            <p className="text-sm text-slate-300">
              Attendance Ready
            </p>

            <p className="mt-2 text-2xl font-bold text-white">
              {isLoading ? "..." : "Yes"}
            </p>
          </div>
        </div>

        {!isTeacher ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
            <h2 className="text-lg font-semibold text-white">
              Assign Teacher Subject
            </h2>

            <form
              onSubmit={handleSubmit}
              className="mt-4 grid gap-4 lg:grid-cols-3"
            >
              <label className="text-sm text-slate-200">
                Teacher

                <select
                  name="teacher_id"
                  value={formData.teacher_id}
                  onChange={handleInputChange}
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
                >
                  <option value="">
                    Select teacher
                  </option>

                  {teachers.map((teacher) => (
                    <option
                      key={teacher.id}
                      value={teacher.id}
                    >
                      {teacher.teacher_name}
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
                  <option value="">
                    Select class section
                  </option>

                  {classSections.map((entry) => (
                    <option
                      key={entry.id}
                      value={entry.id}
                    >
                      {entry.class_name}{" "}
                      {entry.section_name}
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
                  <option value="">
                    Select subject
                  </option>

                  {subjects.map((subject) => (
                    <option
                      key={subject.id}
                      value={subject.id}
                    >
                      {subject.subject_name} (
                      {subject.subject_code})
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
                  {isSaving
                    ? "Saving..."
                    : "Assign Teacher Subject"}
                </button>
              </div>
            </form>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/80">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-slate-100">
              <thead className="bg-slate-950/80 text-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">
                    Teacher
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Class
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Section
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Subject
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr
                      key={index}
                      className="border-t border-slate-800"
                    >
                      <td className="px-4 py-4">
                        <div className="h-4 w-36 animate-pulse rounded bg-slate-800" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 w-20 animate-pulse rounded bg-slate-800" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 w-20 animate-pulse rounded bg-slate-800" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 w-32 animate-pulse rounded bg-slate-800" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-8 w-20 animate-pulse rounded bg-slate-800" />
                      </td>
                    </tr>
                  ))
                ) : assignments.length === 0 ? (
                  <tr className="border-t border-slate-800">
                    <td
                      colSpan="5"
                      className="px-4 py-10 text-center text-slate-300"
                    >
                      No subject allocations found
                    </td>
                  </tr>
                ) : (
                  filteredAssignments.map((assignment) => (
                    <tr
                      key={assignment.id}
                      className="border-t border-slate-800 transition hover:bg-slate-800/60"
                    >
                      <td className="px-4 py-4 font-medium text-white">
                        {assignment.teacher_name || "-"}
                      </td>
                      <td className="px-4 py-4">
                        {assignment.class_name || "-"}
                      </td>
                      <td className="px-4 py-4">
                        {assignment.section_name || "-"}
                      </td>
                      <td className="px-4 py-4">
                        {assignment.subject_name || "-"}
                      </td>
                      <td className="px-4 py-4">
                        {!isTeacher ? (
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteTarget(assignment.id)
                            }
                            className="rounded-xl bg-rose-500 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-rose-400"
                          >
                            Delete
                          </button>
                        ) : (
                          <span className="text-slate-500">
                            -
                          </span>
                        )}
                      </td>
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
            <p className="text-sm uppercase tracking-[0.3em] text-rose-300">
              Confirm delete
            </p>

            <h2 className="mt-2 text-2xl font-bold text-white">
              Delete this teacher subject?
            </h2>

            <p className="mt-3 text-sm text-slate-300">
              This will remove the selected teacher subject.
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
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}

export default TeacherAssignments;
