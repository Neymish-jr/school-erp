const SERVICE_HISTORY_EVENT_TYPES = [
  "joining",
  "transfer_out",
  "transfer_in",
  "deputation_out",
  "deputation_in",
  "promotion",
  "designation_assigned",
  "designation_relieved",
  "admin_charge_assigned",
  "admin_charge_relieved",
  "subject_assigned",
  "subject_relieved",
  "retirement",
  "resignation",
  "reinstatement",
];

const EMPLOYMENT_EVENT_TYPES = [
  "joining",
  "transfer_out",
  "transfer_in",
  "deputation_out",
  "deputation_in",
  "retirement",
  "resignation",
  "reinstatement",
  "promotion",
];

const TRANSFER_EVENT_TYPES = [
  "transfer_out",
  "transfer_in",
  "deputation_out",
  "deputation_in",
];

const DESIGNATION_EVENT_TYPES = [
  "promotion",
  "designation_assigned",
  "designation_relieved",
];

const SERVICE_HISTORY_SOURCES = ["workflow", "manual", "migration", "system"];

const STATUS_TO_CLOSING_EVENT = {
  transferred: "transfer_out",
  retired: "retirement",
  resigned: "resignation",
  deputation: "deputation_out",
};

const EVENT_TYPE_LABELS = {
  joining: "Joined Service",
  transfer_out: "Transfer Out",
  transfer_in: "Transfer In",
  deputation_out: "Deputation Out",
  deputation_in: "Deputation Return",
  promotion: "Promotion",
  designation_assigned: "Designation Assigned",
  designation_relieved: "Designation Relieved",
  admin_charge_assigned: "Administrative Charge Assigned",
  admin_charge_relieved: "Administrative Charge Relieved",
  subject_assigned: "Subject Assigned",
  subject_relieved: "Subject Relieved",
  retirement: "Retirement",
  resignation: "Resignation",
  reinstatement: "Reinstatement",
};

const EVENT_CATEGORY_LABELS = {
  employment: "Employment",
  designation: "Designation",
  administrative: "Administrative Charge",
  teaching: "Subject Assignment",
};

const getEventCategory = (eventType) => {
  if (EMPLOYMENT_EVENT_TYPES.includes(eventType)) {
    return "employment";
  }
  if (DESIGNATION_EVENT_TYPES.includes(eventType)) {
    return "designation";
  }
  if (eventType.startsWith("admin_charge_")) {
    return "administrative";
  }
  if (eventType.startsWith("subject_")) {
    return "teaching";
  }
  return "employment";
};

module.exports = {
  SERVICE_HISTORY_EVENT_TYPES,
  EMPLOYMENT_EVENT_TYPES,
  TRANSFER_EVENT_TYPES,
  DESIGNATION_EVENT_TYPES,
  SERVICE_HISTORY_SOURCES,
  STATUS_TO_CLOSING_EVENT,
  EVENT_TYPE_LABELS,
  EVENT_CATEGORY_LABELS,
  getEventCategory,
};
