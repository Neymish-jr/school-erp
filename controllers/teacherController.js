const pool = require("../db");
const { successResponse, errorResponse } = require("../utils/response");
const AppError = require("../utils/AppError");
const {
  buildSchoolClause,
  resolveSchoolIdForWrite,
  resolveSchoolScope,
} = require("../utils/tenantScope");
const {
  recordTeacherJoining,
  recordTeacherStatusChange,
} = require("../services/staffServiceHistoryRecorder");

const DUPLICATE_EMPLOYEE_CODE_MESSAGE =
  "A teacher with this employee code already exists in your school.";

const handleTeacherWriteError = (err, res, fallbackMessage) => {
  if (err.code === "23505") {
    const constraint = String(err.constraint || "");
    if (constraint.includes("employee_code")) {
      return errorResponse(res, {
        message: DUPLICATE_EMPLOYEE_CODE_MESSAGE,
        error: DUPLICATE_EMPLOYEE_CODE_MESSAGE,
        status: 409,
      });
    }
  }

  console.error(err);
  return errorResponse(res, {
    message: fallbackMessage,
    error: err.message,
    status: 500,
  });
};

const createTeacher = async (req, res) => {
  const schoolId = resolveSchoolIdForWrite(req, res);
  if (schoolId == null) {
    return;
  }

  const {
    teacher_name,
    email,
    phone,
    subject,
    qualification,
    designation,
    age,
    gender,
    employee_code,
  } = req.body;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `
      INSERT INTO teachers
      (
        teacher_name,
        email,
        phone,
        subject,
        qualification,
        designation,
        age,
        gender,
        school_id,
        status,
        employee_code
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
      `,
      [
        teacher_name,
        email,
        phone,
        subject,
        qualification,
        designation?.trim() || null,
        age,
        gender,
        schoolId,
        "active",
        employee_code?.trim() || null,
      ]
    );

    const teacher = result.rows[0];

    await recordTeacherJoining(client, {
      school_id: schoolId,
      teacher_id: teacher.id,
      recorded_by_user_id: req.user?.id || null,
    });

    await client.query("COMMIT");

    return successResponse(res, {
      message: "Teacher created successfully",
      data: teacher,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    return handleTeacherWriteError(err, res, "Error creating teacher");
  } finally {
    client.release();
  }
};

const getTeachers = async (req, res) => {
  const scope = resolveSchoolScope(req, res);
  if (!scope) {
    return;
  }

  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 50;
  const search = String(req.query.search || "").trim();
  const status = String(req.query.status || "").trim();
  const skip = (page - 1) * limit;
  const searchPattern = `%${search}%`;

  const listParams = [searchPattern];
  const schoolClause = buildSchoolClause(scope.role, scope.schoolId, listParams, "teachers");

  let statusClause = "";
  if (status && status !== "all") {
    listParams.push(status);
    statusClause = ` AND teachers.status = $${listParams.length}`;
  }

  listParams.push(limit, skip);

  const result = await pool.query(
    `
    SELECT *
    FROM teachers
    WHERE (
      teachers.teacher_name ILIKE $1
      OR COALESCE(teachers.email, '') ILIKE $1
      OR COALESCE(teachers.phone, '') ILIKE $1
      OR COALESCE(teachers.subject, '') ILIKE $1
    )
    ${schoolClause}
    ${statusClause}
    ORDER BY teachers.id ASC
    LIMIT $${listParams.length - 1}
    OFFSET $${listParams.length}
    `,
    listParams
  );

  const countParams = [searchPattern];
  const countSchoolClause = buildSchoolClause(
    scope.role,
    scope.schoolId,
    countParams,
    "teachers"
  );

  let countStatusClause = "";
  if (status && status !== "all") {
    countParams.push(status);
    countStatusClause = ` AND teachers.status = $${countParams.length}`;
  }

  const countResult = await pool.query(
    `
    SELECT COUNT(*)
    FROM teachers
    WHERE (
      teachers.teacher_name ILIKE $1
      OR COALESCE(teachers.email, '') ILIKE $1
      OR COALESCE(teachers.phone, '') ILIKE $1
      OR COALESCE(teachers.subject, '') ILIKE $1
    )
    ${countSchoolClause}
    ${countStatusClause}
    `,
    countParams
  );

  const totalTeachers = Number(countResult.rows[0].count);
  const totalPages = Math.ceil(totalTeachers / limit) || 1;

  return successResponse(res, {
    message: "Teachers fetched successfully",
    data: {
      teachers: result.rows,
      total: totalTeachers,
      page,
      limit,
      totalPages,
    },
  });
};

