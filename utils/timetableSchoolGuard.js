/**
 * Interim school checks for timetable writes until class_sections / subjects
 * carry school_id (see ACADEMIC_DATA_MODEL_CONSOLIDATION.md Phase 1).
 */

const fetchClassSectionForSchool = async (
  pool,
  classSectionId,
  schoolId
) => {
  const result = await pool.query(
    `
    SELECT cs.id, cs.class_name, cs.section_name
    FROM class_sections cs
    WHERE cs.id = $1
      AND (
        EXISTS (
          SELECT 1
          FROM students s
          WHERE s.school_id = $2
            AND LOWER(TRIM(s.student_class)) = LOWER(TRIM(cs.class_name))
            AND LOWER(TRIM(s.section)) = LOWER(TRIM(cs.section_name))
        )
        OR EXISTS (
          SELECT 1
          FROM teacher_subject_assignments tsa
          INNER JOIN teachers t ON t.id = tsa.teacher_id
          WHERE tsa.class_section_id = cs.id
            AND t.school_id = $2
        )
        OR EXISTS (
          SELECT 1
          FROM timetables tt
          INNER JOIN teachers t ON t.id = tt.teacher_id
          WHERE tt.class_section_id = cs.id
            AND t.school_id = $2
        )
      )
    `,
    [classSectionId, schoolId]
  );

  return result.rows[0] || null;
};

const fetchSubjectForSchool = async (pool, subjectId, schoolId) => {
  const result = await pool.query(
    `
    SELECT s.id, s.subject_name
    FROM subjects s
    WHERE s.id = $1
      AND (
        EXISTS (
          SELECT 1
          FROM teacher_subject_assignments tsa
          INNER JOIN teachers t ON t.id = tsa.teacher_id
          WHERE tsa.subject_id = s.id
            AND t.school_id = $2
        )
        OR EXISTS (
          SELECT 1
          FROM timetables tt
          INNER JOIN teachers t ON t.id = tt.teacher_id
          WHERE tt.subject_id = s.id
            AND t.school_id = $2
        )
        OR EXISTS (
          SELECT 1
          FROM student_results sr
          INNER JOIN students st ON st.id = sr.student_id
          WHERE sr.subject_id = s.id
            AND st.school_id = $2
        )
      )
    `,
    [subjectId, schoolId]
  );

  return result.rows[0] || null;
};

module.exports = {
  fetchClassSectionForSchool,
  fetchSubjectForSchool,
};
