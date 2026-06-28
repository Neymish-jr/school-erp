const ACTIVITY_STATUS = {
  DRAFT: "draft",
  SUBMITTED: "submitted",
  APPROVED: "approved",
  REJECTED: "rejected",
  COMPLETED: "completed",
};

const ACTIVITY_STATUS_VALUES = Object.values(ACTIVITY_STATUS);

const LEGACY_ACTIVITY_STATUS_MAP = {
  Pending: ACTIVITY_STATUS.SUBMITTED,
  Approved: ACTIVITY_STATUS.APPROVED,
  Rejected: ACTIVITY_STATUS.REJECTED,
  Completed: ACTIVITY_STATUS.COMPLETED,
};

const ALLOCATED_ACTIVITY_STATUSES = [
  ACTIVITY_STATUS.SUBMITTED,
  ACTIVITY_STATUS.APPROVED,
  ACTIVITY_STATUS.COMPLETED,
];

const normalizeActivityStatus = (status) => {
  if (!status) {
    return status;
  }

  if (ACTIVITY_STATUS_VALUES.includes(status)) {
    return status;
  }

  return LEGACY_ACTIVITY_STATUS_MAP[status] || status;
};

module.exports = {
  ACTIVITY_STATUS,
  ACTIVITY_STATUS_VALUES,
  LEGACY_ACTIVITY_STATUS_MAP,
  ALLOCATED_ACTIVITY_STATUSES,
  normalizeActivityStatus,
};
