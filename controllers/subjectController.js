const pool = require("../db");
const { successResponse, errorResponse } = require("../utils/response");

const SUBJECT_IN_USE_MESSAGE =
  "This subject is already in use and cannot be deleted. Deactivate it instead.";

const SUBJECT_REFERENCE_TABLES = [
  { key: "teacher_subject_assignments", sql: "teacher_subject_assignments" },
  { key: "timetables", sql: "timetables" },
  { key: "student_results", sql: "student_results" },
  { key: "marks", sql: "marks" },
  { key: "staff_service_history", sql: "staff_service_history" },
];

const findSubjectReferenceTables = async (subjectId) => {
  const existsClauses = SUBJECT_REFERENCE_TABLES.map(
    ({ key, sql }) =>
      `EXISTS (SELECT 1 FROM ${sql} WHERE subject_id = $1) AS ${key}`
  ).join(",\n      ");

  const result = await pool.query(
    `
    SELECT
      ${existsClauses}
    `,
    [subjectId]
  );

  const row = result.rows[0] || {};

  return SUBJECT_REFERENCE_TABLES.filter(({ key }) => row[key] === true).map(
    ({ key }) => key
  );
};

const normalizeSubjectPayload = (payload = {}) => ({
  subject_name: String(payload.subject_name || "").trim(),
  applicable_classes: Array.isArray(payload.applicable_classes)
    ? payload.applicable_classes
    : [],
});

const normalizeApplicableClasses = (applicable_classes = []) => {
  const uniqueIds = [
    ...new Set(
      (Array.isArray(applicable_classes) ? applicable_classes : [])
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item > 0)
    ),
  ];

  return uniqueIds;
};

const buildSubjectPrefix = (subject_name = "") => {
  const cleaned = String(subject_name || "")
    .replace(/[^A-Za-z0-9]+/g, "")
    .slice(0, 3)
    .toUpperCase();

  return cleaned || "SUB";
};

const generateSubjectCode = async (subject_name, offset = 0, subjectId = null) => {
  const prefix = buildSubjectPrefix(subject_name);

  const result = await pool.query(
    `
    SELECT subject_code
    FROM subjects
    WHERE subject_code ILIKE $1
      AND ($2::INTEGER IS NULL OR id <> $2)
    `,
    [`${prefix}%`, subjectId]
  );

  let maxSequence = 0;

  for (const row of result.rows) {
    const match = row.subject_code.match(new RegExp(`^${prefix}(\\d{1,6})$`));

    if (match) {
      const parsed = Number(match[1]);

      if (!Number.isNaN(parsed) && parsed > maxSequence) {
        maxSequence = parsed;
      }
    }
  }

  const nextSequence = maxSequence + offset + 1;

  return `${prefix}${String(nextSequence).padStart(3, "0")}`;
};

const generateUniqueSubjectCode = async (subject_name, subjectId = null) => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const subjectCode = await generateSubjectCode(subject_name, attempt, subjectId);

    const conflict = await pool.query(
      `
      SELECT id
      FROM subjects
      WHERE LOWER(subject_code) = LOWER($1)
        AND ($2::INTEGER IS NULL OR id <> $2)
      `,
      [subjectCode, subjectId]
    );

    if (conflict.rowCount === 0) {
      return subjectCode;
    }
  }

  throw new Error("Unable to generate a unique subject code");
};

const validateSubjectPayload = (subject_name, applicable_classes) => {
  if (!subject_name) {
    return "Subject name is required";
  }

  if (!Array.isArray(applicable_classes) || applicable_classes.length === 0) {
    return "At least one applicable class is required";
  }

  return null;
};

