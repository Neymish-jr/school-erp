const { STATUS_TO_CLOSING_EVENT } = require("../constants/serviceHistoryEventTypes");

const toDateOnly = (value) => {
  if (!value) {
    return new Date().toISOString().split("T")[0];
  }

  return new Date(value).toISOString().split("T")[0];
};

const recordWorkflowEvent = async (db, payload) => {
  const {
    school_id,
    teacher_id,
    event_type,
    effective_date,
    event_date = effective_date,
    end_date = null,
    from_status = null,
    to_status = null,
    staff_post_id = null,
    staff_post_assignment_id = null,
    administrative_charge_id = null,
    admin_charge_assignment_id = null,
    subject_id = null,
    class_section_id = null,
    subject_assignment_id = null,
    remarks = null,
    source_workflow,
    recorded_by_user_id = null,
    metadata = {},
  } = payload;

  const effectiveDate = toDateOnly(effective_date);
  const eventDate = toDateOnly(event_date);

  await db.query(
    `
    INSERT INTO staff_service_history (
      school_id,
      teacher_id,
      event_type,
      event_date,
      effective_date,
      end_date,
      from_status,
      to_status,
      staff_post_id,
      staff_post_assignment_id,
      administrative_charge_id,
      admin_charge_assignment_id,
      subject_id,
      class_section_id,
      subject_assignment_id,
      remarks,
      recorded_by_user_id,
      source,
      source_workflow,
      metadata
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17, 'workflow', $18, $19
    )
    `,
    [
      school_id,
      teacher_id,
      event_type,
      eventDate,
      effectiveDate,
      end_date ? toDateOnly(end_date) : null,
      from_status,
      to_status,
      staff_post_id,
      staff_post_assignment_id,
      administrative_charge_id,
      admin_charge_assignment_id,
      subject_id,
      class_section_id,
      subject_assignment_id,
      remarks,
      recorded_by_user_id,
      source_workflow,
      JSON.stringify(metadata),
    ]
  );
};

const recordTeacherJoining = async (db, { school_id, teacher_id, recorded_by_user_id }) => {
  const today = toDateOnly();
  await recordWorkflowEvent(db, {
    school_id,
    teacher_id,
    event_type: "joining",
    effective_date: today,
    event_date: today,
    to_status: "active",
    source_workflow: "teacher_create",
    recorded_by_user_id,
    metadata: { origin: "teacher_create" },
  });
};

const recordTeacherStatusChange = async (
  db,
  { school_id, teacher_id, from_status, to_status, recorded_by_user_id }
) => {
  if (!from_status || !to_status || from_status === to_status) {
    return;
  }

  const today = toDateOnly();
  let event_type = null;

  if (to_status === "active" && from_status !== "active") {
    event_type = "reinstatement";
  } else {
    event_type = STATUS_TO_CLOSING_EVENT[to_status] || null;
  }

  if (!event_type) {
    return;
  }

  await recordWorkflowEvent(db, {
    school_id,
    teacher_id,
    event_type,
    effective_date: today,
    event_date: today,
    from_status,
    to_status,
    source_workflow: "teacher_update",
    recorded_by_user_id,
    metadata: { origin: "teacher_status_change" },
  });
};

const recordDesignationAssigned = async (
  db,
  {
    school_id,
    teacher_id,
    staff_post_id,
    staff_post_assignment_id,
    effective_date,
    recorded_by_user_id,
    remarks,
  }
) => {
  await recordWorkflowEvent(db, {
    school_id,
    teacher_id,
    event_type: "designation_assigned",
    effective_date,
    staff_post_id,
    staff_post_assignment_id,
    source_workflow: "staff_post_assignment",
    recorded_by_user_id,
    remarks,
  });
};

const recordDesignationRelieved = async (
  db,
  {
    school_id,
    teacher_id,
    staff_post_id,
    staff_post_assignment_id,
    effective_date,
    end_date,
    recorded_by_user_id,
    remarks,
  }
) => {
  await recordWorkflowEvent(db, {
    school_id,
    teacher_id,
    event_type: "designation_relieved",
    effective_date: end_date || effective_date,
    end_date: end_date || effective_date,
    staff_post_id,
    staff_post_assignment_id,
    source_workflow: "staff_post_assignment",
    recorded_by_user_id,
    remarks,
  });
};

const recordAdminChargeAssigned = async (
  db,
  {
    school_id,
    teacher_id,
    administrative_charge_id,
    admin_charge_assignment_id,
    effective_date,
    recorded_by_user_id,
    remarks,
  }
) => {
  await recordWorkflowEvent(db, {
    school_id,
    teacher_id,
    event_type: "admin_charge_assigned",
    effective_date,
    administrative_charge_id,
    admin_charge_assignment_id,
    source_workflow: "admin_charge_assignment",
    recorded_by_user_id,
    remarks,
  });
};

const recordAdminChargeRelieved = async (
  db,
  {
    school_id,
    teacher_id,
    administrative_charge_id,
    admin_charge_assignment_id,
    effective_date,
    recorded_by_user_id,
    remarks,
  }
) => {
  await recordWorkflowEvent(db, {
    school_id,
    teacher_id,
    event_type: "admin_charge_relieved",
    effective_date,
    administrative_charge_id,
    admin_charge_assignment_id,
    source_workflow: "admin_charge_assignment",
    recorded_by_user_id,
    remarks,
  });
};

module.exports = {
  toDateOnly,
  recordWorkflowEvent,
  recordTeacherJoining,
  recordTeacherStatusChange,
  recordDesignationAssigned,
  recordDesignationRelieved,
  recordAdminChargeAssigned,
  recordAdminChargeRelieved,
};
