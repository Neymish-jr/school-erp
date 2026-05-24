import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import API from "../../api/axios";

const emptyForm = {
  subject_name: "",
};

function Subjects() {
  const [subjects, setSubjects] = useState([]);
  const [classSections, setClassSections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [selectedClassIds, setSelectedClassIds] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");

    return token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {};
  };

  const fetchSubjects = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await API.get("/api/subjects", {
        headers: getAuthHeaders(),
      });

      const data = response?.data?.data || [];
      setSubjects(Array.isArray(data) ? data : []);
    } catch (err) {
      setSubjects([]);
      setError(err?.response?.data?.message || "Unable to load subjects right now.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClassSections = async () => {
    setIsLoadingClasses(true);

    try {
      const response = await API.get("/api/class-sections", {
        headers: getAuthHeaders(),
      });

      const data = response?.data?.data || [];
      setClassSections(Array.isArray(data) ? data : []);
    } catch (err) {
      setClassSections([]);
      setError(err?.response?.data?.message || "Unable to load class sections right now.");
    } finally {
      setIsLoadingClasses(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
    fetchClassSections();
  }, []);

  const classSectionLabels = useMemo(() => {
    return classSections.reduce((map, classSection) => {
      map[String(classSection.id)] = `${classSection.class_name} ${classSection.section_name}`;
      return map;
    }, {});
  }, [classSections]);

  const getApplicableClassText = (subject) => {
    const currentIds = Array.isArray(subject?.applicable_classes) ? subject.applicable_classes : [];

    if (currentIds.length === 0) {
      return "No classes selected";
    }

    return currentIds
      .map((id) => classSectionLabels[String(id)] || `Class ${id}`)
      .join(", ");
  };

  const filteredSubjects = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return subjects;
    }

    return subjects.filter((subject) => {
      const name = (subject.subject_name || "").toLowerCase();
      const code = (subject.subject_code || "").toLowerCase();

      return name.includes(query) || code.includes(query);
    });
  }, [search, subjects]);

  const openAddModal = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setSelectedClassIds([]);
    setError("");
    setSuccessMessage("");
    setIsModalOpen(true);
  };

  const openEditModal = (subject) => {
    setEditingId(subject.id);
    setFormData({
      subject_name: subject.subject_name || "",
    });
    setSelectedClassIds(
      Array.isArray(subject.applicable_classes)
        ? subject.applicable_classes.map((item) => Number(item)).filter((item) => Number.isInteger(item) && item > 0)
        : []
    );
    setError("");
    setSuccessMessage("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData(emptyForm);
    setSelectedClassIds([]);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleClassToggle = (classId) => {
    setSelectedClassIds((prev) => {
      if (prev.includes(classId)) {
        return prev.filter((item) => item !== classId);
      }

      return [...prev, classId];
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const subject_name = formData.subject_name.trim();

    if (!subject_name) {
      setError("Subject name is required.");
      return;
    }

    if (!selectedClassIds.length) {
      setError("Select at least one applicable class.");
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      const payload = {
        subject_name,
        applicable_classes: selectedClassIds,
      };

      if (editingId) {
        await API.put(`/api/subjects/${editingId}`, payload, {
          headers: getAuthHeaders(),
        });
        setSuccessMessage("Subject updated successfully.");
      } else {
        await API.post("/api/subjects", payload, {
          headers: getAuthHeaders(),
        });
        setSuccessMessage("Subject created successfully.");
      }

      closeModal();
      await fetchSubjects();
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to save subject.");
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
      await API.delete(`/api/subjects/${deleteTarget}`, {
        headers: getAuthHeaders(),
      });

      setDeleteTarget(null);
      setSuccessMessage("Subject deleted successfully.");
      await fetchSubjects();
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to delete subject.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Subject Management</p>
            <h1 className="mt-3 text-4xl font-bold text-white">Subjects</h1>
            <p className="mt-2 max-w-2xl text-slate-300">
              Add, edit, and manage subjects while keeping the same modern dark dashboard experience used throughout the ERP.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center justify-center rounded-2xl bg-cyan-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            + Add Subject
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
            <p className="text-sm text-slate-300">Total Subjects</p>
            <p className="mt-2 text-2xl font-bold text-white">{isLoading ? "..." : subjects.length}</p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
            <p className="text-sm text-slate-300">Search Results</p>
            <p className="mt-2 text-2xl font-bold text-white">{isLoading ? "..." : filteredSubjects.length}</p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
            <p className="text-sm text-slate-300">Ready for Timetable</p>
            <p className="mt-2 text-2xl font-bold text-white">{isLoading ? "..." : "Structured"}</p>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
          <label className="text-sm font-medium text-slate-200">Search subjects</label>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              placeholder="Search by subject name or code"
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
                  <th className="px-4 py-3 font-semibold">Subject Name</th>
                  <th className="px-4 py-3 font-semibold">Subject Code</th>
                  <th className="px-4 py-3 font-semibold">Applicable Classes</th>
                  <th className="px-4 py-3 font-semibold">Created At</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index} className="border-t border-slate-800">
                      <td className="px-4 py-4"><div className="h-4 w-40 animate-pulse rounded bg-slate-800" /></td>
                      <td className="px-4 py-4"><div className="h-4 w-24 animate-pulse rounded bg-slate-800" /></td>
                      <td className="px-4 py-4"><div className="h-4 w-48 animate-pulse rounded bg-slate-800" /></td>
                      <td className="px-4 py-4"><div className="h-4 w-28 animate-pulse rounded bg-slate-800" /></td>
                      <td className="px-4 py-4"><div className="h-8 w-28 animate-pulse rounded bg-slate-800" /></td>
                    </tr>
                  ))
                ) : filteredSubjects.length === 0 ? (
                  <tr className="border-t border-slate-800">
                    <td colSpan="5" className="px-4 py-10 text-center text-slate-300">
                      No subjects found for the current search.
                    </td>
                  </tr>
                ) : (
                  filteredSubjects.map((subject) => (
                    <tr key={subject.id} className="border-t border-slate-800 transition hover:bg-slate-800/60">
                      <td className="px-4 py-4 font-medium text-white">{subject.subject_name || "—"}</td>
                      <td className="px-4 py-4">{subject.subject_code || "—"}</td>
                      <td className="px-4 py-4">{getApplicableClassText(subject)}</td>
                      <td className="px-4 py-4">{subject.created_at ? new Date(subject.created_at).toLocaleString() : "—"}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(subject)}
                            className="rounded-xl bg-amber-400 px-3 py-1.5 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(subject.id)}
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
        </div>
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
          <div className="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">
                  {editingId ? "Edit Subject" : "Add Subject"}
                </p>
                <h2 className="mt-2 text-2xl font-bold text-white">
                  {editingId ? "Update subject details" : "Create a new subject"}
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
              <label className="text-sm text-slate-200 md:col-span-2">
                Subject Name
                <input
                  type="text"
                  name="subject_name"
                  value={formData.subject_name}
                  onChange={handleInputChange}
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
                  placeholder="Enter subject name"
                />
              </label>

              <div className="md:col-span-2">
                <p className="text-sm text-slate-200">Applicable Classes</p>
                <p className="mt-1 text-sm text-slate-400">
                  Subject codes are generated automatically in the backend.
                </p>

                {isLoadingClasses ? (
                  <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-4 text-sm text-slate-300">
                    Loading class sections...
                  </div>
                ) : classSections.length === 0 ? (
                  <div className="mt-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-4 text-sm text-amber-100">
                    No class sections are available yet. Create a class section first.
                  </div>
                ) : (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {classSections.map((classSection) => {
                      const isSelected = selectedClassIds.includes(Number(classSection.id));

                      return (
                        <label
                          key={classSection.id}
                          className={`rounded-2xl border px-4 py-3 text-sm transition ${
                            isSelected
                              ? "border-cyan-400 bg-cyan-500/10"
                              : "border-slate-700 bg-slate-950"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-100">
                              {classSection.class_name} {classSection.section_name}
                            </span>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleClassToggle(Number(classSection.id))}
                              className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-cyan-500"
                            />
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

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
                  {isSaving ? "Saving..." : editingId ? "Update Subject" : "Add Subject"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <p className="text-sm uppercase tracking-[0.3em] text-rose-300">Confirm delete</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Delete this subject?</h2>
            <p className="mt-3 text-sm text-slate-300">
              This action will remove the subject from the catalog. Existing assignments must be removed first.
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
                {isDeleting ? "Deleting..." : "Delete Subject"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}

export default Subjects;