const createSubject = async (req, res) => {
  try {
    const { subject_name, applicable_classes } = normalizeSubjectPayload(req.body);
    const normalizedClasses = normalizeApplicableClasses(applicable_classes);
    const validationError = validateSubjectPayload(subject_name, normalizedClasses);

    if (validationError) {
      return errorResponse(res, {
        message: validationError,
        error: "Missing or invalid fields",
        status: 400,
      });
    }

    const duplicate = await pool.query(
      `
      SELECT id
      FROM subjects
      WHERE LOWER(subject_name) = LOWER($1)
      `,
      [subject_name]
    );

    if (duplicate.rowCount > 0) {
      return errorResponse(res, {
        message: "A subject with the same name already exists",
        error: "Duplicate subject",
        status: 409,
      });
    }

    const subject_code = await generateUniqueSubjectCode(subject_name);

    const result = await pool.query(
      `
      INSERT INTO subjects (subject_name, subject_code, applicable_classes)
      VALUES ($1, $2, $3)
      RETURNING id, subject_name, subject_code, applicable_classes, created_at
      `,
      [subject_name, subject_code, normalizedClasses]
    );

    return successResponse(res, {
      message: "Subject created successfully",
      data: result.rows[0],
    });
  } catch (err) {
    if (err?.code === "23505") {
      return errorResponse(res, {
        message: "A subject with the same name or code already exists",
        error: "Duplicate subject",
        status: 409,
      });
    }

    console.error(err);
    return errorResponse(res, {
      message: "Error creating subject",
      error: err.message,
      status: 500,
    });
  }
};

const getSubjects = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        id,
        subject_name,
        subject_code,
        COALESCE(applicable_classes, '{}'::INTEGER[]) AS applicable_classes,
        created_at
      FROM subjects
      ORDER BY subject_name ASC
      `
    );

    return successResponse(res, {
      message: "Subjects fetched successfully",
      data: result.rows,
    });
  } catch (err) {
    console.error(err);
    return errorResponse(res, {
      message: "Error fetching subjects",
      error: err.message,
      status: 500,
    });
  }
};

const updateSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const { subject_name, applicable_classes } = normalizeSubjectPayload(req.body);
    const normalizedClasses = normalizeApplicableClasses(applicable_classes);
    const validationError = validateSubjectPayload(subject_name, normalizedClasses);

    if (validationError) {
      return errorResponse(res, {
        message: validationError,
        error: "Missing or invalid fields",
        status: 400,
      });
    }

    const duplicate = await pool.query(
      `
      SELECT id
      FROM subjects
      WHERE LOWER(subject_name) = LOWER($1)
        AND id <> $2
      `,
      [subject_name, id]
    );

    if (duplicate.rowCount > 0) {
      return errorResponse(res, {
        message: "A subject with the same name already exists",
        error: "Duplicate subject",
        status: 409,
      });
    }

    const subject_code = await generateUniqueSubjectCode(subject_name, id);

    const result = await pool.query(
      `
      UPDATE subjects
      SET subject_name = $1,
          subject_code = $2,
          applicable_classes = $3
      WHERE id = $4
      RETURNING id, subject_name, subject_code, applicable_classes, created_at
      `,
      [subject_name, subject_code, normalizedClasses, id]
    );

    if (result.rowCount === 0) {
      return errorResponse(res, {
        message: "Subject not found",
        error: "Not found",
        status: 404,
      });
    }

    return successResponse(res, {
      message: "Subject updated successfully",
      data: result.rows[0],
    });
  } catch (err) {
    if (err?.code === "23505") {
      return errorResponse(res, {
        message: "A subject with the same name or code already exists",
        error: "Duplicate subject",
        status: 409,
      });
    }

    console.error(err);
    return errorResponse(res, {
      message: "Error updating subject",
      error: err.message,
      status: 500,
    });
  }
};

const deleteSubject = async (req, res) => {
  try {
    const { id } = req.params;

    const referencedTables = await findSubjectReferenceTables(id);

    if (referencedTables.length > 0) {
      return errorResponse(res, {
        message: SUBJECT_IN_USE_MESSAGE,
        error: "Subject in use",
        status: 409,
      });
    }

    const result = await pool.query(
      `
      DELETE FROM subjects
      WHERE id = $1
      RETURNING id
      `,
      [id]
    );

    if (result.rowCount === 0) {
      return errorResponse(res, {
        message: "Subject not found",
        error: "Not found",
        status: 404,
      });
    }

    return successResponse(res, {
      message: "Subject deleted successfully",
      data: { id },
    });
  } catch (err) {
    console.error(err);
    return errorResponse(res, {
      message: "Error deleting subject",
      error: err.message,
      status: 500,
    });
  }
};

module.exports = {
  createSubject,
  getSubjects,
  updateSubject,
  deleteSubject,
  SUBJECT_IN_USE_MESSAGE,
  SUBJECT_REFERENCE_TABLES,
  findSubjectReferenceTables,
};