import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import API from "../../api/axios";

const emptyForm = {
  student_id: "",
  subject_id: "",
  exam_name: "",
  marks_obtained: "",
  max_marks: "",
};

function Results() {
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [search, setSearch] = useState("");
  const [selectedClass, setSelectedClass] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedExam, setSelectedExam] = useState("All");
  const [formData, setFormData] = useState(emptyForm);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");

    return token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {};
  };

  const fetchData = async () => {
    setIsLoading(true);
    setError("");

    try {
      const [studentsResponse, subjectsResponse, resultsResponse] = await Promise.all([
        API.get("/api/students", {
          headers: getAuthHeaders(),
          params: {
            page: 1,
            limit: 1000,
            search: "",
          },
        }),
        API.get("/api/subjects", {
          headers: getAuthHeaders(),
        }),
        API.get("/api/student-results", {
          headers: getAuthHeaders(),
        }),
      ]);

      const studentsPayload = studentsResponse?.data?.data || {};
      const subjectsPayload = subjectsResponse?.data?.data || [];
      const resultsPayload = resultsResponse?.data?.data || [];

      setStudents(Array.isArray(studentsPayload.students) ? studentsPayload.students : []);
      setSubjects(Array.isArray(subjectsPayload) ? subjectsPayload : []);
      setResults(Array.isArray(resultsPayload) ? resultsPayload : []);
    } catch (err) {
      setStudents([]);
      setSubjects([]);
      setResults([]);
      setError(
        err?.response?.data?.message ||
          "Unable to load student results right now. Please refresh and try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const studentOptions = useMemo(() => {
    return [...students]
      .map((student) => ({
        id: student.id,
        label: `${student.name} (${student.student_class || "Class N/A"} ${student.section || "Section N/A"})`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [students]);

  const subjectOptions = useMemo(() => {
    return [...subjects]
      .sort((a, b) => (a.subject_name || "").localeCompare(b.subject_name || ""))
      .map((subject) => ({
        id: subject.id,
        label: `${subject.subject_name} (${subject.subject_code || "N/A"})`,
      }));
  }, [subjects]);

  const classOptions = useMemo(() => {
    const options = Array.from(
      new Set(
        students
          .map((student) => String(student.student_class || "").trim())
          .filter(Boolean)
      )
    );

    return ["All", ...options.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))];
  }, [students]);

  const examOptions = useMemo(() => {
    const options = Array.from(
      new Set(results.map((result) => String(result.exam_name || "").trim()).filter(Boolean))
    );

    return ["All", ...options.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))];
  }, [results]);

  const filteredResults = useMemo(() => {
    const query = search.trim().toLowerCase();

    return results.filter((result) => {
      const matchesClass =
        selectedClass === "All" || String(result.student_class || "") === String(selectedClass);
      const matchesExam =
        selectedExam === "All" || String(result.exam_name || "").toLowerCase() === selectedExam.toLowerCase();
      const matchesStatus =
        selectedStatus === "All" || String(result.result_status || "").toLowerCase() === selectedStatus.toLowerCase();
      const matchesQuery =
        !query ||
        [result.student_name, result.subject_name, result.exam_name, result.subject_code]
          .join(" ")
          .toLowerCase()
          .includes(query);

      return matchesClass && matchesExam && matchesStatus && matchesQuery;
    });
  }, [results, search, selectedClass, selectedExam, selectedStatus]);

  const preview = useMemo(() => {
    const obtained = Number(formData.marks_obtained || 0);
    const total = Number(formData.max_marks || 0);

    if (!total) {
      return {
        percentage: 0,
        status: "Pending",
      };
    }

    const percentage = Math.max(0, Math.min(100, (obtained / total) * 100));

    return {
      percentage: Number(percentage.toFixed(2)),
      status: percentage >= 40 ? "Pass" : "Fail",
    };
  }, [formData]);

  const totalStudents = useMemo(() => {
    return new Set(filteredResults.map((result) => result.student_id)).size;
  }, [filteredResults]);

  const averagePercentage = useMemo(() => {
    if (filteredResults.length === 0) {
      return 0;
    }

    const total = filteredResults.reduce(
      (sum, result) => sum + Number(result.percentage || 0),
      0
    );

    return Number((total / filteredResults.length).toFixed(2));
  }, [filteredResults]);

  const highestScore = useMemo(() => {
    if (filteredResults.length === 0) {
      return 0;
    }

    return Math.max(...filteredResults.map((result) => Number(result.marks_obtained || 0)));
  }, [filteredResults]);

  const failedStudents = useMemo(() => {
    return new Set(
      filteredResults
        .filter((result) => String(result.result_status || "").toLowerCase() === "fail")
        .map((result) => result.student_id)
    ).size;
  }, [filteredResults]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!formData.student_id || !formData.subject_id || !formData.exam_name.trim()) {
      setError("Please select a student, subject, and enter an exam name.");
      return;
    }

    if (!formData.marks_obtained || !formData.max_marks) {
      setError("Please provide both marks obtained and maximum marks.");
      return;
    }

    const obtained = Number(formData.marks_obtained);
    const total = Number(formData.max_marks);

    if (obtained < 0 || total <= 0) {
      setError("Marks obtained must be a positive number and maximum marks must be greater than zero.");
      return;
    }

    if (obtained > total) {
      setError("Marks obtained cannot exceed maximum marks.");
      return;
    }

    setIsSaving(true);

    try {
      await API.post("/api/student-results", formData, {
        headers: getAuthHeaders(),
      });

      setSuccessMessage("Result added successfully.");
      setFormData(emptyForm);
      fetchData();
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to save the result right now.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">
              Student Results
            </p>
            <h1 className="mt-3 text-4xl font-bold text-white">
              Results & Marks
            </h1>
            <p className="mt-2 max-w-2xl text-slate-300">
              Add exam results, review performance instantly, and track pass/fail trends from one dashboard.
            </p>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-500/60 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        {successMessage ? (
          <div className="rounded-2xl border border-emerald-500/60 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {successMessage}
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Add Exam Result</h2>
                <p className="mt-1 text-sm text-slate-300">
                  Enter a student result and let the system calculate percentage and status automatically.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="block text-sm text-slate-200">
                <span className="mb-2 block">Student</span>
                <select
                  name="student_id"
                  value={formData.student_id}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none"
                >
                  <option value="">Select student</option>
                  {studentOptions.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm text-slate-200">
                <span className="mb-2 block">Subject</span>
                <select
                  name="subject_id"
                  value={formData.subject_id}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none"
                >
                  <option value="">Select subject</option>
                  {subjectOptions.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm text-slate-200 md:col-span-2">
                <span className="mb-2 block">Exam Name</span>
                <input
                  type="text"
                  name="exam_name"
                  value={formData.exam_name}
                  onChange={handleChange}
                  placeholder="Mid Term, Final Exam, Unit Test"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none"
                />
              </label>

              <label className="block text-sm text-slate-200">
                <span className="mb-2 block">Marks Obtained</span>
                <input
                  type="number"
                  min="0"
                  name="marks_obtained"
                  value={formData.marks_obtained}
                  onChange={handleChange}
                  placeholder="Example: 85"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none"
                />
              </label>

              <label className="block text-sm text-slate-200">
                <span className="mb-2 block">Maximum Marks</span>
                <input
                  type="number"
                  min="1"
                  name="max_marks"
                  value={formData.max_marks}
                  onChange={handleChange}
                  placeholder="Example: 100"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none"
                />
              </label>

              <div className="md:col-span-2 rounded-2xl border border-cyan-500/30 bg-slate-950 px-4 py-4">
                <p className="text-sm text-slate-300">Auto-calculated preview</p>
                <div className="mt-3 flex flex-wrap gap-3 text-sm">
                  <span className="rounded-full bg-cyan-500/15 px-3 py-1 text-cyan-200">
                    Percentage: {preview.percentage.toFixed(2)}%
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 ${
                      preview.status === "Pass"
                        ? "bg-emerald-500/15 text-emerald-200"
                        : "bg-rose-500/15 text-rose-200"
                    }`}
                  >
                    Status: {preview.status}
                  </span>
                </div>
              </div>

              <div className="md:col-span-2 flex items-center justify-end gap-3">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center justify-center rounded-2xl bg-cyan-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSaving ? "Saving..." : "Save Result"}
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
                <p className="text-sm text-slate-300">Students</p>
                <p className="mt-3 text-2xl font-bold text-white">{isLoading ? "..." : totalStudents}</p>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
                <p className="text-sm text-slate-300">Average %</p>
                <p className="mt-3 text-2xl font-bold text-white">{isLoading ? "..." : `${averagePercentage.toFixed(2)}%`}</p>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
                <p className="text-sm text-slate-300">Best Score</p>
                <p className="mt-3 text-2xl font-bold text-white">{isLoading ? "..." : highestScore}</p>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
                <p className="text-sm text-slate-300">Failures</p>
                <p className="mt-3 text-2xl font-bold text-white">{isLoading ? "..." : failedStudents}</p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">Filters</h2>
                  <p className="text-sm text-slate-300">Search and narrow entries quickly.</p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="block text-sm text-slate-200">
                  <span className="mb-2 block">Search</span>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Student, subject, or exam"
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none"
                  />
                </label>

                <label className="block text-sm text-slate-200">
                  <span className="mb-2 block">Class</span>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none"
                  >
                    {classOptions.map((className) => (
                      <option key={className} value={className}>
                        {className}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm text-slate-200">
                  <span className="mb-2 block">Exam</span>
                  <select
                    value={selectedExam}
                    onChange={(e) => setSelectedExam(e.target.value)}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none"
                  >
                    {examOptions.map((examName) => (
                      <option key={examName} value={examName}>
                        {examName}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm text-slate-200">
                  <span className="mb-2 block">Status</span>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none"
                  >
                    <option value="All">All</option>
                    <option value="Pass">Pass</option>
                    <option value="Fail">Fail</option>
                  </select>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Recent Results</h2>
              <p className="mt-1 text-sm text-slate-300">
                {isLoading ? "Loading latest records..." : `${filteredResults.length} result${filteredResults.length === 1 ? "" : "s"} found`}
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-700 px-4 py-10 text-center text-slate-300">
              Loading results...
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-700 px-4 py-10 text-center text-slate-300">
              No results match the current filters.
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm text-left text-slate-200">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-300">
                    <th className="px-3 py-3 font-semibold">Student</th>
                    <th className="px-3 py-3 font-semibold">Subject</th>
                    <th className="px-3 py-3 font-semibold">Exam</th>
                    <th className="px-3 py-3 font-semibold">Marks</th>
                    <th className="px-3 py-3 font-semibold">Percentage</th>
                    <th className="px-3 py-3 font-semibold">Status</th>
                    <th className="px-3 py-3 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResults.map((result) => (
                    <tr key={result.id} className="border-b border-slate-800/80">
                      <td className="px-3 py-3">
                        <div className="font-medium text-white">{result.student_name}</div>
                        <div className="text-xs text-slate-400">
                          Class {result.student_class} • Section {result.section}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-medium text-white">{result.subject_name}</div>
                        <div className="text-xs text-slate-400">{result.subject_code}</div>
                      </td>
                      <td className="px-3 py-3 text-white">{result.exam_name}</td>
                      <td className="px-3 py-3 text-white">
                        {result.marks_obtained}/{result.max_marks}
                      </td>
                      <td className="px-3 py-3 text-white">{Number(result.percentage || 0).toFixed(2)}%</td>
                      <td className="px-3 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            String(result.result_status || "").toLowerCase() === "pass"
                              ? "bg-emerald-500/15 text-emerald-200"
                              : "bg-rose-500/15 text-rose-200"
                          }`}
                        >
                          {result.result_status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-300">
                        {new Date(result.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Results;
