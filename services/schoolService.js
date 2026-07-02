const pool = require("../db");

const listSchools = async () => {
  const result = await pool.query(
    `
    SELECT
      id,
      school_name,
      udise_code,
      principal_name,
      phone,
      address
    FROM schools
    ORDER BY school_name ASC, id ASC
    `
  );

  return result.rows;
};

const getSchoolById = async (schoolId) => {
  const result = await pool.query(
    `
    SELECT
      id,
      school_name,
      udise_code,
      principal_name,
      phone,
      address
    FROM schools
    WHERE id = $1
    `,
    [schoolId]
  );

  return result.rows[0] || null;
};

module.exports = {
  listSchools,
  getSchoolById,
};
