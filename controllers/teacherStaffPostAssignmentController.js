const pool = require("../db");
const { successResponse, errorResponse } = require("../utils/response");

const getBaseAssignmentQuery = () => `
  SELECT
    tspa.id,
    tspa.school_id,
    tspa.teacher_id,
    t.teacher_name,
    t.designation AS teacher_designation,
    tspa.staff_post_id,
    sp.post_name,
    sp.post_code,
    sp.staff_category AS staff_post_category,
    tspa.assignment_start_date,
    tspa.assignment_end_date,
    tspa.is_active,
    tspa.assigned_by_user_id,
    u.name AS assigned_by_user_name,
    tspa.remarks,
    tspa.created_at,
    tspa.updated_at
  FROM teacher_staff_post_assignments tspa
  JOIN teachers t ON t.id = tspa.teacher_id
  JOIN staff_posts sp ON sp.id = tspa.staff_post_id
  LEFT JOIN users u ON u.id = tspa.assigned_by_user_id
`;

const getAssignments = async (req, res) => {
  try {
    const { school_id } = req.user;
    const { teacher_id, staff_post_id, is_active } = req.query;
    const params = [school_id];
    let query = `${getBaseAssignmentQuery()} WHERE tspa.school_id = $1`;

    if (teacher_id) {
      params.push(teacher_id);
      query += ` AND tspa.teacher_id = $${params.length}`;
    }
    if (staff_post_id) {
      params.push(staff_post_id);
      query += ` AND tspa.staff_post_id = $${params.length}`;
    }
    if (is_active === "true" || is_active === "false") {
      params.push(is_active === "true");
      query += ` AND tspa.is_active = $${params.length}`;
    }

    query += ` ORDER BY tspa.is_active DESC, tspa.assignment_start_date DESC`;

    const result = await pool.query(query, params);

    return successResponse(res, {
      message: "Teacher staff post assignments fetched successfully",
      data: result.rows,
    });
  } catch (err) {
    console.error(err);
    return errorResponse(res, {
      message: "Error fetching teacher staff post assignments",
      error: err.message,
      status: 500,
    });
  }
};

const getAssignmentsForTeacher = async (req, res) => {
  try {
    const { school_id } = req.user;
    const { teacherId } = req.params;

    // Verify teacher belongs to school
    const teacherCheck = await pool.query(
      "SELECT id FROM teachers WHERE id = $1 AND school_id = $2",
      [teacherId, school_id]
    );
    if (teacherCheck.rowCount === 0) {
      return errorResponse(res, {
        message: "Teacher not found in your school",
        error: "Not found",
        status: 404,
      });
    }

    const query = `${getBaseAssignmentQuery()} WHERE tspa.school_id = $1 AND tspa.teacher_id = $2 ORDER BY tspa.is_active DESC, tspa.assignment_start_date DESC`;
    const result = await pool.query(query, [school_id, teacherId]);

    return successResponse(res, {
      message: "Teacher staff post assignments fetched successfully",
      data: result.rows,
    });
  } catch (err) {
    console.error(err);
    return errorResponse(res, {
      message: "Error fetching teacher staff post assignments",
      error: err.message,
      status: 500,
    });
  }
};

const getCurrentAssignmentForTeacher = async (req, res) => {
  try {
    const { school_id } = req.user;
    const { teacherId } = req.params;

    // Verify teacher belongs to school
    const teacherCheck = await pool.query(
      "SELECT id FROM teachers WHERE id = $1 AND school_id = $2",
      [teacherId, school_id]
    );
    if (teacherCheck.rowCount === 0) {
      return errorResponse(res, {
        message: "Teacher not found in your school",
        error: "Not found",
        status: 404,
      });
    }

    const query = `${getBaseAssignmentQuery()} WHERE tspa.school_id = $1 AND tspa.teacher_id = $2 AND tspa.is_active = TRUE`;
    const result = await pool.query(query, [school_id, teacherId]);

    // Return success with data: null if no active assignment, instead of 404
    return successResponse(res, {
      message: result.rows.length > 0 ? "Current assignment fetched successfully" : "No active assignment found for teacher",
      data: result.rows.length > 0 ? result.rows[0] : null,
    });
  } catch (err) {
    console.error(err);
    return errorResponse(res, {
      message: "Error fetching current assignment for teacher",
      error: err.message,
      status: 500,
    });
  }
};

const getAssignmentsForStaffPost = async (req, res) => {
  try {
    const { school_id } = req.user;
    const { staffPostId } = req.params;

    // Verify staff post belongs to school
    const staffPostCheck = await pool.query(
      "SELECT id FROM staff_posts WHERE id = $1 AND school_id = $2",
      [staffPostId, school_id]
    );
    if (staffPostCheck.rowCount === 0) {
      return errorResponse(res, {
        message: "Staff post not found in your school",
        error: "Not found",
        status: 404,
      });
    }

    const query = `${getBaseAssignmentQuery()} WHERE tspa.school_id = $1 AND tspa.staff_post_id = $2 ORDER BY tspa.is_active DESC, tspa.assignment_start_date DESC`;
    const result = await pool.query(query, [school_id, staffPostId]);

    return successResponse(res, {
      message: "Staff post assignments fetched successfully",
      data: result.rows,
    });
  } catch (err) {
    console.error(err);
    return errorResponse(res, {
      message: "Error fetching staff post assignments",
      error: err.message,
      status: 500,
    });
  }
};

