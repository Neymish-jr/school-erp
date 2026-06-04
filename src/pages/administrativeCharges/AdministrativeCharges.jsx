import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import API from "../../api/axios";

const emptyForm = {
  charge_name: "",
  description: "",
};

const examples = [
  "Principal In-Charge",
  "PM SHRI In-Charge",
  "Board Exam In-Charge",
  "Scholarship In-Charge",
  "Sports In-Charge",
  "Timetable In-Charge",
  "Discipline In-Charge",
  "Cultural In-Charge",
  "ICT In-Charge",
  "UDISE In-Charge",
];

function AdministrativeCharges() {
  const [charges, setCharges] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [statusTarget, setStatusTarget] = useState(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");

    return token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {};
  };

  const fetchCharges = async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setError("");

    try {
      const response = await API.get("/api/administrative-charges", {
        headers: getAuthHeaders(),
        params: {
          search: search.trim(),
        },
      });

      const data = response?.data?.data || [];
      setCharges(Array.isArray(data) ? data : []);
    } catch (err) {
      setCharges([]);
      setError(err?.response?.data?.message || "Unable to load administrative charges right now.");
    } finally {
      if (refresh) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchCharges();
  }, []);

  const activeCount = useMemo(
    () => charges.filter((charge) => charge.is_active).length,
    [charges]
  );

  const inactiveCount = useMemo(
    () => charges.filter((charge) => !charge.is_active).length,
    [charges]
  );

  const openAddModal = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setError("");
    setSuccessMessage("");
    setIsModalOpen(true);
  };

  const openEditModal = (charge) => {
    setEditingId(charge.id);
    setFormData({
      charge_name: charge.charge_name || "",
      description: charge.description || "",
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

  const handleSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      charge_name: formData.charge_name.trim(),
      description: formData.description.trim(),
    };

    if (!payload.charge_name) {
      setError("Charge name is required.");
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      if (editingId) {
        await API.put(`/api/administrative-charges/${editingId}`, payload, {
          headers: getAuthHeaders(),
        });
        setSuccessMessage("Administrative charge updated successfully.");
      } else {
        await API.post("/api/administrative-charges", payload, {
          headers: getAuthHeaders(),
        });
        setSuccessMessage("Administrative charge added successfully.");
      }

      closeModal();
      await fetchCharges();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Unable to save administrative charge."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async () => {
    if (!statusTarget) {
      return;
    }

    setIsUpdatingStatus(true);
    setError("");
    setSuccessMessage("");

    try {
      await API.put(
        `/api/administrative-charges/${statusTarget.id}/status`,
        {
          is_active: !statusTarget.is_active,
        },
        {
          headers: getAuthHeaders(),
        }
      );

      setSuccessMessage(
        statusTarget.is_active
          ? "Administrative charge deactivated successfully."
          : "Administrative charge activated successfully."
      );
      setStatusTarget(null);
      await fetchCharges();
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to update administrative charge status.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const applySearch = () => {
    fetchCharges(true);
  };

  const resetSearch = () => {
    setSearch("");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">
              Administration Setup
            </p>
            <h1 className="mt-3 text-4xl font-bold text-white">
              Administrative Charges
            </h1>
            <p className="mt-2 max-w-2xl text-slate-300">
              Maintain in-charge responsibilities such as examinations, scholarships, discipline, ICT, and UDISE.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center justify-center rounded-2xl bg-cyan-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            + Add Charge
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
            <p className="text-sm text-slate-300">Total Charges</p>
            <p className="mt-2 text-2xl font-bold text-white">
              {isLoading ? "..." : charges.length}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
            <p className="text-sm text-slate-300">Active Charges</p>
            <p className="mt-2 text-2xl font-bold text-white">
              {isLoading ? "..." : activeCount}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
            <p className="text-sm text-slate-300">Inactive Charges</p>
            <p className="mt-2 text-2xl font-bold text-white">
              {isLoading ? "..." : inactiveCount}
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto] lg:items-end">
            <label className="text-sm font-medium text-slate-200">
              Search charges
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by charge name or description"
                className="mt-3 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
              />
            </label>

            <button
              type="button"
              onClick={applySearch}
              disabled={isRefreshing}
              className="rounded-2xl border border-cyan-400 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:border-cyan-300 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRefreshing ? "Refreshing..." : "Apply"}
            </button>

            <button
              type="button"
              onClick={resetSearch}
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
                  <th className="px-4 py-3 font-semibold">Charge Name</th>
                  <th className="px-4 py-3 font-semibold">Description</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Created At</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index} className="border-t border-slate-800">
                      {Array.from({ length: 5 }).map((__, cellIndex) => (
                        <td key={cellIndex} className="px-4 py-4">
                          <div className="h-4 w-32 animate-pulse rounded bg-slate-800" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : charges.length === 0 ? (
                  <tr className="border-t border-slate-800">
                    <td colSpan="5" className="px-4 py-10 text-center text-slate-300">
                      No administrative charges found.
                    </td>
                  </tr>
                ) : (
                  charges.map((charge) => (
                    <tr
                      key={charge.id}
                      className="border-t border-slate-800 transition hover:bg-slate-800/60"
                    >
                      <td className="px-4 py-4 font-medium text-white">
                        {charge.charge_name || "-"}
                      </td>
                      <td className="px-4 py-4">
                        {charge.description || "-"}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            charge.is_active
                              ? "bg-emerald-500/15 text-emerald-100"
                              : "bg-rose-500/15 text-rose-100"
                          }`}
                        >
                          {charge.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {charge.created_at
                          ? new Date(charge.created_at).toLocaleString()
                          : "-"}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(charge)}
                            className="rounded-xl bg-amber-400 px-3 py-1.5 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setStatusTarget(charge)}
                            className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
                              charge.is_active
                                ? "bg-rose-500 text-white hover:bg-rose-400"
                                : "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                            }`}
                          >
                            {charge.is_active ? "Deactivate" : "Activate"}
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

        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
          <p className="text-sm font-semibold text-slate-200">
            Common administrative charges
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {examples.map((example) => (
              <span
                key={example}
                className="rounded-full bg-slate-950 px-3 py-1 text-sm text-slate-300"
              >
                {example}
              </span>
            ))}
          </div>
        </div>
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
          <div className="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">
                  {editingId ? "Edit Charge" : "Add Charge"}
                </p>
                <h2 className="mt-2 text-2xl font-bold text-white">
                  {editingId ? "Update administrative charge" : "Create an administrative charge"}
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
                Charge Name
                <input
                  type="text"
                  name="charge_name"
                  value={formData.charge_name}
                  onChange={handleInputChange}
                  placeholder="e.g. Board Exam In-Charge"
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
                />
              </label>

              <label className="text-sm text-slate-200">
                Description
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="4"
                  placeholder="Optional responsibility description"
                  className="mt-2 w-full resize-none rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
                />
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
                  disabled={isSaving}
                  className="rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Saving..." : editingId ? "Update Charge" : "Add Charge"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {statusTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <p className="text-sm uppercase tracking-[0.3em] text-rose-300">
              Confirm status
            </p>
            <h2 className="mt-2 text-2xl font-bold text-white">
              {statusTarget.is_active ? "Deactivate this charge?" : "Activate this charge?"}
            </h2>
            <p className="mt-3 text-sm text-slate-300">
              The charge will remain in the catalog and its status will be updated.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setStatusTarget(null)}
                className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-semibold text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStatusChange}
                disabled={isUpdatingStatus}
                className="rounded-2xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isUpdatingStatus
                  ? "Updating..."
                  : statusTarget.is_active
                  ? "Deactivate"
                  : "Activate"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}

export default AdministrativeCharges;
