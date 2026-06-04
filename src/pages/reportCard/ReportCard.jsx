import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import API from "../../api/axios";

const examOrder = [
  "Unit Test 1",
  "Unit Test 2",
  "Unit Test 3",
  "Unit Test 4",
  "Half Yearly",
  "Pre Board 1",
  "Pre Board 2",
  "Final Exam",
];

const getExamSortValue = (examName) => {
  const index = examOrder.indexOf(examName);

  if (index === -1) {
    return examOrder.length + 1;
  }

  return index;
};

function ReportCard() {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [reportCard, setReportCard] = useState(null);
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [error, setError] = useState("");

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");

    return token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {};
  };

  const fetchStudents = async () => {
    setIsLoadingStudents(true);
    setError("");

    try {
      const response = await API.get("/api/students", {
        headers: getAuthHeaders(),
        params: {
          page: 1,
          limit: 1000,
          search: "",
        },
      });

      const payload = response?.data?.data || {};
      const studentList = Array.isArray(payload.students) ? payload.students : [];

      setStudents(studentList);
    } catch (err) {
      setStudents([]);
      setError(err?.response?.data?.message || "Unable to load students right now.");
    } finally {
      setIsLoadingStudents(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    if (!selectedStudent) {
      setReportCard(null);
      return;
    }

    let isActive = true;

    const fetchReportCard = async () => {
      setIsLoadingReport(true);
      setError("");

      try {
        const response = await API.get(`/api/report-card/${selectedStudent}`, {
          headers: getAuthHeaders(),
        });

        if (!isActive) {
          return;
        }

        setReportCard(response?.data?.data || null);
      } catch (err) {
        if (!isActive) {
          return;
        }

        setReportCard(null);
        setError(err?.response?.data?.message || "Unable to load the report card right now.");
      } finally {
        if (isActive) {
          setIsLoadingReport(false);
        }
      }
    };

    fetchReportCard();

    return () => {
      isActive = false;
    };
  }, [selectedStudent]);

  const sortedStudents = useMemo(() => {
    return [...students].sort((first, second) =>
      (first.name || "").localeCompare(second.name || "")
    );
  }, [students]);

  const examGroups = useMemo(() => {
    if (!reportCard?.exam_groups) {
      return [];
    }

    return [...reportCard.exam_groups].sort(
      (first, second) => getExamSortValue(first.exam_name) - getExamSortValue(second.exam_name)
    );
  }, [reportCard]);

  const hasReportData = examGroups.length > 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">
              Student Report Card
            </p>
            <h1 className="mt-3 text-4xl font-bold text-white">
              Report Card
            </h1>
            <p className="mt-2 max-w-2xl text-slate-300">
              Select a student to inspect exam-wise performance, subject totals, and the overall grade summary.
            </p>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-500/60 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
          <div className="grid gap-4 lg:grid-cols-[1fr,2fr] lg:items-end">
            <label className="block text-sm text-slate-200">
              <span className="mb-2 block">Select Student</span>
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none"
              >
                <option value="">Choose a student</option>
                {sortedStudents.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name} • Class {student.student_class} • Section {student.section}
                  </option>
                ))}
              </select>
            </label>

            <div className="rounded-2xl border border-cyan-500/30 bg-slate-950/70 px-4 py-4">
              <p className="text-sm text-slate-300">Overview</p>
              <p className="mt-2 text-sm text-slate-200">
                {selectedStudent
                  ? "The report card refreshes automatically when a student is selected."
                  : "Select a student to load the report card details."}
              </p>
            </div>
          </div>
        </div>

        {isLoadingReport ? (
          <div className="rounded-3xl border border-dashed border-slate-700 px-4 py-10 text-center text-slate-300">
            Loading report card...
          </div>
        ) : !selectedStudent ? (
          <div className="rounded-3xl border border-dashed border-slate-700 px-4 py-10 text-center text-slate-300">
            Select a student to view the report card.
          </div>
        ) : !hasReportData ? (
          <div className="rounded-3xl border border-dashed border-slate-700 px-4 py-10 text-center text-slate-300">
            No report card data found
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 xl:grid-cols-[1.1fr,1.1fr,1.1fr,1.1fr,1.1fr]">
              <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
                <p className="text-sm text-slate-300">Student</p>
                <p className="mt-3 text-lg font-semibold text-white">{reportCard.student.name}</p>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
                <p className="text-sm text-slate-300">Class</p>
                <p className="mt-3 text-lg font-semibold text-white">{reportCard.student.student_class}</p>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
                <p className="text-sm text-slate-300">Section</p>
                <p className="mt-3 text-lg font-semibold text-white">{reportCard.student.section}</p>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
                <p className="text-sm text-slate-300">Roll Number</p>
                <p className="mt-3 text-lg font-semibold text-white">{reportCard.student.roll_number}</p>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
                <p className="text-sm text-slate-300">Status</p>
                <p className="mt-3 text-lg font-semibold text-white">{reportCard.summary.status}</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
                <p className="text-sm text-slate-300">Total Marks</p>
                <p className="mt-3 text-2xl font-bold text-white">{reportCard.summary.total_marks}</p>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
                <p className="text-sm text-slate-300">Obtained Marks</p>
                <p className="mt-3 text-2xl font-bold text-white">{reportCard.summary.obtained_marks}</p>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
                <p className="text-sm text-slate-300">Percentage</p>
                <p className="mt-3 text-2xl font-bold text-white">{reportCard.summary.percentage.toFixed(2)}%</p>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
                <p className="text-sm text-slate-300">Grade</p>
                <p className="mt-3 text-2xl font-bold text-white">{reportCard.summary.grade}</p>
              </div>
            </div>

            {examGroups.map((examGroup) => (
              <div
                key={examGroup.exam_name}
                className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-white">{examGroup.exam_name}</h2>
                    <p className="mt-1 text-sm text-slate-300">
                      {examGroup.obtained_marks}/{examGroup.total_marks} marks • {examGroup.percentage.toFixed(2)}% • {examGroup.grade}
                    </p>
                  </div>

                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
                      examGroup.status === "Pass"
                        ? "bg-emerald-500/15 text-emerald-200"
                        : "bg-rose-500/15 text-rose-200"
                    }`}
                  >
                    {examGroup.status}
                  </span>
                </div>

                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-sm text-left text-slate-200">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-300">
                        <th className="px-3 py-3 font-semibold">Subject</th>
                        <th className="px-3 py-3 font-semibold">Code</th>
                        <th className="px-3 py-3 font-semibold">Marks</th>
                        <th className="px-3 py-3 font-semibold">Percentage</th>
                        <th className="px-3 py-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {examGroup.subjects.map((subject) => (
                        <tr key={`${examGroup.exam_name}-${subject.subject_id}`} className="border-b border-slate-800/80">
                          <td className="px-3 py-3 text-white">{subject.subject_name}</td>
                          <td className="px-3 py-3 text-slate-300">{subject.subject_code}</td>
                          <td className="px-3 py-3 text-white">
                            {subject.marks_obtained}/{subject.max_marks}
                          </td>
                          <td className="px-3 py-3 text-white">{subject.percentage.toFixed(2)}%</td>
                          <td className="px-3 py-3">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                subject.status === "Pass"
                                  ? "bg-emerald-500/15 text-emerald-200"
                                  : "bg-rose-500/15 text-rose-200"
                              }`}
                            >
                              {subject.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default ReportCard;
