const pool = require("../db");
const { successResponse, errorResponse } = require("../utils/response");

// Helper to build base SELECT query for assignments
const getBaseAssignmentQuery = () => `
  SELECT
    taca.id,
    taca.teacher_id,
    t.teacher_name,
    taca.administrative_charge_id,
    ac.charge_name,
    taca.academic_year,
    taca.assigned_on,
    taca.relieved_on,
    taca.is_active,
    taca.remarks,
    taca.is_additional_charge,
    taca.assigned_by_user_id,
    u.name AS assigned_by_user_name,
    taca.created_at,
    taca.updated_at
  FROM teacher_administrative_charge_assignments taca
  JOIN teachers t ON t.id = taca.teacher_id
  JOIN administrative_charges ac ON ac.id = taca.administrative_charge_id
  LEFT JOIN users u ON u.id = taca.assigned_by_user_id
`;

const getAssignments = async (req, res) => {
  try {
    const { school_id } = req.user;
    
    const query = `
      ${getBaseAssignmentQuery()}
      WHERE taca.school_id = $1
      ORDER BY taca.is_active DESC, t.teacher_name ASC, ac.charge_name ASC
    `;
    
    const result = await pool.query(query, [school_id]);
    
    return successResponse(res, {
      message: "Assignments fetched successfully",
      data: result.rows
    });
  } catch (err) {
    console.error(err);
    return errorResponse(res, {
      message: "Error fetching assignments",
      error: err.message,
      status: 500
    });
  }
};

const getAssignmentsForTeacher = async (req, res) => {
  try {
    const { school_id } = req.user;
    const { teacherId } = req.params;
    
    // Validate teacher belongs to school
    const teacherCheck = await pool.query(
      "SELECT id FROM teachers WHERE id = $1 AND school_id = $2",
      [teacherId, school_id]
    );
    
    if (teacherCheck.rowCount === 0) {
      return errorResponse(res, { message: "Teacher not found in your school", error: "Not found", status: 404 });
    }
    
    const query = `
      ${getBaseAssignmentQuery()}
      WHERE taca.school_id = $1 AND taca.teacher_id = $2
      ORDER BY taca.is_active DESC, taca.assigned_on DESC
    `;
    
    const result = await pool.query(query, [school_id, teacherId]);
    
    return successResponse(res, {
      message: "Teacher assignments fetched successfully",
      data: result.rows
    });
  } catch (err) {
    console.error(err);
    return errorResponse(res, {
      message: "Error fetching teacher assignments",
      error: err.message,
      status: 500
    });
  }
};

const getAvailableCharges = async (req, res) => {
  try {
    const { school_id } = req.user;
    
    // Fetch active administrative charges NOT currently actively assigned to ANY teacher
    const query = `
      SELECT ac.id, ac.charge_name, ac.description
      FROM administrative_charges ac
      WHERE ac.school_id = $1 AND ac.is_active = true
      AND NOT EXISTS (
        SELECT 1
        FROM teacher_administrative_charge_assignments taca
        WHERE taca.administrative_charge_id = ac.id 
          AND taca.is_active = true 
          AND taca.school_id = $1
      )
      ORDER BY ac.charge_name ASC
    `;
    
    const result = await pool.query(query, [school_id]);
    
    return successResponse(res, {
      message: "Available charges fetched successfully",
      data: result.rows
    });
  } catch (err) {
    console.error(err);
    return errorResponse(res, {
      message: "Error fetching available charges",
      error: err.message,
      status: 500
    });
  }
};

