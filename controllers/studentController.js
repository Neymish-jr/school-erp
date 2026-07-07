const pool = require("../db");
const studentSchema = require("../validators/studentValidator");
const { successResponse, errorResponse } = require("../utils/response");
const AppError = require("../utils/AppError");
const {
  buildSchoolClause,
  resolveSchoolIdForWrite,
  resolveSchoolScope,
} = require("../utils/tenantScope");

const getStudents = async (req, res) => {
  const scope = resolveSchoolScope(req, res);
  if (!scope) {
    return;
  }

  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const offset = (page - 1) * limit;
  const search = req.query.search || "";
  const gender = req.query.gender || "";
  const studentClass =
    req.query.student_class != null && String(req.query.student_class).trim() !== ""
      ? String(req.query.student_class).trim()
      : null;
  const section =
    req.query.section != null && String(req.query.section).trim() !== ""
      ? String(req.query.section).trim()
      : null;

  const params = [`%${search}%`, gender || "%"];
  const schoolClause = buildSchoolClause(scope.role, scope.schoolId, params, "students");

  let classFilterClause = "";
  let sectionFilterClause = "";

  if (studentClass) {
    params.push(studentClass);
    classFilterClause = `AND TRIM(student_class) = $${params.length}`;
  }

  if (section) {
    params.push(section);
    sectionFilterClause = `AND TRIM(section) = $${params.length}`;
  }

  const allowedSortFields = ["name", "gender", "student_class", "created_at"];
  const requestedSort = req.query.sort;
  let sort;

  if (requestedSort) {
    if (!allowedSortFields.includes(requestedSort)) {
      throw new AppError(400, "Invalid sort parameter");
    }
    sort = requestedSort;
  } else {
    sort = "name";
  }

  params.push(limit, offset);
  const limitParam = params.length - 1;
  const offsetParam = params.length;

  const result = await pool.query(
    `
    SELECT *
    FROM students
    WHERE is_active = true
    AND name ILIKE $1
    AND gender ILIKE $2
    ${schoolClause}
    ${classFilterClause}
    ${sectionFilterClause}
    ORDER BY
    CASE
      WHEN '${sort}' = 'student_class' THEN
        CASE student_class
          WHEN 'I' THEN 1
          WHEN 'II' THEN 2
          WHEN 'III' THEN 3
          WHEN 'IV' THEN 4
          WHEN 'V' THEN 5
          WHEN 'VI' THEN 6
          WHEN 'VII' THEN 7
          WHEN 'VIII' THEN 8
          WHEN 'IX' THEN 9
          WHEN 'X' THEN 10
          WHEN 'XI' THEN 11
          WHEN 'XII' THEN 12
          ELSE CAST(student_class AS INTEGER)
        END
    END ASC,
    ${sort} ASC
    LIMIT $${limitParam} OFFSET $${offsetParam}
    `,
    params
  );

  const countParams = params.slice(0, params.length - 2);

  const totalResult = await pool.query(
    `
    SELECT COUNT(*)
    FROM students
    WHERE is_active = true
    AND name ILIKE $1
    AND gender ILIKE $2
    ${schoolClause}
    ${classFilterClause}
    ${sectionFilterClause}
    `,
    countParams
  );

  const totalStudents = parseInt(totalResult.rows[0].count, 10);
  const totalPages = Math.ceil(totalStudents / limit);

  return successResponse(res, {
    message: "Students fetched successfully",
    data: {
      currentPage: page,
      totalPages,
      totalStudents,
      students: result.rows,
    },
  });
};

const createStudent = async (req, res) => {
  const schoolId = resolveSchoolIdForWrite(req, res);
  if (schoolId == null) {
    return;
  }

  const { error } = studentSchema.validate(req.body);

  if (error) {
    return errorResponse(res, {
      message: error.details[0].message,
      error: error.details[0].message,
      status: 400,
    });
  }

  const payload = {
    ...req.body,
    school_id: schoolId,
  };

  const result = await pool
    .query(
      `
      INSERT INTO students
      (name, gender, category, student_class, section, school_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
      [
        payload.name,
        payload.gender,
        payload.category,
        payload.student_class,
        payload.section,
        payload.school_id,
      ]
    )
    .catch((err) => {
      if (err.code === "23503") {
        throw new AppError(400, "Invalid school ID");
      }
      throw err;
    });

  return successResponse(res, {
    message: "Student created successfully",
    data: result.rows[0],
  });
};

const getStudentById = async (req, res) => {
  const scope = resolveSchoolScope(req, res);
  if (!scope) {
    return;
  }

  const { id } = req.params;
  const params = [id];
  const schoolClause = buildSchoolClause(scope.role, scope.schoolId, params, "students");

  const result = await pool.query(
    `
    SELECT * FROM students
    WHERE id = $1
    AND is_active = true
    ${schoolClause}
    `,
    params
  );

  if (result.rows.length === 0) {
    throw new AppError(404, "Student not found");
  }

  return successResponse(res, {
    message: "Student fetched successfully",
    data: result.rows[0],
  });
};

const updateStudent = async (req, res) => {
  const schoolId = resolveSchoolIdForWrite(req, res);
  if (schoolId == null) {
    return;
  }

  const { id } = req.params;
  const { error } = studentSchema.validate(req.body);

  if (error) {
    return errorResponse(res, {
      message: error.details[0].message,
      error: error.details[0].message,
      status: 400,
    });
  }

  const { name, gender, category, student_class, section } = req.body;

  const result = await pool.query(
    `
    UPDATE students
    SET
      name = $1,
      gender = $2,
      category = $3,
      student_class = $4,
      section = $5
    WHERE id = $6
    AND school_id = $7
    AND is_active = true
    RETURNING *
    `,
    [name, gender, category, student_class, section, id, schoolId]
  );

  if (result.rows.length === 0) {
    throw new AppError(404, "Student not found");
  }

  return successResponse(res, {
    message: "Student updated successfully",
    data: result.rows[0],
  });
};

const deleteStudent = async (req, res) => {
  const schoolId = resolveSchoolIdForWrite(req, res);
  if (schoolId == null) {
    return;
  }

  const { id } = req.params;

  const result = await pool.query(
    `
    UPDATE students
    SET is_active = false
    WHERE id = $1
    AND school_id = $2
    AND is_active = true
    RETURNING *
    `,
    [id, schoolId]
  );

  if (result.rows.length === 0) {
    return errorResponse(res, {
      message: "Student not found",
      error: "Student not found",
      status: 404,
    });
  }

  return successResponse(res, {
    message: "Student deleted successfully",
    data: result.rows[0],
  });
};

module.exports = {
  getStudents,
  createStudent,
  getStudentById,
  updateStudent,
  deleteStudent,
};
