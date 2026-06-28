import { useEffect, useMemo, useState } from "react";
import {
  HiOutlineAcademicCap,
  HiOutlineCalendarDays,
  HiOutlineClipboardDocumentCheck,
  HiOutlineUsers,
} from "react-icons/hi2";
import API from "../../api/axios";
import DashboardLayout from "../../layouts/DashboardLayout";
import { isTeacherLegacy } from "../../constants/roles";

const ATTENDANCE_STATUSES = ["Present", "Absent", "Leave"];
const DEFAULT_PERIOD = 1;

const getTodayDateString = () => new Date().toISOString().split("T")[0];

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");

  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
};

const decodeToken = () => {
  try {
    const token = localStorage.getItem("token");

    if (!token) {
      return {};
    }

    const [, payload] = token.split(".");
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(atob(normalized));

    return decoded || {};
  } catch (error) {
    return {};
  }
};

const isValidAttendanceStatus = (status) => {
  return ATTENDANCE_STATUSES.includes(status);
};

const getInvalidAttendanceRows = (students, attendanceByStudent) => {
  return students.filter((student) => {
    const status = attendanceByStudent[student.id];

    return !isValidAttendanceStatus(status);
  });
};

const buildDefaultAttendanceMap = (students) => {
  return students.reduce((accumulator, student) => {
    accumulator[student.id] = "Present";

    return accumulator;
  }, {});
};

