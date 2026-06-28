const pool = require("../db");
const { successResponse, errorResponse } = require("../utils/response");
const {
  fetchTeacherForAssignment,
  getTeacherAssignmentEligibility,
} = require("../utils/teacherAssignmentGuard");

const normalizeAssignmentPayload = (payload = {}) => ({
  teacher_id: Number(payload.teacher_id),
  class_section_id: Number(payload.class_section_id),
  subject_id: Number(payload.subject_id),
  assignment_start_date: payload.assignment_start_date,
});

const shouldIncludeHistory = (query = {}) =>
  query.include_history === "true" || query.include_history === true;

const buildSchoolClause = (role, schoolId, params, tableAlias = "t") => {
  if (role !== "super_admin" && schoolId != null) {
    params.push(schoolId);
    return `${tableAlias}.school_id = $${params.length}`;
  }

  return null;
};

const getBaseAssignmentQuery = () => `
  SELECT
    tsa.id,
    tsa.teacher_id,
    tsa.class_section_id,
    tsa.subject_id,
    tsa.assignment_start_date,
    tsa.assignment_end_date,
    tsa.is_active,
    tsa.created_at,
    tsa.updated_at,
    t.teacher_name,
    cs.class_name,
    cs.section_name,
    s.subject_name,
    s.subject_code
  FROM teacher_subject_assignments tsa
  JOIN teachers t ON t.id = tsa.teacher_id
  JOIN class_sections cs ON cs.id = tsa.class_section_id
  JOIN subjects s ON s.id = tsa.subject_id
`;

