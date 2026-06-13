#!/usr/bin/env node
/**
 * Backfill staff_service_history from existing operational data.
 *
 * Usage:
 *   node backend/scripts/backfillStaffServiceHistory.js
 *   node backend/scripts/backfillStaffServiceHistory.js --school-id=1
 *   node backend/scripts/backfillStaffServiceHistory.js --dry-run
 *
 * Idempotent: skips rows already backfilled via migration metadata dedup key.
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const pool = require("../db");
const { STATUS_TO_CLOSING_EVENT } = require("../constants/serviceHistoryEventTypes");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const schoolIdArg = args.find((arg) => arg.startsWith("--school-id="));
const schoolIdFilter = schoolIdArg ? Number(schoolIdArg.split("=")[1]) : null;

const stats = {
  inserted: 0,
  skipped: 0,
  errors: 0,
};

const toDateOnly = (value) => {
  if (!value) {
    return new Date().toISOString().split("T")[0];
  }

  return new Date(value).toISOString().split("T")[0];
};

const migrationEventExists = async (client, sourceWorkflow, sourceRecordId, eventType) => {
  const result = await client.query(
    `
    SELECT id
    FROM staff_service_history
    WHERE source = 'migration'
      AND source_workflow = $1
      AND metadata->>'source_record_id' = $2
      AND event_type = $3
    LIMIT 1
    `,
    [sourceWorkflow, String(sourceRecordId), eventType]
  );

  return result.rowCount > 0;
};

const insertMigrationEvent = async (client, payload) => {
  const {
    school_id,
    teacher_id,
    event_type,
    event_date,
    effective_date,
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
    source_record_id,
    metadata = {},
  } = payload;

  const exists = await migrationEventExists(
    client,
    source_workflow,
    source_record_id,
    event_type
  );

  if (exists) {
    stats.skipped += 1;
    return null;
  }

  if (dryRun) {
    stats.inserted += 1;
    return { dryRun: true, event_type, teacher_id, source_record_id };
  }

  const result = await client.query(
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
      source,
      source_workflow,
      metadata
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, 'migration', $17, $18
    )
    RETURNING id
    `,
    [
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
      source_workflow,
      JSON.stringify({
        source_record_id: String(source_record_id),
        ...metadata,
      }),
    ]
  );

  stats.inserted += 1;
  return result.rows[0];
};

const getTableColumns = async (client, tableName) => {
  const result = await client.query(
    `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = $1
    `,
    [tableName]
  );

  return new Set(result.rows.map((row) => row.column_name));
};

const backfillJoiningEvents = async (client) => {
  const teacherColumns = await getTableColumns(client, "teachers");
  const hasCreatedAt = teacherColumns.has("created_at");

  let query = `
    SELECT id, school_id, status
    ${hasCreatedAt ? ", created_at" : ""}
    FROM teachers
  `;
  const params = [];

  if (schoolIdFilter) {
    query += " WHERE school_id = $1";
    params.push(schoolIdFilter);
  }

  const teachers = await client.query(query, params);

  for (const teacher of teachers.rows) {
    const effectiveDate = hasCreatedAt
      ? toDateOnly(teacher.created_at)
      : toDateOnly(new Date());

    await insertMigrationEvent(client, {
      school_id: teacher.school_id,
      teacher_id: teacher.id,
      event_type: "joining",
      event_date: effectiveDate,
      effective_date: effectiveDate,
      to_status: "active",
      source_workflow: "teacher_joining",
      source_record_id: teacher.id,
      remarks: "Backfilled from teacher record",
      metadata: { backfill_origin: "teachers" },
    });
  }
};

const backfillClosingEvents = async (client) => {
  const teacherColumns = await getTableColumns(client, "teachers");
  const hasCreatedAt = teacherColumns.has("created_at");

  let query = `
    SELECT id, school_id, status
    ${hasCreatedAt ? ", created_at" : ""}
    FROM teachers
    WHERE status <> 'active'
  `;
  const params = [];

  if (schoolIdFilter) {
    query += " AND school_id = $1";
    params.push(schoolIdFilter);
  }

  const teachers = await client.query(query, params);

  for (const teacher of teachers.rows) {
    const eventType = STATUS_TO_CLOSING_EVENT[teacher.status];
    if (!eventType) {
      continue;
    }

    const effectiveDate = hasCreatedAt
      ? toDateOnly(teacher.created_at)
      : toDateOnly(new Date());

    await insertMigrationEvent(client, {
      school_id: teacher.school_id,
      teacher_id: teacher.id,
      event_type: eventType,
      event_date: effectiveDate,
      effective_date: effectiveDate,
      from_status: "active",
      to_status: teacher.status,
      source_workflow: "teacher_status_snapshot",
      source_record_id: `${teacher.id}:${teacher.status}`,
      remarks: `Backfilled from current teacher status (${teacher.status})`,
      metadata: { backfill_origin: "teachers.status" },
    });
  }
};

const backfillStaffPostAssignments = async (client) => {
  const columns = await getTableColumns(client, "teacher_staff_post_assignments");
  if (columns.size === 0) {
    return;
  }

  const startCol = columns.has("assignment_start_date")
    ? "assignment_start_date"
    : "assigned_date";
  const endCol = columns.has("assignment_end_date") ? "assignment_end_date" : "end_date";
  const hasSchoolId = columns.has("school_id");

  let query = `
    SELECT
      tspa.id,
      tspa.teacher_id,
      tspa.staff_post_id,
      tspa.is_active,
      tspa.remarks,
      tspa.${startCol} AS assignment_start_date,
      tspa.${endCol} AS assignment_end_date,
      ${hasSchoolId ? "tspa.school_id" : "t.school_id AS school_id"}
    FROM teacher_staff_post_assignments tspa
    JOIN teachers t ON t.id = tspa.teacher_id
  `;
  const params = [];

  if (schoolIdFilter) {
    query += hasSchoolId ? " WHERE tspa.school_id = $1" : " WHERE t.school_id = $1";
    params.push(schoolIdFilter);
  }

  const assignments = await client.query(query, params);

  for (const row of assignments.rows) {
    const startDate = toDateOnly(row.assignment_start_date);

    await insertMigrationEvent(client, {
      school_id: row.school_id,
      teacher_id: row.teacher_id,
      event_type: "designation_assigned",
      event_date: startDate,
      effective_date: startDate,
      staff_post_id: row.staff_post_id,
      staff_post_assignment_id: row.id,
      remarks: row.remarks,
      source_workflow: "staff_post_assignment",
      source_record_id: `${row.id}:assigned`,
      metadata: { backfill_origin: "teacher_staff_post_assignments" },
    });

    if (!row.is_active) {
      const endDate = toDateOnly(row.assignment_end_date || row.assignment_start_date);

      await insertMigrationEvent(client, {
        school_id: row.school_id,
        teacher_id: row.teacher_id,
        event_type: "designation_relieved",
        event_date: endDate,
        effective_date: endDate,
        end_date: endDate,
        staff_post_id: row.staff_post_id,
        staff_post_assignment_id: row.id,
        remarks: row.remarks,
        source_workflow: "staff_post_assignment",
        source_record_id: `${row.id}:relieved`,
        metadata: { backfill_origin: "teacher_staff_post_assignments" },
      });
    }
  }
};

const backfillAdminChargeAssignments = async (client) => {
  const columns = await getTableColumns(client, "teacher_administrative_charge_assignments");
  if (columns.size === 0) {
    return;
  }

  let query = `
    SELECT
      taca.id,
      taca.teacher_id,
      taca.administrative_charge_id,
      taca.school_id,
      taca.is_active,
      taca.assigned_on,
      taca.relieved_on,
      taca.remarks,
      taca.academic_year
    FROM teacher_administrative_charge_assignments taca
  `;
  const params = [];

  if (schoolIdFilter) {
    query += " WHERE taca.school_id = $1";
    params.push(schoolIdFilter);
  }

  const assignments = await client.query(query, params);

  for (const row of assignments.rows) {
    const startDate = toDateOnly(row.assigned_on);

    await insertMigrationEvent(client, {
      school_id: row.school_id,
      teacher_id: row.teacher_id,
      event_type: "admin_charge_assigned",
      event_date: startDate,
      effective_date: startDate,
      administrative_charge_id: row.administrative_charge_id,
      admin_charge_assignment_id: row.id,
      remarks: row.remarks,
      source_workflow: "admin_charge_assignment",
      source_record_id: `${row.id}:assigned`,
      metadata: {
        backfill_origin: "teacher_administrative_charge_assignments",
        academic_year: row.academic_year,
      },
    });

    if (!row.is_active) {
      const endDate = toDateOnly(row.relieved_on || row.assigned_on);

      await insertMigrationEvent(client, {
        school_id: row.school_id,
        teacher_id: row.teacher_id,
        event_type: "admin_charge_relieved",
        event_date: endDate,
        effective_date: endDate,
        end_date: endDate,
        administrative_charge_id: row.administrative_charge_id,
        admin_charge_assignment_id: row.id,
        remarks: row.remarks,
        source_workflow: "admin_charge_assignment",
        source_record_id: `${row.id}:relieved`,
        metadata: {
          backfill_origin: "teacher_administrative_charge_assignments",
          academic_year: row.academic_year,
        },
      });
    }
  }
};

const backfillSubjectAssignments = async (client) => {
  const columns = await getTableColumns(client, "teacher_subject_assignments");
  if (columns.size === 0) {
    return;
  }

  const hasLifecycle = columns.has("assignment_start_date");

  let query = `
    SELECT
      tsa.id,
      tsa.teacher_id,
      tsa.subject_id,
      tsa.class_section_id,
      t.school_id,
      ${hasLifecycle ? "tsa.is_active" : "TRUE AS is_active"},
      ${hasLifecycle ? "tsa.assignment_start_date" : "DATE(tsa.created_at) AS assignment_start_date"},
      ${hasLifecycle ? "tsa.assignment_end_date" : "NULL AS assignment_end_date"}
    FROM teacher_subject_assignments tsa
    JOIN teachers t ON t.id = tsa.teacher_id
  `;
  const params = [];

  if (schoolIdFilter) {
    query += " WHERE t.school_id = $1";
    params.push(schoolIdFilter);
  }

  const assignments = await client.query(query, params);

  for (const row of assignments.rows) {
    const startDate = toDateOnly(row.assignment_start_date);

    await insertMigrationEvent(client, {
      school_id: row.school_id,
      teacher_id: row.teacher_id,
      event_type: "subject_assigned",
      event_date: startDate,
      effective_date: startDate,
      subject_id: row.subject_id,
      class_section_id: row.class_section_id,
      subject_assignment_id: row.id,
      source_workflow: "subject_assignment",
      source_record_id: `${row.id}:assigned`,
      metadata: { backfill_origin: "teacher_subject_assignments" },
    });

    if (!row.is_active) {
      const endDate = toDateOnly(row.assignment_end_date || row.assignment_start_date);

      await insertMigrationEvent(client, {
        school_id: row.school_id,
        teacher_id: row.teacher_id,
        event_type: "subject_relieved",
        event_date: endDate,
        effective_date: endDate,
        end_date: endDate,
        subject_id: row.subject_id,
        class_section_id: row.class_section_id,
        subject_assignment_id: row.id,
        source_workflow: "subject_assignment",
        source_record_id: `${row.id}:relieved`,
        metadata: { backfill_origin: "teacher_subject_assignments" },
      });
    }
  }
};

const run = async () => {
  console.log("Starting staff_service_history backfill...");
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
  if (schoolIdFilter) {
    console.log(`School filter: ${schoolIdFilter}`);
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await backfillJoiningEvents(client);
    await backfillStaffPostAssignments(client);
    await backfillAdminChargeAssignments(client);
    await backfillSubjectAssignments(client);
    await backfillClosingEvents(client);

    if (dryRun) {
      await client.query("ROLLBACK");
      console.log("Dry run complete — no rows committed.");
    } else {
      await client.query("COMMIT");
      console.log("Backfill committed successfully.");
    }

    console.log(`Inserted: ${stats.inserted}`);
    console.log(`Skipped (already backfilled): ${stats.skipped}`);
    console.log(`Errors: ${stats.errors}`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Backfill failed:", error.message);
    stats.errors += 1;
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
};

run();
