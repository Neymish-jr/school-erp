const {
  ACTIVE_STAFF_STATUS,
  isAssignableTeacherStatus,
} = require("../constants/teacherStatus");

const getTeacherAssignmentEligibility = (teacherRow) => {
  if (!teacherRow) {
    return {
      eligible: false,
      message: "Teacher not found in your school",
      error: "Validation Error",
    };
  }

  const status = teacherRow.status || ACTIVE_STAFF_STATUS;

  if (!isAssignableTeacherStatus(status)) {
    return {
      eligible: false,
      message:
        "Only active teachers can receive new assignments. Update staffing records after relieving existing assignments.",
      error: "Teacher not assignable",
      status,
    };
  }

  return { eligible: true, teacher: teacherRow };
};

const fetchTeacherForAssignment = async (pool, teacherId, schoolId = null) => {
  if (schoolId) {
    const result = await pool.query(
      "SELECT id, status FROM teachers WHERE id = $1 AND school_id = $2",
      [teacherId, schoolId]
    );

    return result.rows[0] || null;
  }

  const result = await pool.query(
    "SELECT id, status FROM teachers WHERE id = $1",
    [teacherId]
  );

  return result.rows[0] || null;
};

module.exports = {
  getTeacherAssignmentEligibility,
  fetchTeacherForAssignment,
};
