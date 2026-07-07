/**
 * Timetable workflow tests — P0 tenant scope and create validation.
 * Usage: node backend/scripts/testTimetableWorkflow.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const pool = require("../db");
const {
  fetchClassSectionForSchool,
  fetchSubjectForSchool,
} = require("../utils/timetableSchoolGuard");

const SCHOOL_ID = 1;

const TIMETABLE_SELECT = `
  SELECT
    t.id,
    t.day,
    t.period_number,
    t.start_time,
    t.end_time,
    cs.id AS class_section_id,
    cs.class_name,
    s.id AS subject_id,
    s.subject_name,
    tr.id AS teacher_id,
    tr.teacher_name
  FROM timetables t
  JOIN class_sections cs ON cs.id = t.class_section_id
  JOIN subjects s ON s.id = t.subject_id
  JOIN teachers tr ON tr.id = t.teacher_id
`;

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const listTimetablesForSchool = async (schoolId) => {
  const result = await pool.query(
    `
    ${TIMETABLE_SELECT}
    WHERE tr.school_id = $1
    ORDER BY t.id
    `,
    [schoolId]
  );

  return result.rows;
};

const deleteTimetableForSchool = async (id, schoolId) => {
  const result = await pool.query(
    `
    DELETE FROM timetables t
    USING teachers tr
    WHERE t.id = $1
      AND t.teacher_id = tr.id
      AND tr.school_id = $2
    RETURNING t.id
    `,
    [id, schoolId]
  );

  return result.rowCount;
};

const resolveAssignmentFixture = async () => {
  const result = await pool.query(
    `
    SELECT
      tsa.teacher_id,
      tsa.class_section_id,
      tsa.subject_id
    FROM teacher_subject_assignments tsa
    INNER JOIN teachers t ON t.id = tsa.teacher_id
    WHERE t.school_id = $1
      AND tsa.is_active = TRUE
    ORDER BY tsa.id
    LIMIT 1
    `,
    [SCHOOL_ID]
  );

  assert(result.rows.length > 0, "Need an active teacher subject assignment for school 1");
  return result.rows[0];
};

const findUnusedSlot = async (teacherId, classSectionId) => {
  for (let period = 8; period <= 12; period += 1) {
    for (const day of ["monday", "tuesday", "wednesday"]) {
      const clash = await pool.query(
        `
        SELECT id
        FROM timetables
        WHERE (teacher_id = $1 OR class_section_id = $2)
          AND day = $3
          AND period_number = $4
        LIMIT 1
        `,
        [teacherId, classSectionId, day, period]
      );

      if (clash.rowCount === 0) {
        return { day, period_number: period };
      }
    }
  }

  throw new Error("Could not find a free timetable slot for tests");
};

const run = async () => {
  console.log("Timetable workflow tests\n");

  const fixture = await resolveAssignmentFixture();

  const classSection = await fetchClassSectionForSchool(
    pool,
    fixture.class_section_id,
    SCHOOL_ID
  );
  assert(classSection, "Class section must resolve for the school");
  console.log("✓ Class section belongs to school");

  const subject = await fetchSubjectForSchool(
    pool,
    fixture.subject_id,
    SCHOOL_ID
  );
  assert(subject, "Subject must resolve for the school");
  console.log("✓ Subject belongs to school");

  const foreignTeacher = await pool.query(
    `
    SELECT id
    FROM teachers
    WHERE school_id IS NOT NULL
      AND school_id <> $1
    ORDER BY id
    LIMIT 1
    `,
    [SCHOOL_ID]
  );

  if (foreignTeacher.rows.length > 0) {
    const foreignAssignment = await pool.query(
      `
      SELECT class_section_id, subject_id
      FROM teacher_subject_assignments
      WHERE teacher_id = $1
        AND is_active = TRUE
      LIMIT 1
      `,
      [foreignTeacher.rows[0].id]
    );

    if (foreignAssignment.rows.length > 0) {
      const foreignClass = await fetchClassSectionForSchool(
        pool,
        foreignAssignment.rows[0].class_section_id,
        SCHOOL_ID
      );
      assert(!foreignClass, "Foreign class section must not pass school validation");
      console.log("✓ Foreign class section rejected for school");
    }
  } else {
    console.log("✓ Foreign class section rejection skipped (single-school dataset)");
  }

  const slot = await findUnusedSlot(
    fixture.teacher_id,
    fixture.class_section_id
  );

  const insertResult = await pool.query(
    `
    INSERT INTO timetables (
      class_section_id,
      subject_id,
      teacher_id,
      day,
      period_number,
      start_time,
      end_time
    )
    VALUES ($1, $2, $3, $4, $5, '11:00', '11:45')
    RETURNING id
    `,
    [
      fixture.class_section_id,
      fixture.subject_id,
      fixture.teacher_id,
      slot.day,
      slot.period_number,
    ]
  );

  const entryId = insertResult.rows[0].id;

  try {
    const schoolRows = await listTimetablesForSchool(SCHOOL_ID);
    assert(
      schoolRows.some((row) => Number(row.id) === Number(entryId)),
      "School-scoped list must include the new entry"
    );
    console.log("✓ GET scope includes school timetable rows");

    const otherSchool = await pool.query(
      `
      SELECT id
      FROM schools
      WHERE id <> $1
      ORDER BY id
      LIMIT 1
      `,
      [SCHOOL_ID]
    );

    if (otherSchool.rows.length > 0) {
      const foreignRows = await listTimetablesForSchool(otherSchool.rows[0].id);
      assert(
        !foreignRows.some((row) => Number(row.id) === Number(entryId)),
        "Other schools must not see school 1 timetable rows"
      );
      console.log("✓ GET scope excludes other schools");

      const foreignDeleteCount = await deleteTimetableForSchool(
        entryId,
        otherSchool.rows[0].id
      );
      assert(foreignDeleteCount === 0, "Other schools must not delete school 1 rows");
      console.log("✓ DELETE blocked across tenants");
    } else {
      console.log("✓ Cross-tenant list/delete skipped (single-school dataset)");
    }

    const deleteCount = await deleteTimetableForSchool(entryId, SCHOOL_ID);
    assert(deleteCount === 1, "School-scoped delete must remove own row");
    console.log("✓ DELETE succeeds for owning school");

    const missingDeleteCount = await deleteTimetableForSchool(entryId, SCHOOL_ID);
    assert(missingDeleteCount === 0, "Second delete must return not found");
    console.log("✓ DELETE is idempotent after removal");
  } catch (err) {
    await pool.query(`DELETE FROM timetables WHERE id = $1`, [entryId]);
    throw err;
  }

  console.log("\nAll timetable workflow tests passed.");
};

run()
  .catch((err) => {
    console.error("FAILED:", err.message);
    process.exit(1);
  })
  .finally(() => pool.end());