function Attendance() {
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedSection, setSelectedSection] = useState("all");
  const [selectedDate, setSelectedDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [attendanceByStudent, setAttendanceByStudent] = useState({});
  const [attendanceRecordByStudent, setAttendanceRecordByStudent] = useState({});
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(true);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isLoadingExistingAttendance, setIsLoadingExistingAttendance] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [isTeacher, setIsTeacher] = useState(false);

  const availableSections = useMemo(() => {
    if (selectedClass === "all") {
      return sections;
    }

    return sections.filter((section) => section.class_name === selectedClass);
  }, [sections, selectedClass]);

  const sortedClasses = useMemo(() => {
    return [...classes].sort((left, right) => {
      const leftValue = Number(left.class_name);
      const rightValue = Number(right.class_name);

      if (Number.isNaN(leftValue) && Number.isNaN(rightValue)) {
        return String(left.class_name).localeCompare(String(right.class_name));
      }

      if (Number.isNaN(leftValue)) {
        return 1;
      }

      if (Number.isNaN(rightValue)) {
        return -1;
      }

      return leftValue - rightValue;
    });
  }, [classes]);

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesClass =
        selectedClass === "all" || String(student.student_class) === String(selectedClass);
      const matchesSection =
        selectedSection === "all" || student.section === selectedSection;

      return matchesClass && matchesSection;
    });
  }, [selectedClass, selectedSection, students]);

  const hasExactFilterSelection =
    selectedClass !== "all" && selectedSection !== "all" && Boolean(selectedDate);

  const hasExistingAttendance = Object.keys(attendanceRecordByStudent).length > 0;

  useEffect(() => {
    const payload = decodeToken();

    setIsTeacher(isTeacherLegacy(payload.role));
  }, []);

  useEffect(() => {
    if (selectedSection !== "all") {
      const hasSection = availableSections.some(
        (section) => section.section_name === selectedSection
      );

      if (!hasSection) {
        setSelectedSection("all");
      }
    }
  }, [availableSections, selectedSection]);

  useEffect(() => {
    const fetchMetadata = async () => {
      setIsLoadingMetadata(true);
      setError("");

      try {
        const [classesResponse, sectionsResponse] = await Promise.all([
          API.get("/api/classes", { headers: getAuthHeaders() }),
          API.get("/api/sections", { headers: getAuthHeaders() }),
        ]);

        const classList = Array.isArray(classesResponse?.data?.data)
          ? classesResponse.data.data
          : [];
        const sectionList = Array.isArray(sectionsResponse?.data?.data)
          ? sectionsResponse.data.data
          : [];

        setClasses(classList);
        setSections(sectionList);
      } catch (err) {
        setError(
          err?.response?.data?.message ||
            "Unable to load classes and sections right now."
        );
      } finally {
        setIsLoadingMetadata(false);
      }
    };

    const fetchStudents = async () => {
      setIsLoadingStudents(true);
      setError("");

      try {
        const firstPage = await API.get("/api/students", {
          headers: getAuthHeaders(),
          params: {
            page: 1,
            limit: 100,
            search: "",
          },
        });

        const payload = firstPage?.data?.data || {};
        const totalPages = Number(payload.totalPages || 1);
        const loadedStudents = Array.isArray(payload.students)
          ? payload.students
          : [];

        const allStudents = [...loadedStudents];

        for (let page = 2; page <= totalPages; page += 1) {
          const response = await API.get("/api/students", {
            headers: getAuthHeaders(),
            params: {
              page,
              limit: 100,
              search: "",
            },
          });

          const nestedData = response?.data?.data || {};

          if (Array.isArray(nestedData.students)) {
            allStudents.push(...nestedData.students);
          }
        }

        setStudents(allStudents);
      } catch (err) {
        setStudents([]);
        setError(
          err?.response?.data?.message ||
            "Unable to load students right now. Please try again."
        );
      } finally {
        setIsLoadingStudents(false);
      }
    };

    fetchMetadata();
    fetchStudents();
  }, []);

  useEffect(() => {
    if (!hasExactFilterSelection) {
      setAttendanceRecordByStudent({});
      setAttendanceByStudent(buildDefaultAttendanceMap(filteredStudents));
      setInfoMessage("");
      return;
    }

    if (!students.length) {
      setAttendanceRecordByStudent({});
      setAttendanceByStudent(buildDefaultAttendanceMap(filteredStudents));
      setInfoMessage("");
      return;
    }

    let isCurrentRequest = true;

    const loadExistingAttendance = async () => {
      setIsLoadingExistingAttendance(true);
      setError("");
      setSuccess("");
      setInfoMessage("");

      try {
        const response = await API.get("/api/attendance", {
          headers: getAuthHeaders(),
        });

        const records = Array.isArray(response?.data) ? response.data : [];
        const currentStudentIds = new Set(
          filteredStudents.map((student) => Number(student.id))
        );
        const nextRecordByStudent = {};

        records.forEach((record) => {
          if (record.date !== selectedDate) {
            return;
          }

          const studentId = Number(record.student_id);

          if (!currentStudentIds.has(studentId)) {
            return;
          }

          nextRecordByStudent[studentId] = {
            id: record.id,
            status: record.status,
          };
        });

        const nextAttendanceByStudent = buildDefaultAttendanceMap(filteredStudents);

        filteredStudents.forEach((student) => {
          const existingRecord = nextRecordByStudent[Number(student.id)];

          if (existingRecord) {
            nextAttendanceByStudent[student.id] = existingRecord.status;
          }
        });

        if (!isCurrentRequest) {
          return;
        }

        setAttendanceRecordByStudent(nextRecordByStudent);
        setAttendanceByStudent(nextAttendanceByStudent);

        if (Object.keys(nextRecordByStudent).length > 0) {
          setInfoMessage("Attendance already marked for this date");
        }
      } catch (err) {
        if (isCurrentRequest) {
          setError(
            err?.response?.data?.message ||
              "Unable to load saved attendance right now."
          );
        }
      } finally {
        if (isCurrentRequest) {
          setIsLoadingExistingAttendance(false);
        }
      }
    };

    loadExistingAttendance();

    return () => {
      isCurrentRequest = false;
    };
  }, [filteredStudents, hasExactFilterSelection, selectedDate, students.length]);

  const handleAttendanceChange = (studentId, status) => {
    setAttendanceByStudent((current) => ({
      ...current,
      [studentId]: status,
    }));
  };

  const handleBulkSubmit = async () => {
    setIsSubmitting(true);
    setError("");
    setSuccess("");
    setInfoMessage("");

    if (!selectedDate) {
      setError("Please choose a date before submitting attendance.");
      setIsSubmitting(false);
      return;
    }

    if (isTeacher && selectedDate !== getTodayDateString()) {
      setError("Attendance can only be marked for today's date");
      setIsSubmitting(false);
      return;
    }

    if (!hasExactFilterSelection) {
      setError("Please choose a class and section before saving attendance.");
      setIsSubmitting(false);
      return;
    }

    if (filteredStudents.length === 0) {
      setError("No students match the current class and section filters.");
      setIsSubmitting(false);
      return;
    }

    const invalidRows = getInvalidAttendanceRows(filteredStudents, attendanceByStudent);

    if (invalidRows.length > 0) {
      const names = invalidRows
        .map((student) => student.name || `Student ${student.id}`)
        .join(", ");

      setError(`Please choose a valid attendance status for: ${names}.`);
      setIsSubmitting(false);
      return;
    }

    const submissionRequests = filteredStudents.map((student) => {
      const existingRecord = attendanceRecordByStudent[Number(student.id)];
      const payload = {
        student_id: student.id,
        date: selectedDate,
        period: DEFAULT_PERIOD,
        status: attendanceByStudent[student.id],
      };

      const request = existingRecord
        ? API.put(
            `/api/attendance/${existingRecord.id}`,
            {
              status: attendanceByStudent[student.id],
            },
            {
              headers: getAuthHeaders(),
            }
          )
        : API.post("/api/attendance", payload, {
            headers: getAuthHeaders(),
          });

      return {
        studentId: student.id,
        isExisting: Boolean(existingRecord),
        request,
      };
    });

    const submissionResults = await Promise.allSettled(
      submissionRequests.map((item) => item.request)
    );
    const successCount = submissionResults.filter(
      (result) => result.status === "fulfilled"
    ).length;
    const failedResults = submissionResults.filter(
      (result) => result.status === "rejected"
    );
    const createCount = submissionRequests.filter((item, index) => {
      return !item.isExisting && submissionResults[index].status === "fulfilled";
    }).length;
    const updateCount = submissionRequests.filter((item, index) => {
      return item.isExisting && submissionResults[index].status === "fulfilled";
    }).length;

    if (failedResults.length === 0) {
      const nextRecordByStudent = { ...attendanceRecordByStudent };

      submissionResults.forEach((result, index) => {
        if (result.status !== "fulfilled") {
          return;
        }

        const recordId = result.value?.data?.id;

        if (!recordId) {
          return;
        }

        nextRecordByStudent[Number(submissionRequests[index].studentId)] = {
          id: recordId,
          status: attendanceByStudent[submissionRequests[index].studentId],
        };
      });

      setAttendanceRecordByStudent(nextRecordByStudent);
      setSuccess(
        `Attendance saved for ${successCount} student(s): ${createCount} created, ${updateCount} updated.`
      );
      setInfoMessage(
        updateCount > 0
          ? `Attendance updated for ${updateCount} student(s).`
          : `Attendance created for ${createCount} student(s).`
      );
    } else {
      const failedMessages = failedResults
        .map((result) => {
          const normalizedError =
            result.reason?.response?.data?.error ||
            result.reason?.response?.data?.message ||
            result.reason?.message ||
            "Unknown error";

          return normalizedError === "Attendance already marked"
            ? "Attendance already marked for this date"
            : normalizedError;
        })
        .join(" | ");

      setError(
        `Saved ${successCount} record(s), but ${failedResults.length} failed: ${failedMessages}`
      );
      setInfoMessage("");
    }

    setIsSubmitting(false);
  };

  const summaryCards = [
    {
      label: "Students in view",
      value: filteredStudents.length,
      icon: HiOutlineUsers,
      accent: "from-orange-500 to-orange-600",
    },
    {
      label: "Classes available",
      value: classes.length,
      icon: HiOutlineAcademicCap,
      accent: "from-orange-500 to-amber-500",
    },
    {
      label: "Sections available",
      value: availableSections.length,
      icon: HiOutlineClipboardDocumentCheck,
      accent: "from-amber-400 to-orange-500",
    },
    {
      label: "Attendance date",
      value: selectedDate,
      icon: HiOutlineCalendarDays,
      accent: "from-emerald-500 to-emerald-500",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-orange-300">
              Attendance Management
            </p>
            <h1 className="mt-3 text-4xl font-bold text-white">
              Attendance
            </h1>
            <p className="mt-2 max-w-2xl text-slate-300">
              Filter the class and section, choose a date, and mark student attendance in one place.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-sm text-slate-200">
            <p className="font-semibold text-white">Submitting for period 1</p>
            <p className="mt-1 text-slate-300">
              {hasExistingAttendance
                ? "Attendance already marked for this date"
                : "Use the bulk submit button after reviewing the attendance selections."}
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.label}
                className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4"
              >
                <div
                  className={`inline-flex rounded-full bg-gradient-to-r ${card.accent} px-3 py-1 text-xs font-semibold text-slate-950`}
                >
                  {card.label}
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-2xl font-bold text-white">{card.value}</p>
                  </div>
                  <Icon className="h-8 w-8 text-orange-200" />
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4 sm:p-6">
          <div className="grid gap-4 lg:grid-cols-4">
            <label className="text-sm font-medium text-slate-200">
              Class
              <select
                value={selectedClass}
                onChange={(event) => {
                  setSelectedClass(event.target.value);
                  setSelectedSection("all");
                }}
                className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
              >
                <option value="all">All classes</option>
                {sortedClasses.map((classItem) => (
                  <option key={classItem.id} value={classItem.class_name}>
                    {classItem.class_name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-medium text-slate-200">
              Section
              <select
                value={selectedSection}
                onChange={(event) => setSelectedSection(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
              >
                <option value="all">All sections</option>
                {availableSections.map((section) => (
                  <option key={section.id} value={section.section_name}>
                    {section.section_name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-medium text-slate-200">
              Date
              <input
                type="date"
                value={selectedDate}
                min={isTeacher ? getTodayDateString() : undefined}
                max={isTeacher ? getTodayDateString() : undefined}
                onChange={(event) => {
                  const nextDate = event.target.value;

                  if (isTeacher && nextDate !== getTodayDateString()) {
                    setError("Attendance can only be marked for today's date");
                    setSelectedDate(getTodayDateString());
                    return;
                  }

                  setError("");
                  setSelectedDate(nextDate);
                }}
                className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
              />
            </label>

            <div className="flex items-end">
              <button
                type="button"
                onClick={handleBulkSubmit}
                disabled={
                  isSubmitting ||
                  isLoadingMetadata ||
                  isLoadingStudents ||
                  isLoadingExistingAttendance
                }
                className="w-full rounded-2xl bg-orange-500 px-4 py-3 font-semibold text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting
                  ? "Saving..."
                  : hasExistingAttendance
                    ? "Save Attendance Changes"
                    : "Bulk Submit Attendance"}
              </button>
            </div>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {success}
          </div>
        ) : null}

        {infoMessage ? (
          <div className="rounded-2xl border border-orange-500/40 bg-orange-500/10 px-4 py-3 text-sm text-orange-50">
            {infoMessage}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/80">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-slate-100">
              <thead className="bg-slate-950/80 text-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">Roll number</th>
                  <th className="px-4 py-3 font-semibold">Student name</th>
                  <th className="px-4 py-3 font-semibold">Attendance status</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingStudents || isLoadingMetadata || isLoadingExistingAttendance ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index} className="border-t border-slate-800">
                      <td className="px-4 py-4">
                        <div className="h-4 w-14 animate-pulse rounded bg-slate-800" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 w-40 animate-pulse rounded bg-slate-800" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-10 w-40 animate-pulse rounded bg-slate-800" />
                      </td>
                    </tr>
                  ))
                ) : filteredStudents.length === 0 ? (
                  <tr className="border-t border-slate-800">
                    <td colSpan="3" className="px-4 py-10 text-center text-slate-300">
                      No students found for the current filters.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student, index) => (
                    <tr
                      key={student.id}
                      className="border-t border-slate-800 transition hover:bg-slate-800/60"
                    >
                      <td className="px-4 py-4 font-medium text-white">
                        {index + 1}
                      </td>
                      <td className="px-4 py-4 text-white">{student.name}</td>
                      <td className="px-4 py-4">
                        <select
                          value={attendanceByStudent[student.id] || "Present"}
                          onChange={(event) =>
                            handleAttendanceChange(student.id, event.target.value)
                          }
                          className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none transition focus:border-orange-400"
                        >
                          {ATTENDANCE_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Attendance;
