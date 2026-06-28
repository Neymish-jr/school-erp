const pool = require("../db");

const resolveTeacherIdForUser = async (userRow) => {
  if (!userRow) {
    return null;
  }

  if (userRow.teacher_id != null) {
    return Number(userRow.teacher_id);
  }

  return null;
};

const buildJwtPayload = (userRow) => ({
  id: userRow.id,
  role: userRow.role,
  school_id: userRow.school_id,
  teacher_id:
    userRow.teacher_id != null ? Number(userRow.teacher_id) : null,
});

const fetchUserWithTeacherLink = async (userId, client = pool) => {
  const result = await client.query(
    `
    SELECT
      u.id,
      u.name,
      u.email,
      u.role,
      u.school_id,
      u.teacher_id,
      t.teacher_name,
      t.employee_code,
      t.status AS teacher_status
    FROM users u
    LEFT JOIN teachers t ON t.id = u.teacher_id
    WHERE u.id = $1
  `,
    [userId]
  );

  return result.rows[0] || null;
};

module.exports = {
  resolveTeacherIdForUser,
  buildJwtPayload,
  fetchUserWithTeacherLink,
};