const buildAssignmentsQuery = (options = {}) => {
  const {
    teacherId = null,
    activeOnly = true,
    role = null,
    schoolId = null,
  } = options;
  let query = getBaseAssignmentQuery();
  const params = [];
  const conditions = [];

  const schoolCondition = buildSchoolClause(role, schoolId, params);
  if (schoolCondition) {
    conditions.push(schoolCondition);
  }

  if (teacherId !== null) {
    params.push(teacherId);
    conditions.push(`tsa.teacher_id = $${params.length}`);
  }

  if (activeOnly) {
    conditions.push("tsa.is_active = TRUE");
  }

  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(" AND ")}`;
  }

  query += ` ORDER BY tsa.is_active DESC, tsa.assignment_start_date DESC, t.teacher_name ASC, cs.class_name ASC, cs.section_name ASC, s.subject_name ASC`;

  return { query, params };
};

const getAssignments = async (req, res) => {
  try {
    const { school_id: schoolId, role } = req.user;
    const activeOnly = !shouldIncludeHistory(req.query);
    const { query, params } = buildAssignmentsQuery({
      activeOnly,
      role,
      schoolId,
    });
    const result = await pool.query(query, params);

    return successResponse(res, {
      message: "Assignments fetched successfully",
      data: result.rows,
    });
  } catch (err) {
    console.error(err);

    return errorResponse(res, {
      message: "Error fetching teacher subject assignments",
      error: err.message,
      status: 500,
    });
  }
};

const getAssignmentsByTeacherId = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { school_id } = req.user;
    const activeOnly = !shouldIncludeHistory(req.query);

    const teacherCheck = await pool.query(
      `
      SELECT id
      FROM teachers
      WHERE id = $1 AND school_id = $2
      `,
      [teacherId, school_id]
    );

    if (teacherCheck.rowCount === 0) {
      return errorResponse(res, {
        message: "Teacher not found in your school",
        error: "Not found",
        status: 404,
      });
    }

    const { query, params } = buildAssignmentsQuery({
      teacherId: Number(teacherId),
      activeOnly,
    });
    const result = await pool.query(query, params);

    return successResponse(res, {
      message: "Teacher assignments fetched successfully",
      data: result.rows,
    });
  } catch (err) {
    console.error(err);
    return errorResponse(res, {
      message: "Error fetching teacher assignments",
      error: err.message,
      status: 500,
    });
  }
};

const getAssignmentsForTeacher = async (req, res) => {
  try {
    const teacherId = req.user.teacher_id ?? null;

    if (!teacherId) {
      return errorResponse(res, {
        message: "Teacher profile is not linked to your account",
        error: "Missing teacher_id",
        status: 400,
      });
    }

    const activeOnly = !shouldIncludeHistory(req.query);
    const { query, params } = buildAssignmentsQuery({
      teacherId: Number(teacherId),
      activeOnly,
    });
    const result = await pool.query(query, params);

    return successResponse(res, {
      message: "Teacher assignments fetched successfully",
      data: result.rows,
    });
  } catch (err) {
    console.error(err);
    return errorResponse(res, {
      message: "Error fetching teacher assignments",
      error: err.message,
      status: 500,
    });
  }
};

const createAssignment = async (req, res) => {
  try {
    const { teacher_id, class_section_id, subject_id, assignment_start_date } =
      normalizeAssignmentPayload(req.body);
    const schoolId = req.user?.school_id || null;

    const teacherRow = await fetchTeacherForAssignment(pool, teacher_id, schoolId);
    const eligibility = getTeacherAssignmentEligibility(teacherRow);
    if (!eligibility.eligible) {
      return errorResponse(res, {
        message: eligibility.message,
        error: eligibility.error,
        status: teacherRow ? 409 : 400,
      });
    }

    const duplicate = await pool.query(
      `
      SELECT id
      FROM teacher_subject_assignments
      WHERE teacher_id = $1
        AND class_section_id = $2
        AND subject_id = $3
        AND is_active = TRUE
      `,
      [teacher_id, class_section_id, subject_id]
    );

    if (duplicate.rowCount > 0) {
      return errorResponse(res, {
        message: "This teacher is already actively assigned to this subject for this class section",
        error: "Duplicate active teacher subject assignment",
        status: 409,
      });
    }

    const result = await pool.query(
      `
      INSERT INTO teacher_subject_assignments (
        teacher_id,
        class_section_id,
        subject_id,
        assignment_start_date,
        is_active
      )
      VALUES ($1, $2, $3, $4, TRUE)
      RETURNING id, teacher_id, class_section_id, subject_id, assignment_start_date, assignment_end_date, is_active, created_at, updated_at
      `,
      [teacher_id, class_section_id, subject_id, assignment_start_date]
    );

    return successResponse(res, {
      message: "Teacher subject assignment created successfully",
      data: result.rows[0],
      status: 201,
    });
  } catch (err) {
    if (err?.code === "23505") {
      return errorResponse(res, {
        message: "This teacher is already actively assigned to this subject for this class section",
        error: "Duplicate active teacher subject assignment",
        status: 409,
      });
    }

    if (err?.code === "23503") {
      return errorResponse(res, {
        message: "Teacher, class section, or subject does not exist",
        error: "Referenced resource not found",
        status: 404,
      });
    }

    console.error(err);
    return errorResponse(res, {
      message: "Error creating teacher subject assignment",
      error: err.message,
      status: 500,
    });
  }
};

const relieveAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const { assignment_end_date } = req.body;
    const { school_id: schoolId, role } = req.user;

    const params = [assignment_end_date, id];
    const schoolCondition = buildSchoolClause(role, schoolId, params, "t");

    let query = `
      UPDATE teacher_subject_assignments tsa
      SET is_active = FALSE,
          assignment_end_date = $1,
          updated_at = NOW()
      FROM teachers t
      WHERE tsa.teacher_id = t.id
        AND tsa.id = $2
        AND tsa.is_active = TRUE
    `;

    if (schoolCondition) {
      query += ` AND ${schoolCondition}`;
    }

    query += `
      RETURNING tsa.id, tsa.teacher_id, tsa.class_section_id, tsa.subject_id, tsa.assignment_start_date, tsa.assignment_end_date, tsa.is_active, tsa.created_at, tsa.updated_at
    `;

    const result = await pool.query(query, params);

    if (result.rowCount === 0) {
      return errorResponse(res, {
        message: "Active assignment not found or already relieved",
        error: "Not found or already inactive",
        status: 404,
      });
    }

    return successResponse(res, {
      message: "Teacher relieved from subject successfully",
      data: result.rows[0],
    });
  } catch (err) {
    if (err?.code === "23514") {
      return errorResponse(res, {
        message: "Assignment end date must be on or after the start date",
        error: "Invalid assignment dates",
        status: 400,
      });
    }

    console.error(err);
    return errorResponse(res, {
      message: "Error relieving teacher from subject",
      error: err.message,
      status: 500,
    });
  }
};

module.exports = {
  getAssignments,
  getAssignmentsByTeacherId,
  getAssignmentsForTeacher,
  createAssignment,
  relieveAssignment,
};
