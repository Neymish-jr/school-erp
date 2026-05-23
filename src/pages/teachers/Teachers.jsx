import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import API from "../../api/axios";

const PAGE_SIZE = 10;
const STORAGE_KEY = "school-erp-teacher-meta";

const emptyForm = {
  fullName: "",
  email: "",
  phone: "",
  subject: "",
  qualification: "",
  gender: "",
  age: 30,
};

const loadMeta = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    return saved ? JSON.parse(saved) : {};
  } catch (error) {
    return {};
  }
};

const saveMeta = (meta) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(meta));
};

function Teachers() {
  const [teachers, setTeachers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [teacherMeta, setTeacherMeta] = useState(loadMeta);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");

    return token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {};
  };

  const normalizeTeacher = (teacher, meta = {}) => ({
    ...teacher,
    email: meta.email || "",
    subject: meta.subject || teacher.designation || "",
    qualification: meta.qualification || "",
  });

  const fetchTeachers = async () => {
    setIsLoading(true);
    setError("");

    try {
      const currentMeta = loadMeta();
      const firstPage = await API.get("/api/teachers", {
        headers: getAuthHeaders(),
        params: {
          page: 1,
          limit: 1000,
          search: "",
        },
      });

      const payload = firstPage?.data?.data || {};
      const totalPages = payload.totalPages || 1;
      const pagesToFetch = Array.from({ length: totalPages }, (_, index) => index + 1)
        .filter((currentPage) => currentPage !== 1);

      const allResponses = await Promise.all(
        pagesToFetch.map((currentPage) =>
          API.get("/api/teachers", {
            headers: getAuthHeaders(),
            params: {
              page: currentPage,
              limit: 1000,
              search: "",
            },
          })
        )
      );

      const allTeachers = [payload.teachers || [], ...allResponses.map((response) => response?.data?.data?.teachers || [])]
        .flat();

      const enrichedTeachers = allTeachers.map((teacher) =>
        normalizeTeacher(teacher, currentMeta[teacher.id] || {})
      );

      setTeachers(enrichedTeachers);
    } catch (err) {
      setTeachers([]);
      setError(
        err?.response?.data?.message ||
          "Unable to load teachers right now. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const filteredTeachers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return teachers;
    }

    return teachers.filter((teacher) => {
      const fullName = (teacher.teacher_name || "").toLowerCase();
      const email = (teacher.email || "").toLowerCase();

      return fullName.includes(query) || email.includes(query);
    });
  }, [teachers, search]);

  const totalPages = Math.max(1, Math.ceil(filteredTeachers.length / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const visibleTeachers = filteredTeachers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openAddModal = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setError("");
    setSuccessMessage("");
    setIsModalOpen(true);
  };

  const openEditModal = (teacher) => {
    setEditingId(teacher.id);
    setFormData({
      fullName: teacher.teacher_name || "",
      email: teacher.email || "",
      phone: teacher.phone || "",
      subject: teacher.subject || teacher.designation || "",
      qualification: teacher.qualification || "",
      gender: teacher.gender || "",
      age: teacher.age || 30,
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
  };

  const handlePhoneChange = (e) => {
    const value = e.target.value;

    if (/^\d{0,10}$/.test(value)) {
      setFormData((prev) => ({
        ...prev,
        phone: value,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const phone = formData.phone.trim();
    const fullName = formData.fullName.trim();
    const email = formData.email.trim();
    const subject = formData.subject.trim();
    const qualification = formData.qualification.trim();
    const age = Number(formData.age);

    if (!fullName) {
      setError("Full name is required.");
      return;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please provide a valid email address.");
      return;
    }

    if (!phone || phone.length !== 10) {
      setError("Phone number must be exactly 10 digits.");
      return;
    }

    if (!subject) {
      setError("Subject is required.");
      return;
    }

    if (!qualification) {
      setError("Qualification is required.");
      return;
    }

    if (!formData.gender) {
      setError("Please select a gender.");
      return;
    }

    if (!Number.isFinite(age) || age < 18 || age > 65) {
      setError("Age must be between 18 and 65.");
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      const payload = {
        teacher_name: fullName,
        designation: subject,
        phone,
        age,
        gender: formData.gender,
      };

      if (editingId) {
        await API.put(`/api/teachers/${editingId}`, payload, {
          headers: getAuthHeaders(),
        });
        setSuccessMessage("Teacher updated successfully.");
      } else {
        const response = await API.post("/api/teachers", payload, {
          headers: getAuthHeaders(),
        });

        const createdTeacher = response?.data?.data;

        if (createdTeacher?.id) {
          setTeacherMeta((prev) => {
            const next = {
              ...prev,
              [createdTeacher.id]: {
                email,
                subject,
                qualification,
              },
            };

            saveMeta(next);

            return next;
          });
        }

        setSuccessMessage("Teacher added successfully.");
      }

      closeModal();
      await fetchTeachers();
      setPage(1);
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to save teacher details.");
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
      await API.delete(`/api/teachers/${deleteTarget}`, {
        headers: getAuthHeaders(),
      });

      setDeleteTarget(null);
      setSuccessMessage("Teacher deleted successfully.");
      await fetchTeachers();
      setPage(1);
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to delete teacher.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">
              Teacher Management
            </p>
            <h1 className="mt-3 text-4xl font-bold text-white">
              Teachers
            </h1>
            <p className="mt-2 max-w-2xl text-slate-300">
              Manage teacher records, search quickly, and update staff details from one modern dashboard view.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center justify-center rounded-2xl bg-cyan-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            + Add Teacher
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
            <p className="text-sm text-slate-300">Total Teachers</p>
            <p className="mt-2 text-2xl font-bold text-white">{isLoading ? "..." : teachers.length}</p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
            <p className="text-sm text-slate-300">Current Page</p>
            <p className="mt-2 text-2xl font-bold text-white">{page}</p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
            <p className="text-sm text-slate-300">Visible Results</p>
            <p className="mt-2 text-2xl font-bold text-white">{isLoading ? "..." : visibleTeachers.length}</p>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
          <label className="text-sm font-medium text-slate-200">
            Search teachers
          </label>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              placeholder="Search by name or email"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
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
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Phone</th>
                  <th className="px-4 py-3 font-semibold">Subject</th>
                  <th className="px-4 py-3 font-semibold">Qualification</th>
                  <th className="px-4 py-3 font-semibold">Gender</th>
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
                        <div className="h-4 w-40 animate-pulse rounded bg-slate-800" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 w-28 animate-pulse rounded bg-slate-800" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 w-24 animate-pulse rounded bg-slate-800" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 w-28 animate-pulse rounded bg-slate-800" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 w-20 animate-pulse rounded bg-slate-800" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-8 w-32 animate-pulse rounded bg-slate-800" />
                      </td>
                    </tr>
                  ))
                ) : visibleTeachers.length === 0 ? (
                  <tr className="border-t border-slate-800">
                    <td colSpan="7" className="px-4 py-10 text-center text-slate-300">
                      No teachers found for the current search.
                    </td>
                  </tr>
                ) : (
                  visibleTeachers.map((teacher) => (
                    <tr key={teacher.id} className="border-t border-slate-800 transition hover:bg-slate-800/60">
                      <td className="px-4 py-4 font-medium text-white">{teacher.teacher_name || "—"}</td>
                      <td className="px-4 py-4">{teacher.email || "—"}</td>
                      <td className="px-4 py-4">{teacher.phone || "—"}</td>
                      <td className="px-4 py-4">{teacher.subject || teacher.designation || "—"}</td>
                      <td className="px-4 py-4">{teacher.qualification || "—"}</td>
                      <td className="px-4 py-4">{teacher.gender || "—"}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(teacher)}
                            className="rounded-xl bg-amber-400 px-3 py-1.5 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(teacher.id)}
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
                <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">
                  {editingId ? "Edit Teacher" : "Add Teacher"}
                </p>
                <h2 className="mt-2 text-2xl font-bold text-white">
                  {editingId ? "Update teacher details" : "Create a new teacher record"}
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
                Full Name
                <input
                  type="text"
                  name="fullName"
                  required
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
                  placeholder="Enter full name"
                />
              </label>

              <label className="text-sm text-slate-200">
                Email
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
                  placeholder="teacher@example.com"
                />
              </label>

              <label className="text-sm text-slate-200">
                Phone Number
                <input
                  type="text"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
                  placeholder="10-digit phone number"
                />
              </label>

              <label className="text-sm text-slate-200">
                Subject
                <input
                  type="text"
                  name="subject"
                  required
                  value={formData.subject}
                  onChange={handleInputChange}
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
                  placeholder="e.g. Mathematics"
                />
              </label>

              <label className="text-sm text-slate-200">
                Qualification
                <input
                  type="text"
                  name="qualification"
                  required
                  value={formData.qualification}
                  onChange={handleInputChange}
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
                  placeholder="e.g. M.Sc, B.Ed"
                />
              </label>

              <label className="text-sm text-slate-200">
                Gender
                <select
                  name="gender"
                  required
                  value={formData.gender}
                  onChange={handleInputChange}
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
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
                  className="rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Saving..." : editingId ? "Update Teacher" : "Add Teacher"}
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
              Delete this teacher?
            </h2>
            <p className="mt-3 text-sm text-slate-300">
              This action will remove the teacher from the system.
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
                {isDeleting ? "Deleting..." : "Delete Teacher"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}

export default Teachers;