const getVacantStaffPosts = async (req, res) => {
  try {
    const { school_id } = req.user;

    const query = `
      SELECT sp.id, sp.post_name, sp.post_code, sp.staff_category
      FROM staff_posts sp
      WHERE sp.school_id = $1 AND sp.is_active = TRUE
      AND NOT EXISTS (
        SELECT 1
        FROM teacher_staff_post_assignments tspa
        WHERE tspa.staff_post_id = sp.id
          AND tspa.school_id = $1
          AND tspa.is_active = TRUE
      )
      ORDER BY sp.post_name ASC
    `;
    const result = await pool.query(query, [school_id]);

    return successResponse(res, {
      message: "Vacant staff posts fetched successfully",
      data: result.rows,
    });
  } catch (err) {
    console.error(err);
    return errorResponse(res, {
      message: "Error fetching vacant staff posts",
      error: err.message,
      status: 500,
    });
  }
};

const createAssignment = async (req, res) => {
  try {
    const { school_id, id: assigned_by_user_id } = req.user;
    const { teacher_id, staff_post_id, assignment_start_date, remarks } = req.body;

    // 1. Verify Teacher exists and belongs to school
    const teacherCheck = await pool.query(
      "SELECT id FROM teachers WHERE id = $1 AND school_id = $2",
      [teacher_id, school_id]
    );
    if (teacherCheck.rowCount === 0) {
      return errorResponse(res, { message: "Teacher not found in your school", error: "Validation Error", status: 400 });
    }

    // 2. Verify Staff Post exists and belongs to school
    const staffPostCheck = await pool.query(
      "SELECT id FROM staff_posts WHERE id = $1 AND school_id = $2",
      [staff_post_id, school_id]
    );
    if (staffPostCheck.rowCount === 0) {
      return errorResponse(res, { message: "Staff post not found in your school", error: "Validation Error", status: 400 });
    }

    // 3. Check for active assignment for the teacher (unique_active_post_per_teacher_per_school)
    const activeTeacherAssignmentCheck = await pool.query(
      "SELECT id FROM teacher_staff_post_assignments WHERE teacher_id = $1 AND school_id = $2 AND is_active = TRUE",
      [teacher_id, school_id]
    );
    if (activeTeacherAssignmentCheck.rowCount > 0) {
      return errorResponse(res, {
        message: "This teacher is already assigned to an active staff post.",
        error: "Conflict",
        status: 409,
      });
    }

    // 4. Check for active assignment for the staff post (unique_active_teacher_per_post_per_school)
    const activeStaffPostAssignmentCheck = await pool.query(
      "SELECT id FROM teacher_staff_post_assignments WHERE staff_post_id = $1 AND school_id = $2 AND is_active = TRUE",
      [staff_post_id, school_id]
    );
    if (activeStaffPostAssignmentCheck.rowCount > 0) {
      return errorResponse(res, {
        message: "This staff post is already assigned to an active teacher.",
        error: "Conflict",
        status: 409,
      });
    }

    // 5. Insert new assignment
    const insertQuery = `
      INSERT INTO teacher_staff_post_assignments
        (school_id, teacher_id, staff_post_id, assignment_start_date, remarks, assigned_by_user_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const result = await pool.query(insertQuery, [
      school_id,
      teacher_id,
      staff_post_id,
      assignment_start_date,
      remarks || null,
      assigned_by_user_id,
    ]);

    return successResponse(res, {
      message: "Teacher staff post assigned successfully",
      data: result.rows[0],
      status: 201,
    });
  } catch (err) {
    console.error(err);
    // Catch specific PostgreSQL unique constraint violation for robust error handling
    if (err.code === "23505") { // unique_violation
        if (err.constraint === "unique_active_post_per_teacher_per_school") {
            return errorResponse(res, {
                message: "This teacher is already assigned to an active staff post.",
                error: "Duplicate Active Assignment for Teacher",
                status: 409
            });
        }
        if (err.constraint === "unique_active_teacher_per_post_per_school") {
            return errorResponse(res, {
                message: "This staff post is already assigned to an active teacher.",
                error: "Duplicate Active Assignment for Staff Post",
                status: 409
            });
        }
    }
    return errorResponse(res, {
      message: "Error creating teacher staff post assignment",
      error: err.message,
      status: 500,
    });
  }
};

const relieveAssignment = async (req, res) => {
  try {
    const { school_id } = req.user;
    const { id } = req.params;
    const { assignment_end_date } = req.body; // Expect assignment_end_date from body

    const result = await pool.query(
      `
      UPDATE teacher_staff_post_assignments
      SET is_active = FALSE,
          assignment_end_date = $1,
          updated_at = NOW()
      WHERE id = $2 AND school_id = $3 AND is_active = TRUE
      RETURNING *
      `,
      [assignment_end_date, id, school_id]
    );

    if (result.rowCount === 0) {
      return errorResponse(res, {
        message: "Active assignment not found or already relieved",
        error: "Not found or already inactive",
        status: 404,
      });
    }

    return successResponse(res, {
      message: "Teacher relieved from staff post successfully",
      data: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    return errorResponse(res, {
      message: "Error relieving teacher from staff post",
      error: err.message,
      status: 500,
    });
  }
};

module.exports = {
  getAssignments,
  getAssignmentsForTeacher,
  getCurrentAssignmentForTeacher,
  getAssignmentsForStaffPost,
  getVacantStaffPosts,
  createAssignment,
  relieveAssignment,
};