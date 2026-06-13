const pool = require("../db");

const {
  successResponse,
  errorResponse,
} = require("../utils/response");
const {
  fetchTeacherForAssignment,
  getTeacherAssignmentEligibility,
} = require("../utils/teacherAssignmentGuard");

const normalizeTimetablePayload = (
  payload = {}
) => ({
  class_section_id: Number(
    payload.class_section_id
  ),

  subject_id: Number(
    payload.subject_id
  ),

  teacher_id: Number(
    payload.teacher_id
  ),

  day: String(payload.day || "")
    .trim()
    .toLowerCase(),

  period_number: Number(
    payload.period_number
  ),

  start_time: String(
    payload.start_time || ""
  ).trim(),

  end_time: String(
    payload.end_time || ""
  ).trim(),
});

const buildTimetableSelect = () => `
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

  JOIN class_sections cs
    ON cs.id = t.class_section_id

  JOIN subjects s
    ON s.id = t.subject_id

  JOIN teachers tr
    ON tr.id = t.teacher_id
`;

const createTimetable = async (
  req,
  res
) => {
  try {
    const payload =
      normalizeTimetablePayload(
        req.body
      );

    const teacherRow = await fetchTeacherForAssignment(
      pool,
      payload.teacher_id,
      req.user?.school_id || null
    );
    const eligibility = getTeacherAssignmentEligibility(teacherRow);
    if (!eligibility.eligible) {
      return errorResponse(res, {
        message: eligibility.message,
        error: eligibility.error,
        status: teacherRow ? 409 : 400,
      });
    }

    const classPeriodConflict =
      await pool.query(
        `
        SELECT id
        FROM timetables
        WHERE class_section_id = $1
        AND day = $2
        AND period_number = $3
        `,
        [
          payload.class_section_id,
          payload.day,
          payload.period_number,
        ]
      );

    if (
      classPeriodConflict.rowCount > 0
    ) {
      return errorResponse(res, {
        message:
          "Class already has a period scheduled at this time",

        error:
          "Duplicate timetable period",

        status: 409,
      });
    }

    const teacherClash =
      await pool.query(
        `
        SELECT id
        FROM timetables
        WHERE teacher_id = $1
        AND day = $2
        AND period_number = $3
        `,
        [
          payload.teacher_id,
          payload.day,
          payload.period_number,
        ]
      );

    if (teacherClash.rowCount > 0) {
      return errorResponse(res, {
        message:
          "Teacher already has another class during this period",

        error:
          "Teacher timetable clash",

        status: 409,
      });
    }

    const result = await pool.query(
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

      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7
      )

      RETURNING *
      `,
      [
        payload.class_section_id,
        payload.subject_id,
        payload.teacher_id,
        payload.day,
        payload.period_number,
        payload.start_time,
        payload.end_time,
      ]
    );

    return successResponse(res, {
      message:
        "Timetable created successfully",

      data: result.rows[0],
    });
  } catch (err) {
    console.error(err);

    if (err?.code === "23503") {
      return errorResponse(res, {
        message:
          "Teacher, subject or class section does not exist",

        error: "Foreign key error",

        status: 404,
      });
    }

    return errorResponse(res, {
      message:
        "Error creating timetable",

      error: err.message,

      status: 500,
    });
  }
};

const getAllTimetables = async (
  req,
  res
) => {
  try {
    const result = await pool.query(
      `
      ${buildTimetableSelect()}

      ORDER BY
      CAST(
        REGEXP_REPLACE(
          cs.class_name,
          '[^0-9]',
          '',
          'g'
        ) AS INTEGER
      ) ASC,

      cs.class_name ASC,

      CASE t.day
        WHEN 'monday' THEN 1
        WHEN 'tuesday' THEN 2
        WHEN 'wednesday' THEN 3
        WHEN 'thursday' THEN 4
        WHEN 'friday' THEN 5
        WHEN 'saturday' THEN 6
        ELSE 7
      END,

      t.period_number ASC
      `
    );

    return successResponse(res, {
      message:
        "Timetables fetched successfully",

      data: result.rows,
    });
  } catch (err) {
    console.error(err);

    return errorResponse(res, {
      message:
        "Error fetching timetables",

      error: err.message,

      status: 500,
    });
  }
};

const getTimetableByClass = async (
  req,
  res
) => {
  try {
    const { classSectionId } =
      req.params;

    const result = await pool.query(
      `
      ${buildTimetableSelect()}

      WHERE cs.id = $1

      ORDER BY
      CASE t.day
        WHEN 'monday' THEN 1
        WHEN 'tuesday' THEN 2
        WHEN 'wednesday' THEN 3
        WHEN 'thursday' THEN 4
        WHEN 'friday' THEN 5
        WHEN 'saturday' THEN 6
        ELSE 7
      END,

      t.period_number ASC
      `,
      [classSectionId]
    );

    return successResponse(res, {
      message:
        "Class timetable fetched successfully",

      data: result.rows,
    });
  } catch (err) {
    console.error(err);

    return errorResponse(res, {
      message:
        "Error fetching class timetable",

      error: err.message,

      status: 500,
    });
  }
};

const deleteTimetable = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      DELETE FROM timetables
      WHERE id = $1
      RETURNING *
      `,
      [id]
    );

    if (result.rowCount === 0) {
      return errorResponse(res, {
        message:
          "Timetable entry not found",

        error: "Not found",

        status: 404,
      });
    }

    return successResponse(res, {
      message:
        "Timetable deleted successfully",

      data: result.rows[0],
    });
  } catch (err) {
    console.error(err);

    return errorResponse(res, {
      message:
        "Error deleting timetable",

      error: err.message,

      status: 500,
    });
  }
};

module.exports = {
  createTimetable,
  getAllTimetables,
  getTimetableByClass,
  deleteTimetable,
};