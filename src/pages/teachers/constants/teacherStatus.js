export const ACTIVE_STAFF_STATUS = "active";
export const STATUS_FILTER_ALL = "all";

export const TEACHER_STATUS_FILTER_OPTIONS = [
  { value: ACTIVE_STAFF_STATUS, label: "Active" },
  { value: "deputation", label: "Deputation" },
  { value: "transferred", label: "Transferred" },
  { value: "retired", label: "Retired" },
  { value: "resigned", label: "Resigned" },
  { value: STATUS_FILTER_ALL, label: "All Staff" },
];

export const FORMER_STAFF_STATUSES = [
  "deputation",
  "transferred",
  "retired",
  "resigned",
];

export const isActiveStaffTeacher = (teacher) =>
  (teacher?.status || ACTIVE_STAFF_STATUS) === ACTIVE_STAFF_STATUS;

export const isFormerStaffTeacher = (teacher) =>
  FORMER_STAFF_STATUSES.includes(teacher?.status);
