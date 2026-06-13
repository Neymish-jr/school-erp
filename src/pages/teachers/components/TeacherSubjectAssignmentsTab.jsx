import { useEffect, useMemo, useState } from "react";
import API from "../../../api/axios";

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString();
};

function TeacherSubjectAssignmentsTab({ teacherId }) {
  const [assignments, setAssignments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    const fetchAssignments = async () => {
      setIsLoading(true);
      setError("");

      try {
        const response = await API.get(
          `/api/teacher-subject-assignments/teacher/${teacherId}`,
          {
            headers: getAuthHeaders(),
            params: { include_history: true },
          }
        );

        setAssignments(response?.data?.data || []);
      } catch (err) {
        setAssignments([]);
        setError(
          err?.response?.data?.message ||
            "Unable to load teacher subject assignments."
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (teacherId) {
      fetchAssignments();
    }
  }, [teacherId]);

  const activeAssignments = useMemo(
    () => assignments.filter((assignment) => assignment.is_active),
    [assignments]
  );

  const historyAssignments = useMemo(
    () => assignments.filter((assignment) => !assignment.is_active),
    [assignments]
  );

  const renderTable = (rows, emptyMessage) => (
    <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/80">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm text-slate-100">
          <thead className="bg-slate-950/80 text-slate-200">
            <tr>
              <th className="px-4 py-3 font-semibold">Class</th>
              <th className="px-4 py-3 font-semibold">Section</th>
              <th className="px-4 py-3 font-semibold">Subject</th>
              <th className="px-4 py-3 font-semibold">Code</th>
              <th className="px-4 py-3 font-semibold">Start Date</th>
              <th className="px-4 py-3 font-semibold">End Date</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <tr key={index} className="border-t border-slate-800">
                  {Array.from({ length: 7 }).map((__, cellIndex) => (
                    <td key={cellIndex} className="px-4 py-4">
                      <div className="h-4 w-20 animate-pulse rounded bg-slate-800" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr className="border-t border-slate-800">
                <td colSpan="7" className="px-4 py-10 text-center text-slate-300">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((assignment) => (
                <tr
                  key={assignment.id}
                  className="border-t border-slate-800 transition hover:bg-slate-800/60"
                >
                  <td className="px-4 py-4 font-medium text-white">
                    {assignment.class_name || "-"}
                  </td>
                  <td className="px-4 py-4 font-medium text-white">
                    {assignment.section_name || "-"}
                  </td>
                  <td className="px-4 py-4">
                    {assignment.subject_name || "-"}
                  </td>
                  <td className="px-4 py-4 text-slate-400">
                    {assignment.subject_code || "-"}
                  </td>
                  <td className="px-4 py-4">
                    {formatDate(assignment.assignment_start_date)}
                  </td>
                  <td className="px-4 py-4">
                    {formatDate(assignment.assignment_end_date)}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        assignment.is_active
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-slate-700 text-slate-300"
                      }`}
                    >
                      {assignment.is_active ? "Active" : "Relieved"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <p className="text-rose-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Subject Assignments</h3>
      </div>

      <div className="space-y-3">
        <h4 className="text-base font-semibold text-white">Active Assignments</h4>
        {renderTable(activeAssignments, "No active subject assignments found.")}
      </div>

      <div className="space-y-3">
        <h4 className="text-base font-semibold text-white">Assignment History</h4>
        {renderTable(historyAssignments, "No historical subject assignments found.")}
      </div>
    </div>
  );
}

export default TeacherSubjectAssignmentsTab;
