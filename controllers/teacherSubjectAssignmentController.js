const pool = require("../db");
const { successResponse, errorResponse } = require("../utils/response");

const normalizeAssignmentPayload = (payload = {}) => ({
  teacher_id: Number(payload.teacher_id),
  class_section_id: Number(payload.class_section_id),
  subject_id: Number(payload.subject_id),
});

const buildAssignmentsQuery = (teacherId = null) => {
  let query = `
    SELECT
      tsa.id,
      tsa.teacher_id,
      tsa.class_section_id,
      tsa.subject_id,
      tsa.created_at,
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

  const params = [];

  if (teacherId !== null) {
    query += ` WHERE tsa.teacher_id = $1`;
    params.push(teacherId);
  }

  query += ` ORDER BY t.teacher_name ASC, cs.class_name ASC, cs.section_name ASC, s.subject_name ASC`;

  return { query, params };
};

const getAssignments = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        tsa.id,
        tsa.teacher_id,
        t.teacher_name,
        tsa.subject_id,
        s.subject_name,
        tsa.class_section_id,
        cs.class_name,
        cs.section_name
      FROM teacher_subject_assignments tsa
      JOIN teachers t ON t.id = tsa.teacher_id
      JOIN subjects s ON s.id = tsa.subject_id
      JOIN class_sections cs ON cs.id = tsa.class_section_id
      ORDER BY
        LENGTH(cs.class_name),
        cs.class_name,
        cs.section_name,
        s.subject_name
    `);

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

    const { query, params } = buildAssignmentsQuery(Number(teacherId));
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
    let teacherId = req.user.teacher_id;

    if (!teacherId && req.user.role === "teacher") {
      const teacherLookup = await pool.query(
        `
        SELECT id
        FROM teachers
        WHERE teacher_name ILIKE $1
        LIMIT 1
        `,
        [req.user.name || ""]
      );

      teacherId = teacherLookup.rows[0]?.id || null;
    }

    if (!teacherId) {
      return errorResponse(res, {
        message: "Teacher profile is not linked to your account",
        error: "Missing teacher_id",
        status: 400,
      });
    }

    const { query, params } = buildAssignmentsQuery(Number(teacherId));
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
    const { teacher_id, class_section_id, subject_id } = normalizeAssignmentPayload(req.body);

    const duplicate = await pool.query(
      `
      SELECT id
      FROM teacher_subject_assignments
      WHERE teacher_id = $1
        AND class_section_id = $2
        AND subject_id = $3
      `,
      [teacher_id, class_section_id, subject_id]
    );

    if (duplicate.rowCount > 0) {
      return errorResponse(res, {
        message: "This teacher is already assigned to this subject for this class section",
        error: "Duplicate teacher subject assignment",
        status: 409,
      });
    }

    const result = await pool.query(
      `
      INSERT INTO teacher_subject_assignments (teacher_id, class_section_id, subject_id)
      VALUES ($1, $2, $3)
      RETURNING id, teacher_id, class_section_id, subject_id, created_at
      `,
      [teacher_id, class_section_id, subject_id]
    );

    return successResponse(res, {
      message: "Teacher subject assignment created successfully",
      data: result.rows[0],
    });
  } catch (err) {
    if (err?.code === "23505") {
      return errorResponse(res, {
        message: "This teacher is already assigned to this subject for this class section",
        error: "Duplicate teacher subject assignment",
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

const deleteAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `
      DELETE FROM teacher_subject_assignments
      WHERE id = $1
      RETURNING id
      `,
      [id]
    );

    if (result.rowCount === 0) {
      return errorResponse(res, {
        message: "Teacher subject assignment not found",
        error: "Not found",
        status: 404,
      });
    }

    return successResponse(res, {
      message: "Teacher subject assignment deleted successfully",
      data: { id },
    });
  } catch (err) {
    console.error(err);
    return errorResponse(res, {
      message: "Error deleting teacher subject assignment",
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
  deleteAssignment,
};
