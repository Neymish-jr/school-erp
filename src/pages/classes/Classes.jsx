import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import API from "../../api/axios";
import { usePermissions } from "../../hooks/usePermissions";

const emptyForm = {
  class_name: "",
  section_name: "",
};

const classNamePattern = /^[A-Za-z0-9][A-Za-z0-9\s-]*$/;
const sectionNamePattern = /^[A-Za-z0-9]+$/;

function Classes() {
  const { can } = usePermissions();
  const canCreateClassSection = can("class_section.create");
  const canUpdateClassSection = can("class_section.update");
  const canDeleteClassSection = can("class_section.delete");
  const showClassActions = canUpdateClassSection || canDeleteClassSection;

  const [classSections, setClassSections] = useState([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
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

  const fetchClassSections = async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setError("");

    try {
      const res = await API.get("/api/class-sections", {
        headers: getAuthHeaders(),
      });

      setClassSections(Array.isArray(res?.data?.data) ? res.data.data : []);
    } catch (err) {
      setClassSections([]);
      setError(
        err?.response?.data?.message ||
          "Unable to load classes and sections right now."
      );
    } finally {
      if (refresh) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchClassSections();
  }, []);

  const validationErrors = useMemo(() => {
    const errors = {};
    const className = formData.class_name.trim();
    const sectionName = formData.section_name.trim();

    if (!className) {
      errors.class_name = "Class name is required.";
    } else if (className.length > 40) {
      errors.class_name = "Class name must be 40 characters or less.";
    } else if (!classNamePattern.test(className)) {
      errors.class_name = "Class name can include letters, numbers, spaces, or hyphens only.";
    }

    if (!sectionName) {
      errors.section_name = "Section name is required.";
    } else if (sectionName.length > 10) {
      errors.section_name = "Section name must be 10 characters or less.";
    } else if (!sectionNamePattern.test(sectionName)) {
      errors.section_name = "Section name can include letters or numbers only.";
    }

    const duplicateExists = classSections.some((item) => {
      if (item.id === editingId) {
        return false;
      }

      return (
        item.class_name?.trim().toLowerCase() === className.toLowerCase() &&
        item.section_name?.trim().toLowerCase() === sectionName.toLowerCase()
      );
    });

    if (duplicateExists) {
      errors.section_name = "This class and section combination already exists.";
    }

    return errors;
  }, [classSections, editingId, formData]);

    const filteredClassSections = useMemo(() => {
      const query = search.trim().toLowerCase();

      if (!query) {
        return classSections;
      }

      return classSections.filter((item) => {
        return (
          item.class_name?.toLowerCase().includes(query) ||
          item.section_name?.toLowerCase().includes(query)
        );
      });
    }, [classSections, search]);

  const sortedClassSections = useMemo(() => {
    return [...filteredClassSections].sort((a, b) => {
      const classCompare =
        Number(a.class_name) - Number(b.class_name);

      if (classCompare !== 0) {
        return classCompare;
      }

      return a.section_name.localeCompare(b.section_name);
    });
  }, [filteredClassSections]);

  const openAddModal = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setError("");
    setSuccessMessage("");
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingId(item.id);
    setFormData({
      class_name: item.class_name || "",
      section_name: item.section_name || "",
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

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const submitForm = async () => {
    const payload = {
      class_name: formData.class_name.trim(),
      section_name: formData.section_name.trim(),
    };

    if (Object.keys(validationErrors).length > 0) {
      return { ok: false, validationError: true };
    }

    if (editingId) {
      return API.put(`/api/class-sections/${editingId}`, payload, {
        headers: getAuthHeaders(),
      });
    }

    return API.post("/api/class-sections", payload, {
      headers: getAuthHeaders(),
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (Object.keys(validationErrors).length > 0) {
      setError("Please fix the highlighted fields before saving.");
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      await submitForm();

      setSuccessMessage(
        editingId
          ? "Class section updated successfully."
          : "Class section added successfully."
      );
      closeModal();
      fetchClassSections();
    } catch (err) {
      const serverMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Unable to save class section.";

      if (err?.response?.status === 409) {
        setError(serverMessage);
        return;
      }

      setError(serverMessage);
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
      await API.delete(`/api/class-sections/${deleteTarget}`, {
        headers: getAuthHeaders(),
      });

      setDeleteTarget(null);
      setSuccessMessage("Class section deleted successfully.");
      fetchClassSections();
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to delete class section.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-orange-300">
              Classes & Sections
            </p>
            <h1 className="mt-3 text-4xl font-bold text-white">
              Manage Classes
            </h1>
            <p className="mt-2 max-w-2xl text-slate-300">
              Create and maintain class-section combinations that power student registration and reporting.
            </p>
          </div>

          {canCreateClassSection ? (
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center justify-center rounded-2xl bg-orange-500 px-4 py-3 font-semibold text-white transition hover:bg-orange-400"
            >
              + Add Class Section
            </button>
          ) : null}
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="w-full">
              <label className="text-sm font-medium text-slate-200">
                Search classes or sections
              </label>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by class or section"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
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

            <button
              type="button"
              onClick={() => fetchClassSections(true)}
              disabled={isRefreshing}
              className="rounded-2xl border border-orange-400 px-4 py-3 text-sm font-semibold text-orange-100 transition hover:border-orange-300 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRefreshing ? "Refreshing..." : "Refresh"}
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
                  <th className="px-4 py-3 font-semibold">Class</th>
                  <th className="px-4 py-3 font-semibold">Section</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                  {showClassActions ? (
                    <th className="px-4 py-3 font-semibold">Actions</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index} className="border-t border-slate-800">
                      <td className="px-4 py-4">
                        <div className="h-4 w-24 animate-pulse rounded bg-slate-800" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 w-24 animate-pulse rounded bg-slate-800" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 w-32 animate-pulse rounded bg-slate-800" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-8 w-28 animate-pulse rounded bg-slate-800" />
                      </td>
                    </tr>
                  ))
                ) : filteredClassSections.length === 0 ? (
                  <tr className="border-t border-slate-800">
                    <td colSpan={showClassActions ? 4 : 3} className="px-4 py-10 text-center text-slate-300">
                      No class sections found.
                    </td>
                  </tr>
                ) : (
                  sortedClassSections.map((item) => (
                    <tr
                      key={item.id}
                      className="border-t border-slate-800 transition hover:bg-slate-800/60"
                    >
                      <td className="px-4 py-4 font-medium text-white">
                        {item.class_name}
                      </td>
                      <td className="px-4 py-4">{item.section_name}</td>
                      <td className="px-4 py-4">
                        {new Date(item.created_at).toLocaleString()}
                      </td>
                      {showClassActions ? (
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            {canUpdateClassSection ? (
                              <button
                                type="button"
                                onClick={() => openEditModal(item)}
                                className="rounded-xl bg-amber-400 px-3 py-1.5 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
                              >
                                Edit
                              </button>
                            ) : null}
                            {canDeleteClassSection ? (
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(item.id)}
                                className="rounded-xl bg-rose-500 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-rose-400"
                              >
                                Delete
                              </button>
                            ) : null}
                          </div>
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

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
          <div className="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-orange-300">
                  {editingId ? "Edit Class Section" : "Add Class Section"}
                </p>
                <h2 className="mt-2 text-2xl font-bold text-white">
                  {editingId
                    ? "Update an existing combination"
                    : "Create a new class section"}
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

            <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
              <label className="text-sm text-slate-200">
                Class Name
                <input
                  type="text"
                  name="class_name"
                  required
                  value={formData.class_name}
                  onChange={handleInputChange}
                  placeholder="e.g. 10"
                  className={`mt-2 w-full rounded-2xl border px-4 py-3 text-white outline-none transition focus:border-orange-400 ${
                    validationErrors.class_name
                      ? "border-rose-500 bg-rose-500/10"
                      : "border-slate-700 bg-slate-950"
                  }`}
                />
                {validationErrors.class_name ? (
                  <p className="mt-2 text-sm text-rose-200">
                    {validationErrors.class_name}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-slate-400">
                    Use letters, numbers, spaces, or hyphens.
                  </p>
                )}
              </label>

              <label className="text-sm text-slate-200">
                Section Name
                <input
                  type="text"
                  name="section_name"
                  required
                  value={formData.section_name}
                  onChange={handleInputChange}
                  placeholder="e.g. A"
                  className={`mt-2 w-full rounded-2xl border px-4 py-3 text-white outline-none transition focus:border-orange-400 ${
                    validationErrors.section_name
                      ? "border-rose-500 bg-rose-500/10"
                      : "border-slate-700 bg-slate-950"
                  }`}
                />
                {validationErrors.section_name ? (
                  <p className="mt-2 text-sm text-rose-200">
                    {validationErrors.section_name}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-slate-400">
                    Use letters or numbers only, like A or B1.
                  </p>
                )}
              </label>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-2xl border border-slate-700 px-4 py-3 text-sm font-semibold text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || Object.keys(validationErrors).length > 0}
                  className="rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Saving..." : editingId ? "Update" : "Add"}
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
              Delete this class section?
            </h2>
            <p className="mt-3 text-sm text-slate-300">
              This will remove the selected class and section combination from the available options.
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

export default Classes;
