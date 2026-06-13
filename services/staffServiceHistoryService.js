const {
  TRANSFER_EVENT_TYPES,
  DESIGNATION_EVENT_TYPES,
  EVENT_TYPE_LABELS,
  EVENT_CATEGORY_LABELS,
  getEventCategory,
} = require("../constants/serviceHistoryEventTypes");

const getBaseHistoryQuery = () => `
  SELECT
    ssh.id,
    ssh.school_id,
    ssh.teacher_id,
    t.teacher_name,
    ssh.event_type,
    ssh.event_date,
    ssh.effective_date,
    ssh.end_date,
    ssh.from_status,
    ssh.to_status,
    ssh.staff_post_id,
    sp.post_name,
    sp.post_code,
    ssh.staff_post_assignment_id,
    ssh.administrative_charge_id,
    ac.charge_name,
    ssh.admin_charge_assignment_id,
    ssh.subject_id,
    s.subject_name,
    s.subject_code,
    ssh.class_section_id,
    cs.class_name,
    cs.section_name,
    ssh.subject_assignment_id,
    ssh.from_school_id,
    fs.school_name AS from_school_name,
    ssh.to_school_id,
    ts.school_name AS to_school_name,
    ssh.deputation_organisation,
    ssh.order_number,
    ssh.order_date,
    ssh.remarks,
    ssh.recorded_by_user_id,
    u.name AS recorded_by_user_name,
    ssh.source,
    ssh.source_workflow,
    ssh.related_event_id,
    ssh.supersedes_event_id,
    ssh.metadata,
    ssh.created_at
  FROM staff_service_history ssh
  JOIN teachers t ON t.id = ssh.teacher_id
  LEFT JOIN staff_posts sp ON sp.id = ssh.staff_post_id
  LEFT JOIN administrative_charges ac ON ac.id = ssh.administrative_charge_id
  LEFT JOIN subjects s ON s.id = ssh.subject_id
  LEFT JOIN class_sections cs ON cs.id = ssh.class_section_id
  LEFT JOIN schools fs ON fs.id = ssh.from_school_id
  LEFT JOIN schools ts ON ts.id = ssh.to_school_id
  LEFT JOIN users u ON u.id = ssh.recorded_by_user_id
`;

const formatHistoryRow = (row) => {
  const category = getEventCategory(row.event_type);

  return {
    ...row,
    event_type_label: EVENT_TYPE_LABELS[row.event_type] || row.event_type,
    category,
    category_label: EVENT_CATEGORY_LABELS[category] || category,
    summary: buildEventSummary(row),
  };
};

const buildEventSummary = (row) => {
  switch (row.event_type) {
    case "joining":
      return "Joined the school";
    case "transfer_out":
      return row.to_school_name
        ? `Transferred to ${row.to_school_name}`
        : "Transferred out";
    case "transfer_in":
      return row.from_school_name
        ? `Transferred from ${row.from_school_name}`
        : "Transferred in";
    case "deputation_out":
      return row.deputation_organisation
        ? `Deputed to ${row.deputation_organisation}`
        : "Deputed out";
    case "deputation_in":
      return "Returned from deputation";
    case "promotion":
      return row.post_name ? `Promoted to ${row.post_name}` : "Promotion recorded";
    case "designation_assigned":
      return row.post_name ? `Assigned as ${row.post_name}` : "Designation assigned";
    case "designation_relieved":
      return row.post_name ? `Relieved from ${row.post_name}` : "Designation relieved";
    case "admin_charge_assigned":
      return row.charge_name
        ? `Assigned ${row.charge_name}`
        : "Administrative charge assigned";
    case "admin_charge_relieved":
      return row.charge_name
        ? `Relieved from ${row.charge_name}`
        : "Administrative charge relieved";
    case "subject_assigned": {
      const classLabel = [row.class_name, row.section_name].filter(Boolean).join(" ");
      const subjectLabel = row.subject_name || "subject";
      return classLabel
        ? `Assigned ${subjectLabel} for ${classLabel}`
        : `Assigned ${subjectLabel}`;
    }
    case "subject_relieved": {
      const classLabel = [row.class_name, row.section_name].filter(Boolean).join(" ");
      const subjectLabel = row.subject_name || "subject";
      return classLabel
        ? `Relieved from ${subjectLabel} (${classLabel})`
        : `Relieved from ${subjectLabel}`;
    }
    case "retirement":
      return "Retired from service";
    case "resignation":
      return "Resigned from service";
    case "reinstatement":
      return "Reinstated to active service";
    default:
      return EVENT_TYPE_LABELS[row.event_type] || row.event_type;
  }
};