const getTeacherById = async (req, res) => {
  const scope = resolveSchoolScope(req, res);
  if (!scope) {
    return;
  }

  const { id } = req.params;
  const params = [id];
  const schoolClause = buildSchoolClause(scope.role, scope.schoolId, params, "teachers");

  const result = await pool.query(
    `
    SELECT *
    FROM teachers
    WHERE id = $1
    ${schoolClause}
    `,
    params
  );

  if (result.rows.length === 0) {
    throw new AppError(404, "Teacher not found");
  }

  return successResponse(res, {
    message: "Teacher fetched successfully",
    data: result.rows[0],
  });
};

const updateTeacher = async (req, res) => {
  const schoolId = resolveSchoolIdForWrite(req, res);
  if (schoolId == null) {
    return;
  }

  const { id } = req.params;
  const {
    teacher_name,
    email,
    phone,
    subject,
    qualification,
    designation,
    gender,
    status,
    age,
    employee_code,
  } = req.body;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existingResult = await client.query(
      `
      SELECT *
      FROM teachers
      WHERE id = $1
      AND school_id = $2
      FOR UPDATE
      `,
      [id, schoolId]
    );

    if (existingResult.rows.length === 0) {
      await client.query("ROLLBACK");
      throw new AppError(404, "Teacher not found");
    }

    const existing = existingResult.rows[0];
    const nextStatus = status ?? existing.status;

    const result = await client.query(
      `
      UPDATE teachers
      SET
        teacher_name = $1,
        email = $2,
        phone = $3,
        subject = $4,
        qualification = $5,
        designation = $6,
        gender = $7,
        status = $8,
        age = $9,
        employee_code = $10
      WHERE id = $11
      AND school_id = $12
      RETURNING *
      `,
      [
        teacher_name ?? existing.teacher_name,
        email !== undefined ? email : existing.email,
        phone ?? existing.phone,
        subject !== undefined ? subject : existing.subject,
        qualification !== undefined ? qualification : existing.qualification,
        designation !== undefined ? designation : existing.designation,
        gender ?? existing.gender,
        nextStatus,
        age ?? existing.age,
        employee_code !== undefined
          ? employee_code?.trim() || null
          : existing.employee_code,
        id,
        schoolId,
      ]
    );

    if (existing.status !== nextStatus) {
      await recordTeacherStatusChange(client, {
        school_id: schoolId,
        teacher_id: Number(id),
        from_status: existing.status,
        to_status: nextStatus,
        recorded_by_user_id: req.user?.id || null,
      });
    }

    await client.query("COMMIT");

    return successResponse(res, {
      message: "Teacher updated successfully",
      data: result.rows[0],
    });
  } catch (err) {
    await client.query("ROLLBACK");

    if (err instanceof AppError) {
      return errorResponse(res, {
        message: err.message,
        error: err.message,
        status: err.statusCode,
      });
    }

    return handleTeacherWriteError(err, res, "Error updating teacher");
  } finally {
    client.release();
  }
};

const deleteTeacher = async (req, res) => {
  try {
    const schoolId = resolveSchoolIdForWrite(req, res);
    if (schoolId == null) {
      return;
    }

    const { id } = req.params;

    const result = await pool.query(
      `
      DELETE FROM teachers
      WHERE id = $1
      AND school_id = $2
      RETURNING *
      `,
      [id, schoolId]
    );

    if (result.rows.length === 0) {
      return errorResponse(res, {
        message: "Teacher not found",
        error: "Teacher not found",
        status: 404,
      });
    }

    return successResponse(res, {
      message: "Teacher deleted successfully",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("DELETE TEACHER ERROR");
    console.error(err);

    if (err.code === "23503") {
      return errorResponse(res, {
        message:
          "This teacher cannot be deleted because they are linked to existing activities.",
        error: "Teacher has linked activities",
        status: 409,
      });
    }

    if (err instanceof AppError) {
      return errorResponse(res, {
        message: err.message,
        error: err.message,
        status: err.statusCode,
      });
    }

    return errorResponse(res, {
      message: "Error deleting teacher",
      error: err.message,
      status: 500,
    });
  }
};

module.exports = {
  createTeacher,
  getTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
};
