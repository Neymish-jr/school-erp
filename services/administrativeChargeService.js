const pool = require("../db");
const { isPmShriChargeCode } = require("../utils/chargeCode");
const { buildSchoolClause } = require("../utils/tenantScope");

const CHARGE_SELECT = `
  ac.id,
  ac.charge_name,
  ac.charge_code,
  ac.description,
  ac.is_active,
  ac.school_id,
  ac.created_at,
  ac.updated_at
`;

const ASSIGNMENT_SELECT = `
  taca.id,
  taca.teacher_id,
  t.teacher_name,
  taca.administrative_charge_id,
  taca.academic_year,
  to_char(taca.assigned_on, 'YYYY-MM-DD') AS assigned_on,
  to_char(taca.relieved_on, 'YYYY-MM-DD') AS relieved_on,
  taca.is_active,
  taca.remarks,
  taca.is_additional_charge,
  taca.assigned_by_user_id,
  u.name AS assigned_by_user_name,
  taca.created_at,
  taca.updated_at
`;

const formatCharge = (row) => ({
  id: row.id,
  charge_name: row.charge_name,
  charge_code: row.charge_code,
  description: row.description,
  is_active: row.is_active,
  school_id: row.school_id,
  is_pm_shri: isPmShriChargeCode(row.charge_code),
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const formatAssignment = (row) => ({
  id: row.id,
  teacher_id: row.teacher_id,
  teacher_name: row.teacher_name,
  administrative_charge_id: row.administrative_charge_id,
  academic_year: row.academic_year,
  assigned_on: row.assigned_on,
  relieved_on: row.relieved_on,
  is_active: row.is_active,
  remarks: row.remarks,
  is_additional_charge: row.is_additional_charge,
  assigned_by_user_id: row.assigned_by_user_id,
  assigned_by_user_name: row.assigned_by_user_name,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const buildFinancialYearSummary = (assignments) => {
  const byYear = new Map();

  for (const assignment of assignments) {
    const year = assignment.academic_year;

    if (!byYear.has(year)) {
      byYear.set(year, {
        academic_year: year,
        teacherIds: new Set(),
        rows: [],
      });
    }

    const entry = byYear.get(year);
    entry.teacherIds.add(assignment.teacher_id);
    entry.rows.push(assignment);
  }

  const summary = [];

  for (const entry of byYear.values()) {
    const hasActiveAssignment = entry.rows.some((row) => row.is_active);
    const activeRow = entry.rows.find((row) => row.is_active) || null;

    const periodStart = entry.rows.reduce((min, row) => {
      if (!min || row.assigned_on < min) {
        return row.assigned_on;
      }

      return min;
    }, null);

    const periodEnd = hasActiveAssignment
      ? null
      : entry.rows.reduce((max, row) => {
          if (!row.relieved_on) {
            return max;
          }

          return !max || row.relieved_on > max ? row.relieved_on : max;
        }, null);

    summary.push({
      academic_year: entry.academic_year,
      holder_count: entry.teacherIds.size,
      assignment_count: entry.rows.length,
      has_active_assignment: hasActiveAssignment,
      active_holder_name: activeRow?.teacher_name ?? null,
      period_start: periodStart,
      period_end: hasActiveAssignment ? null : periodEnd,
      is_current: hasActiveAssignment,
    });
  }

  return summary.sort((left, right) =>
    String(right.academic_year).localeCompare(String(left.academic_year))
  );
};

const getChargeById = async (chargeId, scope) => {
  const params = [chargeId];
  const schoolClause = buildSchoolClause(scope.role, scope.schoolId, params, "ac");

  const result = await pool.query(
    `
    SELECT
      ${CHARGE_SELECT}
    FROM administrative_charges ac
    WHERE ac.id = $1
    ${schoolClause}
    `,
    params
  );

  return result.rows[0] || null;
};

const formatChargeListRow = (row) => ({
  id: row.id,
  charge_name: row.charge_name,
  charge_code: row.charge_code,
  description: row.description,
  is_active: row.is_active,
  school_id: row.school_id,
  created_at: row.created_at,
  updated_at: row.updated_at,
  current_holder_name: row.current_holder_name ?? null,
  current_holder_teacher_id: row.current_holder_teacher_id ?? null,
  current_assignment_id: row.current_assignment_id ?? null,
  is_vacant: Boolean(row.is_vacant),
});

const listAdministrativeCharges = async (scope, { search = "", isActive } = {}) => {
  const params = [`%${search}%`];
  const schoolClause = buildSchoolClause(scope.role, scope.schoolId, params, "ac");

  let query = `
    SELECT
      ${CHARGE_SELECT},
      holder.current_holder_name,
      holder.current_holder_teacher_id,
      holder.current_assignment_id,
      (holder.current_holder_name IS NULL) AS is_vacant
    FROM administrative_charges ac
    LEFT JOIN LATERAL (
      SELECT
        taca.id AS current_assignment_id,
        t.teacher_name AS current_holder_name,
        t.id AS current_holder_teacher_id
      FROM teacher_administrative_charge_assignments taca
      JOIN teachers t ON t.id = taca.teacher_id
      WHERE taca.administrative_charge_id = ac.id
        AND taca.school_id = ac.school_id
        AND taca.is_active = true
      LIMIT 1
    ) holder ON true
    WHERE (
      ac.charge_name ILIKE $1
      OR COALESCE(ac.description, '') ILIKE $1
    )
    ${schoolClause}
  `;

  if (isActive === true || isActive === false) {
    params.push(isActive);
    query += ` AND ac.is_active = $${params.length}`;
  }

  query += `
    ORDER BY ac.is_active DESC, ac.charge_name ASC
  `;

  const result = await pool.query(query, params);
  return result.rows.map(formatChargeListRow);
};

const getAssignmentsForCharge = async (chargeId, scope) => {
  const params = [chargeId];
  let schoolFilter = "";

  if (scope.role === "super_admin") {
    schoolFilter = `
      AND taca.school_id = (
        SELECT school_id
        FROM administrative_charges
        WHERE id = $1
      )
    `;
  } else {
    params.push(scope.schoolId);
    schoolFilter = `AND taca.school_id = $${params.length}`;
  }

  const result = await pool.query(
    `
    SELECT
      ${ASSIGNMENT_SELECT}
    FROM teacher_administrative_charge_assignments taca
    JOIN teachers t ON t.id = taca.teacher_id
    LEFT JOIN users u ON u.id = taca.assigned_by_user_id
    WHERE taca.administrative_charge_id = $1
    ${schoolFilter}
    ORDER BY taca.is_active DESC, taca.assigned_on DESC
    `,
    params
  );

  return result.rows;
};

const getChargeDetails = async (chargeId, scope) => {
  const [chargeRow, assignmentRows] = await Promise.all([
    getChargeById(chargeId, scope),
    getAssignmentsForCharge(chargeId, scope),
  ]);

  if (!chargeRow) {
    return null;
  }

  const assignmentHistory = assignmentRows.map(formatAssignment);
  const currentHolder = assignmentHistory.find((row) => row.is_active) ?? null;

  return {
    charge: formatCharge(chargeRow),
    currentHolder,
    assignmentHistory,
    financialYearSummary: buildFinancialYearSummary(assignmentHistory),
  };
};

module.exports = {
  buildFinancialYearSummary,
  formatAssignment,
  formatCharge,
  formatChargeListRow,
  getAssignmentsForCharge,
  getChargeById,
  getChargeDetails,
  listAdministrativeCharges,
};
