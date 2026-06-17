import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import API from "../../api/axios";

const emptyForm = {
  name: "",
  gender: "",
  category: "",
  student_class: "",
  section: "",
};

function Students() {
  const [students, setStudents] = useState([]);
  const [classSections, setClassSections] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalStudents, setTotalStudents] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");

    return token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {};
  };

  const handleImport = async () => {
    if (!importFile) {
      alert("Please select an Excel file");
      return;
    }

    try {
      setIsImporting(true);

      const formData = new FormData();

      formData.append("file", importFile);

     const response = await API.post(
      "/api/student-import",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    alert(
      `${response.data.imported} students imported successfully`
    );

      alert(
        `${response.data.imported} students imported successfully`
      );

      fetchStudents();
    } catch (error) {
      console.error(error);

      alert("Import failed");
    } finally {
      setIsImporting(false);
    }
  };

const fetchClassSections = async () => {
    try {
      const res = await API.get("/api/class-sections", {
        headers: getAuthHeaders(),
      });

      setClassSections(Array.isArray(res?.data?.data) ? res.data.data : []);
    } catch (err) {
      setClassSections([]);
    }
  };

  const fetchStudents = async () => {
    setIsLoading(true);
    setError("");

    try {
      const res = await API.get("/api/students", {
        headers: getAuthHeaders(),
        params: {
          page,
          limit: 10,
          search,
        },
      });

      const payload = res?.data?.data || {};

      setStudents(payload.students || []);
      setTotalPages(payload.totalPages || 1);
      setTotalStudents(payload.totalStudents || 0);
    } catch (err) {
      setStudents([]);
      setTotalPages(1);
      setTotalStudents(0);
      setError(
        err?.response?.data?.message ||
          "Unable to fetch students right now. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClassSections();
    fetchStudents();
  }, [page, search]);

  const classOptions = useMemo(() => {
    const classes = Array.from(
      new Set(classSections.map((item) => item.class_name).filter(Boolean))
    );

    if (formData.student_class && !classes.includes(formData.student_class)) {
      classes.push(formData.student_class);
    }

    return classes.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [classSections, formData.student_class]);

  const sectionOptions = useMemo(() => {
    const sections = Array.from(
      new Set(
        classSections
          .filter(
            (item) =>
              !formData.student_class || item.class_name === formData.student_class
          )
          .map((item) => item.section_name)
          .filter(Boolean)
      )
    );

    if (formData.section && !sections.includes(formData.section)) {
      sections.push(formData.section);
    }

    return sections.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [classSections, formData.section, formData.student_class]);

  const openAddModal = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setError("");
    setSuccessMessage("");
    setIsModalOpen(true);
  };

  const openEditModal = (student) => {
    setEditingId(student.id);
    setFormData({
      name: student.name || "",
      gender: student.gender || "",
      category: student.category || "",
      student_class: student.student_class || "",
      section: student.section || "",
    });
    setError("");
    setSuccessMessage("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData(emptyForm);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "student_class") {
      setFormData((prev) => ({
        ...prev,
        section: "",
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setIsSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      if (!formData.student_class || !formData.section) {
        setError("Please select a class and section from the available options.");
        setIsSaving(false);
        return;
      }

      if (editingId) {
        await API.put(`/api/students/${editingId}`, formData, {
          headers: getAuthHeaders(),
        });
        setSuccessMessage("Student updated successfully.");
      } else {
        await API.post("/api/students", formData, {
          headers: getAuthHeaders(),
        });
        setSuccessMessage("Student added successfully.");
      }

      closeModal();
      setPage(1);
      fetchStudents();
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to save student details.");
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
      await API.delete(`/api/students/${deleteTarget}`, {
        headers: getAuthHeaders(),
      });

      setDeleteTarget(null);
      setSuccessMessage("Student deleted successfully.");
      setPage((currentPage) =>
        currentPage > 1 && students.length === 1 ? currentPage - 1 : currentPage
      );
      fetchStudents();
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to delete student.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-orange-300">
              Student Management
            </p>
            <h1 className="mt-3 text-4xl font-bold text-white">
              Students
            </h1>
            <p className="mt-2 max-w-2xl text-slate-300">
              Browse student records, search instantly, and manage student data from one clean workspace.
            </p>
          </div>

          <button
            onClick={openAddModal}
            className="inline-flex items-center justify-center rounded-2xl bg-orange-500 px-4 py-3 font-semibold text-white transition hover:bg-orange-400"
          >
            + Add Student
          </button>
        </div>

        <div className="flex gap-3">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) =>
              setImportFile(e.target.files[0])
            }
          />

          <button
            onClick={handleImport}
            disabled={isImporting}
          >
            {isImporting
              ? "Importing..."
              : "Import Excel"}
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
            <p className="text-sm text-slate-300">Total Students</p>
            <p className="mt-2 text-2xl font-bold text-white">{isLoading ? "..." : totalStudents}</p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
            <p className="text-sm text-slate-300">Current Page</p>
            <p className="mt-2 text-2xl font-bold text-white">{page}</p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
            <p className="text-sm text-slate-300">Search Results</p>
            <p className="mt-2 text-2xl font-bold text-white">{isLoading ? "..." : students.length}</p>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
          <label className="text-sm font-medium text-slate-200">
            Search students
          </label>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              placeholder="Search by student name"
              value={search}
              onChange={handleSearchChange}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
            />
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setPage(1);
              }}
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
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Gender</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Class</th>
                  <th className="px-4 py-3 font-semibold">Section</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index} className="border-t border-slate-800">
                      <td className="px-4 py-4">
                        <div className="h-4 w-32 animate-pulse rounded bg-slate-800" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 w-20 animate-pulse rounded bg-slate-800" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 w-24 animate-pulse rounded bg-slate-800" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 w-16 animate-pulse rounded bg-slate-800" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 w-16 animate-pulse rounded bg-slate-800" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-8 w-32 animate-pulse rounded bg-slate-800" />
                      </td>
                    </tr>
                  ))
                ) : students.length === 0 ? (
                  <tr className="border-t border-slate-800">
                    <td colSpan="6" className="px-4 py-10 text-center text-slate-300">
                      No students found for the current search.
                    </td>
                  </tr>
                ) : (
                  students.map((student) => (
                    <tr
                      key={student.id}
                      className="border-t border-slate-800 transition hover:bg-slate-800/60"
                    >
                      <td className="px-4 py-4 font-medium text-white">{student.name}</td>
                      <td className="px-4 py-4">{student.gender || "—"}</td>
                      <td className="px-4 py-4">{student.category || "—"}</td>
                      <td className="px-4 py-4">{student.student_class || "—"}</td>
                      <td className="px-4 py-4">{student.section || "—"}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(student)}
                            className="rounded-xl bg-amber-400 px-3 py-1.5 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(student.id)}
                            className="rounded-xl bg-rose-500 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-rose-400"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-800 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-300">
              Showing page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((currentPage) => Math.max(currentPage - 1, 1))}
                disabled={page === 1 || isLoading}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((currentPage) => Math.min(currentPage + 1, totalPages))}
                disabled={page === totalPages || isLoading}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-orange-300">
                  {editingId ? "Edit Student" : "Add Student"}
                </p>
                <h2 className="mt-2 text-2xl font-bold text-white">
                  {editingId ? "Update student details" : "Create a new student record"}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full border border-slate-700 px-3 py-1 text-sm text-slate-200"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="text-sm text-slate-200">
                Student Name
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
                  placeholder="Enter student name"
                />
              </label>

              <label className="text-sm text-slate-200">
                Gender
                <select
                  name="gender"
                  required
                  value={formData.gender}
                  onChange={handleInputChange}
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </label>

              <label className="text-sm text-slate-200">
                Category
                <select
                  name="category"
                  required
                  value={formData.category}
                  onChange={handleInputChange}
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
                >
                  <option value="">Select category</option>
                  <option value="General">General</option>
                  <option value="OBC">OBC</option>
                  <option value="SC">SC</option>
                  <option value="ST">ST</option>
                </select>
              </label>

              <label className="text-sm text-slate-200">
                Class
                <select
                  name="student_class"
                  required
                  value={formData.student_class}
                  onChange={handleInputChange}
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
                >
                  <option value="">Select class</option>
                  {classOptions.map((className) => (
                    <option key={className} value={className}>
                      {className}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm text-slate-200 md:col-span-2">
                Section
                <select
                  name="section"
                  required
                  value={formData.section}
                  onChange={handleInputChange}
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
                >
                  <option value="">Select section</option>
                  {sectionOptions.map((sectionName) => (
                    <option key={sectionName} value={sectionName}>
                      {sectionName}
                    </option>
                  ))}
                </select>
              </label>

              <div className="md:col-span-2 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-2xl border border-slate-700 px-4 py-3 text-sm font-semibold text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Saving..." : editingId ? "Update Student" : "Add Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <p className="text-sm uppercase tracking-[0.3em] text-rose-300">
              Confirm delete
            </p>
            <h2 className="mt-2 text-2xl font-bold text-white">
              Delete this student?
            </h2>
            <p className="mt-3 text-sm text-slate-300">
              This action will mark the student as inactive and remove them from the current list.
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
                {isDeleting ? "Deleting..." : "Delete Student"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}

export default Students;