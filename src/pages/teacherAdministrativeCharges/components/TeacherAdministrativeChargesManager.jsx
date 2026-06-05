import { useEffect, useMemo, useState } from "react";
import API from "../../../api/axios";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

function TeacherAdministrativeChargesManager({ teacherId = null, hideHeader = false, onAssignmentsChange }) {
  const [assignments, setAssignments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [availableCharges, setAvailableCharges] = useState([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRelieving, setIsRelieving] = useState(false);
  
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("active"); // "active" or "history"
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [relieveTarget, setRelieveTarget] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    teacher_id: teacherId || "",
    administrative_charge_id: "",
    academic_year: "2025-26",
    remarks: "",
    is_additional_charge: false,
  });

  const fetchAssignments = async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError("");

    try {
      const endpoint = teacherId 
        ? `/api/teacher-administrative-charge-assignments/teacher/${teacherId}`
        : "/api/teacher-administrative-charge-assignments";
        
      const response = await API.get(endpoint, { headers: getAuthHeaders() });
      const data = response?.data?.data || [];
      setAssignments(data);
      if (onAssignmentsChange) {
        onAssignmentsChange(data.filter(a => a.is_active).length);
      }
    } catch (err) {
      setAssignments([]);
      setError(err?.response?.data?.message || "Unable to load assignments.");
    } finally {
      if (refresh) setIsRefreshing(false);
      else setIsLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await API.get("/api/teachers", {
        headers: getAuthHeaders(),
        params: { page: 1, limit: 1000, search: "" },
      });
      setTeachers(response?.data?.data?.teachers || []);
    } catch (err) {
      console.error("Unable to load teachers.");
    }
  };

  const fetchAvailableCharges = async () => {
    try {
      const response = await API.get(`/api/teacher-administrative-charge-assignments/available-charges`, {
        headers: getAuthHeaders(),
      });
      setAvailableCharges(response?.data?.data || []);
    } catch (err) {
      setAvailableCharges([]);
    }
  };

  useEffect(() => {
    fetchAssignments();
    if (!teacherId) {
      fetchTeachers();
    }
  }, [teacherId]);

  useEffect(() => {
    if (isModalOpen) {
      fetchAvailableCharges();
    }
  }, [isModalOpen]);

  const activeAssignments = useMemo(() => assignments.filter(a => a.is_active), [assignments]);
  const historyAssignments = useMemo(() => assignments.filter(a => !a.is_active), [assignments]);

  const filteredAssignments = useMemo(() => {
    const list = activeTab === "active" ? activeAssignments : historyAssignments;
    const query = search.trim().toLowerCase();
    
    if (!query) return list;
    
    return list.filter(a => 
      (a.teacher_name || "").toLowerCase().includes(query) ||
      (a.charge_name || "").toLowerCase().includes(query) ||
      (a.academic_year || "").toLowerCase().includes(query)
    );
  }, [activeAssignments, historyAssignments, activeTab, search]);

  const openAddModal = () => {
    setFormData({
      teacher_id: teacherId || "",
      administrative_charge_id: "",
      academic_year: "2025-26",
      remarks: "",
      is_additional_charge: false,
    });
    setError("");
    setSuccessMessage("");
    setAvailableCharges([]);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.teacher_id || !formData.administrative_charge_id || !formData.academic_year) {
      setError("Please fill in all required fields.");
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      await API.post("/api/teacher-administrative-charge-assignments", {
        teacher_id: Number(formData.teacher_id),
        administrative_charge_id: Number(formData.administrative_charge_id),
        academic_year: formData.academic_year.trim(),
        remarks: formData.remarks.trim(),
        is_additional_charge: formData.is_additional_charge
      }, { headers: getAuthHeaders() });

      setSuccessMessage("Charge assigned successfully.");
      closeModal();
      await fetchAssignments();
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to assign charge.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRelieve = async () => {
    if (!relieveTarget) return;
    setIsRelieving(true);
    setError("");
    setSuccessMessage("");

    try {
      await API.put(`/api/teacher-administrative-charge-assignments/${relieveTarget.id}/relieve`, {}, {
        headers: getAuthHeaders()
      });
      setSuccessMessage("Teacher relieved from charge successfully.");
      setRelieveTarget(null);
      await fetchAssignments();
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to relieve assignment.");
    } finally {
      setIsRelieving(false);
    }
  };

  return (
    <div className="space-y-6">
      {!hideHeader && (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">
              Staff Management
            </p>
            <h1 className="mt-3 text-4xl font-bold text-white">
              Administrative Charges
            </h1>
            <p className="mt-2 max-w-2xl text-slate-300">
              Assign and track administrative responsibilities given to teachers.
            </p>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center justify-center rounded-2xl bg-cyan-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            + Assign Charge
          </button>
        </div>
      )}

      {hideHeader && (
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Administrative Charges</h2>
          <button
            type="button"
            onClick={openAddModal}
            className="rounded-xl bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            + Assign Charge
          </button>
        </div>
      )}

      {!hideHeader && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
            <p className="text-sm text-slate-300">Active Assignments</p>
            <p className="mt-2 text-2xl font-bold text-white">
              {isLoading ? "..." : activeAssignments.length}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
            <p className="text-sm text-slate-300">History (Relieved)</p>
            <p className="mt-2 text-2xl font-bold text-white">
              {isLoading ? "..." : historyAssignments.length}
            </p>
          </div>
        </div>
      )}

      <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-2 p-1 bg-slate-950 rounded-2xl w-max">
            <button
              type="button"
              onClick={() => setActiveTab("active")}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${activeTab === "active" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-200"}`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${activeTab === "history" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-200"}`}
            >
              History
            </button>
          </div>
          
          <div className="flex gap-3 items-center w-full md:w-auto">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={teacherId ? "Search charges or year" : "Search teachers, charges..."}
              className="w-full md:w-64 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-white outline-none transition focus:border-cyan-400"
            />
            <button
              type="button"
              onClick={() => fetchAssignments(true)}
              disabled={isRefreshing}
              className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-slate-500 disabled:opacity-50"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {successMessage}
        </div>
      )}

      <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/80">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-slate-100">
            <thead className="bg-slate-950/80 text-slate-200">
              <tr>
                {!teacherId && <th className="px-4 py-3 font-semibold whitespace-nowrap">Teacher</th>}
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Charge Name</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Academic Year</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Assigned On</th>
                {activeTab === "history" && <th className="px-4 py-3 font-semibold whitespace-nowrap">Relieved On</th>}
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Assigned By</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Type</th>
                {activeTab === "active" && <th className="px-4 py-3 font-semibold whitespace-nowrap">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <tr key={index} className="border-t border-slate-800">
                    <td colSpan={teacherId ? (activeTab === "active" ? 6 : 6) : (activeTab === "active" ? 7 : 7)} className="px-4 py-4">
                      <div className="h-4 w-full animate-pulse rounded bg-slate-800" />
                    </td>
                  </tr>
                ))
              ) : filteredAssignments.length === 0 ? (
                <tr className="border-t border-slate-800">
                  <td colSpan={teacherId ? (activeTab === "active" ? 6 : 6) : (activeTab === "active" ? 7 : 7)} className="px-4 py-10 text-center text-slate-300">
                    No {activeTab} assignments found.
                  </td>
                </tr>
              ) : (
                filteredAssignments.map((a) => (
                  <tr key={a.id} className="border-t border-slate-800 transition hover:bg-slate-800/60">
                    {!teacherId && (
                      <td className="px-4 py-4 font-medium text-white whitespace-nowrap">
                        {a.teacher_name}
                      </td>
                    )}
                    <td className="px-4 py-4 font-medium text-cyan-100">
                      {a.charge_name}
                      {a.remarks && <p className="text-xs text-slate-400 mt-1 font-normal line-clamp-1">{a.remarks}</p>}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">{a.academic_year}</td>
                    <td className="px-4 py-4 whitespace-nowrap">{new Date(a.assigned_on).toLocaleDateString()}</td>
                    {activeTab === "history" && (
                      <td className="px-4 py-4 whitespace-nowrap">{a.relieved_on ? new Date(a.relieved_on).toLocaleDateString() : "-"}</td>
                    )}
                    <td className="px-4 py-4 whitespace-nowrap text-slate-400">{a.assigned_by_user_name || "System"}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${a.is_additional_charge ? "bg-purple-500/15 text-purple-200" : "bg-blue-500/15 text-blue-200"}`}>
                        {a.is_additional_charge ? "Additional" : "Primary"}
                      </span>
                    </td>
                    {activeTab === "active" && (
                      <td className="px-4 py-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setRelieveTarget(a)}
                          className="rounded-xl bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-400 transition hover:bg-rose-500 hover:text-white"
                        >
                          Relieve
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
          <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h2 className="text-2xl font-bold text-white">Assign Administrative Charge</h2>
            <p className="mt-2 text-sm text-slate-300">Assign a new responsibility to a teacher.</p>
            
            <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
              {!teacherId && (
                <label className="text-sm text-slate-200">
                  Teacher <span className="text-rose-400">*</span>
                  <select
                    name="teacher_id"
                    value={formData.teacher_id}
                    onChange={handleInputChange}
                    required
                    className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
                  >
                    <option value="">Select teacher</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.teacher_name}</option>
                    ))}
                  </select>
                </label>
              )}

              <label className="text-sm text-slate-200">
                Administrative Charge <span className="text-rose-400">*</span>
                <select
                  name="administrative_charge_id"
                  value={formData.administrative_charge_id}
                  onChange={handleInputChange}
                  required
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
                >
                  <option value="">Select available charge</option>
                  {availableCharges.map(c => (
                    <option key={c.id} value={c.id}>{c.charge_name}</option>
                  ))}
                </select>
                {availableCharges.length === 0 && <p className="text-xs text-amber-400 mt-1">No unassigned charges available.</p>}
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm text-slate-200">
                  Academic Year <span className="text-rose-400">*</span>
                  <input
                    type="text"
                    name="academic_year"
                    value={formData.academic_year}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g. 2025-26"
                    className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
                  />
                </label>
              </div>

              <label className="text-sm text-slate-200">
                Remarks (Optional)
                <input
                  type="text"
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleInputChange}
                  placeholder="Additional details..."
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
                />
              </label>

              <label className="flex items-center gap-3 text-sm text-slate-200 mt-2 cursor-pointer w-max">
                <input
                  type="checkbox"
                  name="is_additional_charge"
                  checked={formData.is_additional_charge}
                  onChange={handleInputChange}
                  className="w-5 h-5 accent-cyan-500 rounded bg-slate-950 border-slate-700"
                />
                This is an additional charge
              </label>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-2xl border border-slate-700 px-4 py-3 text-sm font-semibold text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !formData.teacher_id || !formData.administrative_charge_id}
                  className="rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Saving..." : "Assign Charge"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {relieveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <p className="text-sm uppercase tracking-[0.3em] text-rose-300">Confirm Action</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Relieve Assignment?</h2>
            <p className="mt-3 text-sm text-slate-300">
              Are you sure you want to relieve <strong className="text-white">{relieveTarget.teacher_name}</strong> from the <strong className="text-white">{relieveTarget.charge_name}</strong> charge? This will move it to History.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setRelieveTarget(null)}
                className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-semibold text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRelieve}
                disabled={isRelieving}
                className="rounded-2xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:opacity-60"
              >
                {isRelieving ? "Relieving..." : "Relieve Teacher"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TeacherAdministrativeChargesManager;