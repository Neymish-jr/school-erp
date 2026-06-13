const ACTIVE_STAFF_STATUS = "active";

// Government-school staffing lifecycle statuses.
// inactive was removed; use deputation/transferred/retired/resigned for former staff.
const TEACHER_STATUSES = [
  "active",
  "transferred",
  "retired",
  "resigned",
  "deputation",
];

const NON_ACTIVE_STAFF_STATUSES = TEACHER_STATUSES.filter(
  (status) => status !== ACTIVE_STAFF_STATUS
);

const isActiveStaffStatus = (status) =>
  (status || ACTIVE_STAFF_STATUS) === ACTIVE_STAFF_STATUS;

const isAssignableTeacherStatus = (status) => isActiveStaffStatus(status);

module.exports = {
  ACTIVE_STAFF_STATUS,
  TEACHER_STATUSES,
  NON_ACTIVE_STAFF_STATUSES,
  isActiveStaffStatus,
  isAssignableTeacherStatus,
};
