import { useEffect, useState } from "react";
import API from "../../../api/axios";

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

      <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/80">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-slate-100">
            <thead className="bg-slate-950/80 text-slate-200">
              <tr>
                <th className="px-4 py-3 font-semibold">Class</th>
                <th className="px-4 py-3 font-semibold">Section</th>
                <th className="px-4 py-3 font-semibold">Subject</th>
                <th className="px-4 py-3 font-semibold">Code</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <tr key={index} className="border-t border-slate-800">
                    <td className="px-4 py-4">
                      <div className="h-4 w-20 animate-pulse rounded bg-slate-800" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 w-12 animate-pulse rounded bg-slate-800" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 w-32 animate-pulse rounded bg-slate-800" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 w-16 animate-pulse rounded bg-slate-800" />
                    </td>
                  </tr>
                ))
              ) : assignments.length === 0 ? (
                <tr className="border-t border-slate-800">
                  <td colSpan="4" className="px-4 py-10 text-center text-slate-300">
                    No active subject assignments found.
                  </td>
                </tr>
              ) : (
                assignments.map((assignment) => (
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default TeacherSubjectAssignmentsTab;