const createAssignment = async (req, res) => {
  try {
    const { school_id, id: assigned_by_user_id } = req.user;
    const { teacher_id, administrative_charge_id, academic_year, remarks, is_additional_charge } = req.body;
    
    // 1. Verify Teacher exists and belongs to school
    const teacherCheck = await pool.query(
      "SELECT id FROM teachers WHERE id = $1 AND school_id = $2",
      [teacher_id, school_id]
    );
    if (teacherCheck.rowCount === 0) {
      return errorResponse(res, { message: "Teacher not found in your school", error: "Validation Error", status: 400 });
    }
    
    // 2. Verify Administrative Charge exists, is active, and belongs to school
    const chargeCheck = await pool.query(
      "SELECT id, is_active FROM administrative_charges WHERE id = $1 AND school_id = $2",
      [administrative_charge_id, school_id]
    );
    if (chargeCheck.rowCount === 0) {
      return errorResponse(res, { message: "Administrative charge not found in your school", error: "Validation Error", status: 400 });
    }

    // 3. Pre-insert Check: Verify that no one else is currently holding this charge
    const activeChargeCheck = await pool.query(
      "SELECT id FROM teacher_administrative_charge_assignments WHERE administrative_charge_id = $1 AND school_id = $2 AND is_active = true",
      [administrative_charge_id, school_id]
    );

    if (activeChargeCheck.rowCount > 0) {
      return errorResponse(res, { 
        message: "This administrative charge is already assigned to another teacher.", 
        error: "Conflict", 
        status: 409 
      });
    }
    
    // 4. Insert new assignment
    const insertQuery = `
      INSERT INTO teacher_administrative_charge_assignments 
        (teacher_id, administrative_charge_id, academic_year, remarks, is_additional_charge, school_id, assigned_by_user_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const result = await pool.query(insertQuery, [
      teacher_id, 
      administrative_charge_id, 
      academic_year, 
      remarks || null, 
      is_additional_charge || false,
      school_id,
      assigned_by_user_id
    ]);
    
    return successResponse(res, {
      message: "Teacher administrative charge assigned successfully",
      data: result.rows[0],
      status: 201
    });
    
  } catch (err) {
    if (err.code === "23505" && err.constraint === "unique_active_charge_per_school") {
      return errorResponse(res, {
        message: "This administrative charge is already assigned to another teacher.",
        error: "Duplicate Active Assignment",
        status: 409
      });
    }
    console.error(err);
    return errorResponse(res, {
      message: "Error creating assignment",
      error: err.message,
      status: 500
    });
  }
};

const updateAssignment = async (req, res) => {
  try {
    const { school_id } = req.user;
    const { id } = req.params;
    const { academic_year, remarks, is_additional_charge } = req.body;
    
    // 1. Initial Lookup
    const checkQuery = "SELECT * FROM teacher_administrative_charge_assignments WHERE id = $1 AND school_id = $2";
    const existing = await pool.query(checkQuery, [id, school_id]);
    
    if (existing.rowCount === 0) {
      return errorResponse(res, { message: "Assignment not found", error: "Not found", status: 404 });
    }
    
    // 2. Reject if Inactive
    if (!existing.rows[0].is_active) {
      return errorResponse(res, { 
        message: "Inactive assignments cannot be modified.", 
        error: "Validation Error", 
        status: 400 
      });
    }
    
    const updates = [];
    const values = [];
    let paramIdx = 1;
    
    if (academic_year !== undefined) {
      updates.push(`academic_year = $${paramIdx++}`);
      values.push(academic_year);
    }
    if (remarks !== undefined) {
      updates.push(`remarks = $${paramIdx++}`);
      values.push(remarks);
    }
    if (is_additional_charge !== undefined) {
      updates.push(`is_additional_charge = $${paramIdx++}`);
      values.push(is_additional_charge);
    }
    
    if (updates.length === 0) {
      return successResponse(res, { message: "No fields to update", data: existing.rows[0] });
    }
    
    updates.push(`updated_at = NOW()`);
    
    // 3. Absolute Safeguard on Update Query
    const updateQuery = `
      UPDATE teacher_administrative_charge_assignments
      SET ${updates.join(", ")}
      WHERE id = $${paramIdx++} 
        AND school_id = $${paramIdx} 
        AND is_active = true
      RETURNING *
    `;
    values.push(id, school_id);
    
    const result = await pool.query(updateQuery, values);
    
    return successResponse(res, {
      message: "Assignment updated successfully",
      data: result.rows[0]
    });
    
  } catch (err) {
    if (err.code === "23505" && err.constraint === "unique_active_charge_per_school") {
      return errorResponse(res, {
        message: "This administrative charge is already assigned to another teacher.",
        error: "Duplicate Active Assignment",
        status: 409
      });
    }
    console.error(err);
    return errorResponse(res, {
      message: "Error updating assignment",
      error: err.message,
      status: 500
    });
  }
};

const relieveAssignment = async (req, res) => {
  try {
    const { school_id } = req.user;
    const { id } = req.params;
    
    const result = await pool.query(`
      UPDATE teacher_administrative_charge_assignments
      SET is_active = false, relieved_on = CURRENT_DATE, updated_at = NOW()
      WHERE id = $1 AND school_id = $2 AND is_active = true
      RETURNING *
    `, [id, school_id]);
    
    if (result.rowCount === 0) {
      return errorResponse(res, { 
        message: "Active assignment not found or already relieved", 
        error: "Not found or already inactive", 
        status: 404 
      });
    }
    
    return successResponse(res, {
      message: "Teacher relieved from charge successfully",
      data: result.rows[0]
    });
    
  } catch (err) {
    console.error(err);
    return errorResponse(res, {
      message: "Error relieving assignment",
      error: err.message,
      status: 500
    });
  }
};

module.exports = {
  getAssignments,
  getAssignmentsForTeacher,
  getAvailableCharges,
  createAssignment,
  updateAssignment,
  relieveAssignment
};
