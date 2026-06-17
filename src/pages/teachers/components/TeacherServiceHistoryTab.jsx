import { useEffect, useMemo, useState } from "react";
import API from "../../../api/axios";
import { getTeacherStatusConfig } from "./TeacherStatusBadge";

const NOT_ASSIGNED_DESIGNATION = "Not Assigned";

const formatDate = (value) => {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString();
};

const calculateYearsAndMonths = (startDate, endDate = new Date()) => {
  if (!startDate) {
    return null;
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return null;
  }

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();

  if (end.getDate() < start.getDate()) {
    months -= 1;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return { years, months };
};

const formatYearsOfService = (startDate, endDate) => {
  const duration = calculateYearsAndMonths(startDate, endDate);

  if (!duration) {
    return null;
  }

  const { years, months } = duration;
  const yearLabel = `${years} Year${years === 1 ? "" : "s"}`;
  const monthLabel = `${months} Month${months === 1 ? "" : "s"}`;

  if (years === 0) {
    return monthLabel;
  }

  if (months === 0) {
    return yearLabel;
  }

  return `${yearLabel}, ${monthLabel}`;
};

const CLOSING_EVENT_TYPES = new Set([
  "transfer_out",
  "deputation_out",
  "retirement",
  "resignation",
]);

const SERVICE_START_EVENT_TYPES = new Set([
  "joining",
  "reinstatement",
  "transfer_in",
  "deputation_in",
]);

const getJoiningDate = (timeline) => {
  const joiningEvents = timeline
    .filter((event) => event.event_type === "joining")
    .sort((a, b) => new Date(a.effective_date) - new Date(b.effective_date));

  if (joiningEvents.length > 0) {
    return joiningEvents[0].effective_date;
  }

  const serviceStartEvents = timeline
    .filter((event) => SERVICE_START_EVENT_TYPES.has(event.event_type))
    .sort((a, b) => new Date(a.effective_date) - new Date(b.effective_date));

  return serviceStartEvents[0]?.effective_date || null;
};

const getServiceEndDate = (timeline, teacherStatus) => {
  if (teacherStatus === "active" || teacherStatus === "deputation") {
    return new Date();
  }

  const closingEvents = timeline
    .filter((event) => CLOSING_EVENT_TYPES.has(event.event_type))
    .sort((a, b) => new Date(b.effective_date) - new Date(a.effective_date));

  return closingEvents[0]?.effective_date || new Date();
};

const CATEGORY_STYLES = {
  employment: "border-orange-500/40 bg-orange-500/10 text-orange-300",
  designation: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  administrative: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  teaching: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
};

function TeacherServiceHistoryTab({ teacherId }) {
  const [serviceBook, setServiceBook] = useState(null);
  const [activeResponsibilityCount, setActiveResponsibilityCount] = useState(0);
  const [currentDesignation, setCurrentDesignation] = useState(NOT_ASSIGNED_DESIGNATION);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    const fetchServiceHistoryData = async () => {
      setIsLoading(true);
      setError("");

      try {
        const headers = getAuthHeaders();
        const [serviceBookResponse, adminChargesResponse, staffPostResponse] =
          await Promise.all([
            API.get(`/api/staff-service-history/teacher/${teacherId}/service-book`, {
              headers,
            }),
            API.get(
              `/api/teacher-administrative-charge-assignments/teacher/${teacherId}`,
              { headers }
            ),
            API.get(
              `/api/teacher-staff-post-assignments/teacher/${teacherId}/current`,
              { headers }
            ),
          ]);

        console.log("[SERVICE BOOK API]", serviceBookResponse);

        console.log("[SERVICE BOOK DATA]", serviceBookResponse?.data);

        console.log(
          "[SERVICE BOOK INNER DATA]",
          serviceBookResponse?.data?.data
        );

        console.log(
          "[SERVICE BOOK TIMELINE]",
          serviceBookResponse?.data?.data?.timeline
        );

        console.log(
          "[SERVICE BOOK TIMELINE LENGTH]",
          serviceBookResponse?.data?.data?.timeline?.length ?? "missing"
        );

        setServiceBook(serviceBookResponse?.data?.data || null);

        const adminCharges = adminChargesResponse?.data?.data || [];
        setActiveResponsibilityCount(
          adminCharges.filter((assignment) => assignment.is_active).length
        );

        setCurrentDesignation(
          staffPostResponse?.data?.data?.post_name || NOT_ASSIGNED_DESIGNATION
        );
      } catch (err) {
        console.error("[ServiceHistory] fetch failed:", err);
        console.error("[ServiceHistory] response status:", err?.response?.status);
        console.error("[ServiceHistory] response body:", err?.response?.data);
        setServiceBook(null);
        setActiveResponsibilityCount(0);
        setCurrentDesignation(NOT_ASSIGNED_DESIGNATION);
        setError(
          err?.response?.data?.message ||
            "Unable to load service history. Run the backfill script if this is a new installation."
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (teacherId) {
      fetchServiceHistoryData();
    }
  }, [teacherId]);

  useEffect(() => {
    console.log("[SERVICE BOOK REACT STATE]", serviceBook);
    console.log(
      "[SERVICE BOOK REACT TIMELINE LENGTH]",
      serviceBook?.timeline?.length ?? "missing"
    );
  }, [serviceBook]);

  const timeline = serviceBook?.timeline || [];
  const teacherStatus = serviceBook?.teacher?.status || serviceBook?.tenure?.teacher_status || "active";
  const statusConfig = getTeacherStatusConfig(teacherStatus);

  const joiningDate = useMemo(() => getJoiningDate(timeline), [timeline]);
  const yearsOfService = useMemo(() => {
    if (!joiningDate) {
      return null;
    }

    return formatYearsOfService(
      joiningDate,
      getServiceEndDate(timeline, teacherStatus)
    );
  }, [joiningDate, timeline, teacherStatus]);

  const filteredTimeline = useMemo(() => {
    if (activeFilter === "all") {
      return timeline;
    }

    return timeline.filter((event) => event.category === activeFilter);
  }, [timeline, activeFilter]);

  const filterOptions = useMemo(() => {
    const categories = new Set(timeline.map((event) => event.category));
    return [
      { id: "all", label: "All Events" },
      ...Array.from(categories).map((category) => ({
        id: category,
        label: timeline.find((event) => event.category === category)?.category_label || category,
      })),
    ];
  }, [timeline]);

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <p className="text-rose-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Service History</h3>
          <p className="mt-1 text-sm text-slate-400">
            Unified timeline of employment, designation, administrative, and subject events.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-24 animate-pulse rounded-2xl border border-slate-800 bg-slate-900"
            />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-sm font-medium text-slate-400">Years of Service</p>
              <p className="mt-2 text-2xl font-bold text-white">
                {yearsOfService || "Not Available"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {joiningDate
                  ? `Since ${formatDate(joiningDate)}`
                  : "Joining date not recorded"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-sm font-medium text-slate-400">Active Responsibilities</p>
              <p className="mt-2 text-2xl font-bold text-white">
                {activeResponsibilityCount}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {activeResponsibilityCount === 1
                  ? "Administrative charge"
                  : "Administrative charges"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-sm font-medium text-slate-400">Employment Status</p>
              <p className="mt-2 text-2xl font-bold text-white">{statusConfig.label}</p>
              <p className="mt-1 text-xs text-slate-500">Current employment record</p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-sm font-medium text-slate-400">Current Designation</p>
              <p
                className={`mt-2 text-2xl font-bold ${
                  currentDesignation === NOT_ASSIGNED_DESIGNATION
                    ? "text-slate-400"
                    : "text-white"
                }`}
              >
                {currentDesignation}
              </p>
              <p className="mt-1 text-xs text-slate-500">Assigned staff post</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {filterOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setActiveFilter(option.id)}
                className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
                  activeFilter === option.id
                    ? "bg-orange-500/15 text-orange-300"
                    : "bg-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
            {filteredTimeline.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <p>No service history events found.</p>
                <p className="mt-2 text-sm text-slate-500">
                  Run{" "}
                  <code className="rounded bg-slate-800 px-1.5 py-0.5 text-xs">
                    node backend/scripts/backfillStaffServiceHistory.js
                  </code>{" "}
                  to populate history from existing records.
                </p>
              </div>
            ) : (
              <ol className="relative border-s border-slate-800">
                {filteredTimeline.map((event, index) => (
                  <li key={event.id} className="mb-8 ms-6 last:mb-0">
                    <span
                      className={`absolute -start-3 flex h-6 w-6 items-center justify-center rounded-full border bg-slate-950 text-xs font-bold ${
                        CATEGORY_STYLES[event.category] || "border-slate-700 text-slate-300"
                      }`}
                    >
                      {filteredTimeline.length - index}
                    </span>

                    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-base font-semibold text-white">
                              {event.event_type_label}
                            </h4>
                            <span
                              className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                                CATEGORY_STYLES[event.category] ||
                                "border-slate-700 text-slate-300"
                              }`}
                            >
                              {event.category_label}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-slate-300">{event.summary}</p>
                        </div>

                        <div className="text-sm text-slate-400">
                          <p>{formatDate(event.effective_date)}</p>
                          {event.end_date ? (
                            <p className="text-xs">to {formatDate(event.end_date)}</p>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-3 grid gap-2 text-sm text-slate-400 sm:grid-cols-2">
                        {event.post_name ? (
                          <p>
                            <span className="text-slate-500">Designation:</span>{" "}
                            {event.post_name}
                          </p>
                        ) : null}
                        {event.charge_name ? (
                          <p>
                            <span className="text-slate-500">Charge:</span>{" "}
                            {event.charge_name}
                          </p>
                        ) : null}
                        {event.subject_name ? (
                          <p>
                            <span className="text-slate-500">Subject:</span>{" "}
                            {event.subject_name}
                            {event.class_name
                              ? ` (${event.class_name} ${event.section_name || ""})`
                              : ""}
                          </p>
                        ) : null}
                        {event.order_number ? (
                          <p>
                            <span className="text-slate-500">Order:</span>{" "}
                            {event.order_number}
                          </p>
                        ) : null}
                        {event.remarks ? (
                          <p className="sm:col-span-2">
                            <span className="text-slate-500">Remarks:</span>{" "}
                            {event.remarks}
                          </p>
                        ) : null}
                        {event.source === "migration" ? (
                          <p className="text-xs text-slate-500 sm:col-span-2">
                            Backfilled from existing records
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default TeacherServiceHistoryTab;
