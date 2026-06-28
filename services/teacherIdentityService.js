const pool = require("../db");
const AppError = require("../utils/AppError");
const { fetchUserWithTeacherLink } = require("../utils/teacherIdentity");

const assertUserInScope = (userRow, scope) => {
  if (!userRow) {
    throw new AppError(404, "User not found");
  }

  if (scope.role !== "super_admin" && userRow.school_id !== scope.schoolId) {
    throw new AppError(404, "User not found in your school");
  }
};

const assertTeacherInSchool = async (teacherId, schoolId, client = pool) => {
  const result = await client.query(
    `
    SELECT id, teacher_name, employee_code, school_id, status
    FROM teachers
    WHERE id = $1 AND school_id = $2
    `,
    [teacherId, schoolId]
  );

  if (result.rowCount === 0) {
    throw new AppError(404, "Teacher not found in the user's school");
  }

  return result.rows[0];
};

const getTeacherLinkForUser = async (userId, scope) => {
  const userRow = await fetchUserWithTeacherLink(userId);
  assertUserInScope(userRow, scope);

  return {
    user_id: userRow.id,
    user_name: userRow.name,
    user_role: userRow.role,
    school_id: userRow.school_id,
    teacher_id: userRow.teacher_id,
    teacher_name: userRow.teacher_name,
    employee_code: userRow.employee_code,
    teacher_status: userRow.teacher_status,
    is_linked: userRow.teacher_id != null,
  };
};

const linkUserToTeacher = async (userId, teacherId, scope) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const userResult = await client.query(
      `
      SELECT id, name, role, school_id, teacher_id
      FROM users
      WHERE id = $1
      FOR UPDATE
      `,
      [userId]
    );
    const userRow = userResult.rows[0];
    assertUserInScope(userRow, scope);

    if (userRow.role !== "teacher") {
      throw new AppError(
        400,
        "Only users with role 'teacher' can be linked to a teacher profile"
      );
    }

    const teacherRow = await assertTeacherInSchool(
      teacherId,
      userRow.school_id,
      client
    );

    const existingLink = await client.query(
      `
      SELECT id, name
      FROM users
      WHERE teacher_id = $1
        AND id <> $2
      LIMIT 1
      `,
      [teacherId, userId]
    );

    if (existingLink.rowCount > 0) {
      throw new AppError(
        409,
        `Teacher is already linked to user ${existingLink.rows[0].name} (id ${existingLink.rows[0].id})`
      );
    }

    await client.query(
      `
      UPDATE users
      SET teacher_id = $1
      WHERE id = $2
      `,
      [teacherId, userId]
    );

    await client.query("COMMIT");

    return {
      user_id: userRow.id,
      user_name: userRow.name,
      teacher_id: teacherRow.id,
      teacher_name: teacherRow.teacher_name,
      employee_code: teacherRow.employee_code,
      teacher_status: teacherRow.status,
      is_linked: true,
      previous_teacher_id: userRow.teacher_id,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

const unlinkUserFromTeacher = async (userId, scope) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const userResult = await client.query(
      `
      SELECT id, name, role, school_id, teacher_id
      FROM users
      WHERE id = $1
      FOR UPDATE
      `,
      [userId]
    );
    const userRow = userResult.rows[0];
    assertUserInScope(userRow, scope);

    if (userRow.teacher_id == null) {
      throw new AppError(400, "User is not linked to a teacher profile");
    }

    const previousTeacherId = userRow.teacher_id;

    await client.query(
      `
      UPDATE users
      SET teacher_id = NULL
      WHERE id = $1
      `,
      [userId]
    );

    await client.query("COMMIT");

    return {
      user_id: userRow.id,
      user_name: userRow.name,
      previous_teacher_id: previousTeacherId,
      is_linked: false,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

module.exports = {
  getTeacherLinkForUser,
  linkUserToTeacher,
  unlinkUserFromTeacher,
};
