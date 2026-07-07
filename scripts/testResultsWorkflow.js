/**
 * Results / promotion workflow tests — P0 assessment source + pass threshold.
 * Usage: node backend/scripts/testResultsWorkflow.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const pool = require("../db");
const {
  fetchStudentAssessmentRows,
} = require("../controllers/promotionController");
const {
  calculatePercentage,
  getResultStatus,
  PASS_MARK_PERCENTAGE,
} = require("../constants/assessmentResults");

const SCHOOL_ID = 1;

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const resolveStudentFixture = async () => {
  const result = await pool.query(
    `
    SELECT id
    FROM students
    WHERE school_id = $1
      AND is_active = TRUE
    ORDER BY id
    LIMIT 1
    `,
    [SCHOOL_ID]
  );

  assert(result.rows.length > 0, "Need an active student in school 1");
  return result.rows[0].id;
};

const resolveSubjectFixture = async () => {
  const result = await pool.query(
    `
    SELECT s.id
    FROM subjects s
    WHERE EXISTS (
      SELECT 1
      FROM teacher_subject_assignments tsa
      INNER JOIN teachers t ON t.id = tsa.teacher_id
      WHERE tsa.subject_id = s.id
        AND t.school_id = $1
    )
    ORDER BY s.id
    LIMIT 1
    `,
    [SCHOOL_ID]
  );

  assert(result.rows.length > 0, "Need a subject linked to school 1");
  return result.rows[0].id;
};

const run = async () => {
  console.log("Results workflow tests\n");

  const studentId = await resolveStudentFixture();
  const subjectId = await resolveSubjectFixture();
  const examName = `TEST_RESULTS_WF_${Date.now()}`;

  const percentage = calculatePercentage(42, 100);
  assert(percentage === 42, "calculatePercentage must return bounded percentage");
  assert(
    getResultStatus(percentage) === "Pass",
    `42% must pass at ${PASS_MARK_PERCENTAGE}% threshold`
  );
  assert(
    getResultStatus(PASS_MARK_PERCENTAGE - 0.01) === "Fail",
    "Just below pass threshold must fail"
  );
  console.log("✓ Shared pass threshold helpers");

  const insertResult = await pool.query(
    `
    INSERT INTO student_results (
      student_id,
      subject_id,
      exam_name,
      marks_obtained,
      max_marks,
      percentage,
      result_status
    )
    VALUES ($1, $2, $3, 42, 100, 42.00, $4)
    RETURNING id
    `,
    [studentId, subjectId, examName, getResultStatus(42)]
  );

  const resultId = insertResult.rows[0].id;

  try {
    const assessment = await fetchStudentAssessmentRows(
      studentId,
      "principal",
      SCHOOL_ID
    );

    assert(
      assessment.source === "student_results",
      "Promotion source must prefer student_results when rows exist"
    );
    assert(
      assessment.rows.some(
        (row) => Number(row.marks_obtained) === 42 && Number(row.max_marks) === 100
      ),
      "Promotion assessment rows must include inserted student_results"
    );
    console.log("✓ Promotion reads student_results first");

    await pool.query(`DELETE FROM student_results WHERE id = $1`, [resultId]);

    const legacyMarks = await pool.query(
      `
      SELECT COUNT(*)::int AS count
      FROM marks m
      JOIN students s ON s.id = m.student_id
      WHERE m.student_id = $1
        AND s.school_id = $2
      `,
      [studentId, SCHOOL_ID]
    );

    if (legacyMarks.rows[0].count > 0) {
      const fallback = await fetchStudentAssessmentRows(
        studentId,
        "principal",
        SCHOOL_ID
      );
      assert(
        fallback.source === "marks",
        "Promotion must fall back to legacy marks when student_results are absent"
      );
      assert(fallback.rows.length > 0, "Legacy marks fallback must return rows");
      console.log("✓ Promotion falls back to legacy marks");
    } else {
      console.log("✓ Legacy marks fallback skipped (no marks rows for student)");
    }
  } catch (err) {
    await pool.query(`DELETE FROM student_results WHERE id = $1`, [resultId]);
    throw err;
  }

  console.log("\nAll results workflow tests passed.");
};

run()
  .catch((err) => {
    console.error("FAILED:", err.message);
    process.exit(1);
  })
  .finally(() => pool.end());