const buildTimelineQuery = ({ schoolId, teacherId = null, filters = {} }) => {
  const params = [schoolId];
  let query = `${getBaseHistoryQuery()} WHERE ssh.school_id = $1`;
  const conditions = [];

  if (teacherId !== null) {
    params.push(teacherId);
    conditions.push(`ssh.teacher_id = $${params.length}`);
  }

  if (filters.event_type) {
    params.push(filters.event_type);
    conditions.push(`ssh.event_type = $${params.length}`);
  }

  if (Array.isArray(filters.event_types) && filters.event_types.length > 0) {
    params.push(filters.event_types);
    conditions.push(`ssh.event_type = ANY($${params.length})`);
  }

  if (filters.from_date) {
    params.push(filters.from_date);
    conditions.push(`ssh.effective_date >= $${params.length}`);
  }

  if (filters.to_date) {
    params.push(filters.to_date);
    conditions.push(`ssh.effective_date <= $${params.length}`);
  }

  if (conditions.length > 0) {
    query += ` AND ${conditions.join(" AND ")}`;
  }

  query += ` ORDER BY ssh.effective_date DESC, ssh.id DESC`;

  return { query, params };
};

const groupServiceBook = (events) => {
  const sections = {
    employment: [],
    designation: [],
    administrative: [],
    teaching: [],
  };

  events.forEach((event) => {
    const category = event.category || getEventCategory(event.event_type);
    if (sections[category]) {
      sections[category].push(event);
    }
  });

  return {
    timeline: events,
    sections: [
      { key: "employment", label: EVENT_CATEGORY_LABELS.employment, events: sections.employment },
      { key: "designation", label: EVENT_CATEGORY_LABELS.designation, events: sections.designation },
      {
        key: "administrative",
        label: EVENT_CATEGORY_LABELS.administrative,
        events: sections.administrative,
      },
      { key: "teaching", label: EVENT_CATEGORY_LABELS.teaching, events: sections.teaching },
    ].filter((section) => section.events.length > 0),
  };
};

const calculateTenure = (events, teacher = {}) => {
  const sorted = [...events].sort(
    (a, b) => new Date(a.effective_date) - new Date(b.effective_date)
  );

  const joiningEvents = sorted.filter((event) =>
    ["joining", "reinstatement", "transfer_in", "deputation_in"].includes(event.event_type)
  );
  const closingEvents = sorted.filter((event) =>
    ["transfer_out", "deputation_out", "retirement", "resignation"].includes(event.event_type)
  );

  const latestOpening = joiningEvents[joiningEvents.length - 1] || null;
  const latestClosing = closingEvents[closingEvents.length - 1] || null;

  const isCurrentlyActive = (teacher.status || "active") === "active";
  const tenureStartDate = latestOpening?.effective_date || null;
  const tenureEndDate = isCurrentlyActive ? null : latestClosing?.effective_date || null;

  const msPerDay = 1000 * 60 * 60 * 24;
  let currentTenureDays = 0;

  if (tenureStartDate) {
    const end = tenureEndDate ? new Date(tenureEndDate) : new Date();
    currentTenureDays = Math.max(
      0,
      Math.floor((end - new Date(tenureStartDate)) / msPerDay)
    );
  }

  return {
    teacher_id: teacher.id || null,
    teacher_status: teacher.status || "active",
    tenure_start_date: tenureStartDate,
    tenure_end_date: tenureEndDate,
    is_currently_active: isCurrentlyActive,
    current_tenure_days: currentTenureDays,
    opening_event_type: latestOpening?.event_type || null,
    closing_event_type: latestClosing?.event_type || null,
    transfer_event_count: sorted.filter((event) =>
      TRANSFER_EVENT_TYPES.includes(event.event_type)
    ).length,
    designation_event_count: sorted.filter((event) =>
      DESIGNATION_EVENT_TYPES.includes(event.event_type)
    ).length,
  };
};

const verifyTeacherInSchool = async (pool, teacherId, schoolId) => {
  const result = await pool.query(
    "SELECT id, teacher_name, status, school_id FROM teachers WHERE id = $1 AND school_id = $2",
    [teacherId, schoolId]
  );

  return result.rows[0] || null;
};

module.exports = {
  getBaseHistoryQuery,
  formatHistoryRow,
  buildTimelineQuery,
  groupServiceBook,
  calculateTenure,
  verifyTeacherInSchool,
};
