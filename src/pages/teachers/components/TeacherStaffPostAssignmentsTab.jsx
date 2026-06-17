import { useEffect, useState } from "react";
import API from "../../../api/axios";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import Modal from "../../../components/Modal";

function TeacherStaffPostAssignmentsTab({
  teacherId,
  onAssignmentsChange,
  embedded = false,
}) {
  const [assignments, setAssignments] = useState([]);
  const [currentAssignment, setCurrentAssignment] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isRelieveModalOpen, setIsRelieveModalOpen] = useState(false);
  const [vacantStaffPosts, setVacantStaffPosts] = useState([]);
  const [assignFormData, setAssignFormData] = useState({
    staff_post_id: "",
    assignment_start_date: new Date().toISOString().split("T")[0],
    remarks: "",
  });
  const [relieveFormData, setRelieveFormData] = useState({
    assignment_end_date: new Date().toISOString().split("T")[0],
  });

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchAssignments = async (refresh = false) => {
    if (!teacherId) return;
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError("");

    try {
      const response = await API.get(
        `/api/teacher-staff-post-assignments/teacher/${teacherId}`,
        {
          headers: getAuthHeaders(),
        }
      );
      const data = response?.data?.data || [];
      setAssignments(data);
      setCurrentAssignment(data.find((a) => a.is_active) || null);
      if (onAssignmentsChange) {
        onAssignmentsChange(data.find((a) => a.is_active)?.post_name || "Not Assigned");
      }
    } catch (err) {
      setAssignments([]);
      setCurrentAssignment(null);
      if (onAssignmentsChange) {
        onAssignmentsChange("Not Assigned");
      }
      setError(
        err?.response?.data?.message ||
          "Unable to load designation assignments."
      );
    } finally {
      if (refresh) setIsRefreshing(false);
      else setIsLoading(false);
    }
  };

  const fetchVacantStaffPosts = async () => {
    try {
      const response = await API.get("/api/teacher-staff-post-assignments/vacant-staff-posts", {
        headers: getAuthHeaders(),
      });
      setVacantStaffPosts(response.data.data);
    } catch (err) {
      toast.error("Failed to fetch vacant designations.");
      setVacantStaffPosts([]);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [teacherId]);

  useEffect(() => {
    if (isAssignModalOpen) {
      fetchVacantStaffPosts();
    }
  }, [isAssignModalOpen]);

  const handleAssignInputChange = (e) => {
    const { name, value } = e.target;
    setAssignFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post(
        "/api/teacher-staff-post-assignments",
        { ...assignFormData, teacher_id: teacherId },
        { headers: getAuthHeaders() }
      );
      toast.success("Designation assigned successfully!");
      setIsAssignModalOpen(false);
      fetchAssignments();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to assign designation.");
    }
  };

  const handleRelieveInputChange = (e) => {
    const { name, value } = e.target;
    setRelieveFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRelieveSubmit = async (e) => {
    e.preventDefault();
    if (!currentAssignment) return;
    try {
      await API.put(
        `/api/teacher-staff-post-assignments/${currentAssignment.id}/relieve`,
        relieveFormData,
        { headers: getAuthHeaders() }
      );
      toast.success("Designation relieved successfully!");
      setIsRelieveModalOpen(false);
      fetchAssignments();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to relieve designation.");
    }
  };

  const historyAssignments = assignments.filter((a) => !a.is_active);

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <p className="text-rose-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div
        className={`flex items-center ${embedded ? "justify-end mb-4" : "justify-between"}`}
      >
        {!embedded && (
          <h3 className="text-lg font-bold text-white">Designation Assignments</h3>
        )}
        <button
          onClick={() => setIsAssignModalOpen(true)}
          disabled={!!currentAssignment} // Disable if an active assignment exists
          className="rounded-xl bg-orange-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Icon icon="mdi:plus-circle" className="h-5 w-5 inline-block mr-1" />
          Assign Designation
        </button>
      </div>

      {isLoading ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 animate-pulse">
          <div className="h-6 w-1/2 bg-slate-700 rounded mb-4"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-4 bg-slate-700 rounded"></div>
            <div className="h-4 bg-slate-700 rounded"></div>
            <div className="h-4 bg-slate-700 rounded"></div>
            <div className="h-4 bg-slate-700 rounded"></div>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
          <h4 className="text-xl font-semibold text-white mb-4">Current Designation</h4>
          {currentAssignment ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-300">
              <div>
                <p className="text-sm font-medium text-slate-400">Designation</p>
                <p className="text-white">{currentAssignment.post_name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400">Staff Category</p>
                <p className="text-white">{currentAssignment.staff_post_category}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400">Appointment Nature</p>
                <p className="text-white">-
                  {/* TODO: Add appointment_nature to staff_posts table and fetch here */}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400">Assignment Start Date</p>
                <p className="text-white">{new Date(currentAssignment.assignment_start_date).toLocaleDateString()}</p>
              </div>
              <div className="md:col-span-2 mt-4">
                <button
                  onClick={() => setIsRelieveModalOpen(true)}
                  className="rounded-xl bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-400 transition hover:bg-rose-500 hover:text-white"
                >
                  Relieve Assignment
                </button>
              </div>
            </div>
          ) : (
            <p className="text-slate-400">Not currently assigned to a designation.</p>
          )}
        </div>
      )}

      <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
        <h4 className="text-xl font-semibold text-white mb-4">Assignment History</h4>
        {historyAssignments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-slate-100">
              <thead className="bg-slate-950/80 text-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">Designation</th>
                  <th className="px-4 py-3 font-semibold">Staff Category</th>
                  <th className="px-4 py-3 font-semibold">Start Date</th>
                  <th className="px-4 py-3 font-semibold">End Date</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {historyAssignments.map((assignment) => (
                  <tr
                    key={assignment.id}
                    className="border-t border-slate-800 transition hover:bg-slate-800/60"
                  >
                    <td className="px-4 py-4 font-medium text-white">
                      {assignment.post_name}
                    </td>
                    <td className="px-4 py-4">
                      {assignment.staff_post_category}
                    </td>
                    <td className="px-4 py-4">
                      {new Date(assignment.assignment_start_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4">
                      {assignment.assignment_end_date
                        ? new Date(assignment.assignment_end_date).toLocaleDateString()
                        : "N/A"}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          assignment.is_active
                            ? "bg-emerald-500/15 text-emerald-200"
                            : "bg-rose-500/15 text-rose-200"
                        }`}
                      >
                        {assignment.is_active ? "Active" : "Relieved"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : ( 
          <p className="text-slate-400">No past designation assignments found.</p>
        )}
      </div>

      {/* Assign Designation Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Assign Designation"
      >
        <form onSubmit={handleAssignSubmit} className="space-y-4">
          <div>
            <label htmlFor="staff_post_id" className="block text-sm font-medium text-slate-300">
              Designation <span className="text-rose-400">*</span>
            </label>
            <select
              id="staff_post_id"
              name="staff_post_id"
              value={assignFormData.staff_post_id}
              onChange={handleAssignInputChange}
              className="mt-1 block w-full p-3 border border-slate-700 rounded-md bg-slate-800 text-white"
              required
            >
              <option value="">Select a Designation</option>
              {vacantStaffPosts.map((post) => (
                <option key={post.id} value={post.id}>
                  {post.post_name} ({post.staff_category})
                </option>
              ))}
            </select>
            {vacantStaffPosts.length === 0 && ( 
              <p className="text-sm text-amber-500 mt-2">No vacant designations available. Please create one or relieve an existing assignment.</p>
            )}
          </div>
          <div>
            <label htmlFor="assignment_start_date" className="block text-sm font-medium text-slate-300">
              Assignment Start Date <span className="text-rose-400">*</span>
            </label>
            <input
              type="date"
              id="assignment_start_date"
              name="assignment_start_date"
              value={assignFormData.assignment_start_date}
              onChange={handleAssignInputChange}
              className="mt-1 block w-full p-3 border border-slate-700 rounded-md bg-slate-800 text-white"
              required
            />
          </div>
          <div>
            <label htmlFor="remarks" className="block text-sm font-medium text-slate-300">
              Remarks (Optional)
            </label>
            <textarea
              id="remarks"
              name="remarks"
              value={assignFormData.remarks}
              onChange={handleAssignInputChange}
              rows="3"
              className="mt-1 block w-full p-3 border border-slate-700 rounded-md bg-slate-800 text-white"
            ></textarea>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={() => setIsAssignModalOpen(false)}
              className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!assignFormData.staff_post_id}
              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Assign
            </button>
          </div>
        </form>
      </Modal>

      {/* Relieve Assignment Modal */}
      <Modal
        isOpen={isRelieveModalOpen}
        onClose={() => setIsRelieveModalOpen(false)}
        title="Relieve Designation Assignment"
      >
        <form onSubmit={handleRelieveSubmit} className="space-y-4">
          <p className="text-slate-300">
            You are about to relieve <strong className="text-white">{currentAssignment?.post_name}</strong> from this teacher.
            Please confirm the end date.
          </p>
          <div>
            <label htmlFor="assignment_end_date" className="block text-sm font-medium text-slate-300">
              Assignment End Date <span className="text-rose-400">*</span>
            </label>
            <input
              type="date"
              id="assignment_end_date"
              name="assignment_end_date"
              value={relieveFormData.assignment_end_date}
              onChange={handleRelieveInputChange}
              className="mt-1 block w-full p-3 border border-slate-700 rounded-md bg-slate-800 text-white"
              required
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={() => setIsRelieveModalOpen(false)}
              className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-rose-600 text-white rounded-md hover:bg-rose-700 transition-colors"
            >
              Relieve
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default TeacherStaffPostAssignmentsTab;
