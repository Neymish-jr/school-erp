const pool = require("../db");
const AppError = require("../utils/AppError");
const { FINANCIAL_YEAR_STATUS } = require("../constants/financialYearStatus");
const { assertActiveBudgetSubHead } = require("./budgetSubHeadService");

const ALLOCATION_SELECT = `
  ba.id,
  ba.school_id,
  ba.financial_year_id,
  ba.budget_sub_head_id,
  ba.allocated_amount,
  ba.responsible_teacher_id,
  ba.remarks,
  ba.is_active,
  ba.created_by_user_id,
  ba.created_at,
  ba.updated_at,
  fy.year_label,
  fy.status AS financial_year_status,
  bh.id AS budget_head_id,
  bh.head_code AS budget_head_code,
  bh.head_name AS budget_head_name,
  bsh.sub_head_code,
  bsh.sub_head_name,
  t.teacher_name AS responsible_teacher_name
`;

const ALLOCATION_FROM = `
  FROM budget_allocations ba
  INNER JOIN financial_years fy ON fy.id = ba.financial_year_id
  INNER JOIN budget_sub_heads bsh ON bsh.id = ba.budget_sub_head_id
  INNER JOIN budget_heads bh ON bh.id = bsh.budget_head_id
  LEFT JOIN teachers t ON t.id = ba.responsible_teacher_id
`;

const assertActiveFinancialYear = async (financialYearId, schoolId, client = pool) => {
  const result = await client.query(
    `
    SELECT id, status
    FROM financial_years
    WHERE id = $1
      AND school_id = $2
    `,
    [financialYearId, schoolId]
  );

  if (result.rowCount === 0) {
    throw new AppError(404, "Financial year not found");
  }

  if (result.rows[0].status !== FINANCIAL_YEAR_STATUS.ACTIVE) {
    throw new AppError(400, "Budget allocations can only be created for the active financial year");
  }

  return result.rows[0];
};

const assertResponsibleTeacher = async (teacherId, schoolId, client = pool) => {
  if (teacherId == null) {
    return null;
  }

  const result = await client.query(
    `
    SELECT id
    FROM teachers
    WHERE id = $1
      AND school_id = $2
    `,
    [teacherId, schoolId]
  );

  if (result.rowCount === 0) {
    throw new AppError(400, "Responsible teacher must belong to this school");
  }

  return result.rows[0];
};

const listBudgetAllocations = async ({
  schoolId,
  financialYearId,
  budgetSubHeadId,
  budgetHeadId,
  responsibleTeacherId,
  isActive,
}) => {
  const params = [schoolId];
  let query = `
    SELECT ${ALLOCATION_SELECT}
    ${ALLOCATION_FROM}
    WHERE ba.school_id = $1
  `;

  if (financialYearId) {
    params.push(financialYearId);
    query += ` AND ba.financial_year_id = $${params.length}`;
  }

  if (budgetSubHeadId) {
    params.push(budgetSubHeadId);
    query += ` AND ba.budget_sub_head_id = $${params.length}`;
  }

  if (budgetHeadId) {
    params.push(budgetHeadId);
    query += ` AND bh.id = $${params.length}`;
  }

  if (responsibleTeacherId) {
    params.push(responsibleTeacherId);
    query += ` AND ba.responsible_teacher_id = $${params.length}`;
  }

  if (isActive === true || isActive === false) {
    params.push(isActive);
    query += ` AND ba.is_active = $${params.length}`;
  }

  query += `
    ORDER BY ba.is_active DESC, bh.head_name ASC, bsh.sub_head_name ASC
  `;

  const result = await pool.query(query, params);
  return result.rows;
};

const getBudgetAllocationSummary = async (schoolId, financialYearId) => {
  const params = [schoolId];
  let fyFilter = "";

  if (financialYearId) {
    params.push(financialYearId);
    fyFilter = ` AND ba.financial_year_id = $${params.length}`;
  }

  const totals = await pool.query(
    `
    SELECT
      COALESCE(SUM(ba.allocated_amount) FILTER (WHERE ba.is_active = TRUE), 0) AS total_allocated,
      COUNT(*) FILTER (WHERE ba.is_active = TRUE) AS active_allocation_count
    FROM budget_allocations ba
    WHERE ba.school_id = $1
      ${fyFilter}
    `,
    params
  );

  const byHead = await pool.query(
    `
    SELECT
      bh.id AS budget_head_id,
      bh.head_name AS budget_head_name,
      COALESCE(SUM(ba.allocated_amount) FILTER (WHERE ba.is_active = TRUE), 0) AS total_allocated,
      COUNT(*) FILTER (WHERE ba.is_active = TRUE) AS allocation_count
    FROM budget_allocations ba
    INNER JOIN budget_sub_heads bsh ON bsh.id = ba.budget_sub_head_id
    INNER JOIN budget_heads bh ON bh.id = bsh.budget_head_id
    WHERE ba.school_id = $1
      ${fyFilter}
    GROUP BY bh.id, bh.head_name
    ORDER BY bh.head_name ASC
    `,
    params
  );

  return {
    totals: totals.rows[0],
    by_head: byHead.rows,
  };
};

const getBudgetAllocationById = async (id, schoolId) => {
  const result = await pool.query(
    `
    SELECT ${ALLOCATION_SELECT}
    ${ALLOCATION_FROM}
    WHERE ba.id = $1
      AND ba.school_id = $2
    `,
    [id, schoolId]
  );

  if (result.rowCount === 0) {
    throw new AppError(404, "Budget allocation not found");
  }

  return result.rows[0];
};

const createBudgetAllocation = async ({
  schoolId,
  userId,
  financialYearId,
  budgetSubHeadId,
  allocatedAmount,
  responsibleTeacherId = null,
  remarks = "",
}) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await assertActiveFinancialYear(financialYearId, schoolId, client);
    await assertActiveBudgetSubHead(budgetSubHeadId, client);
    await assertResponsibleTeacher(responsibleTeacherId, schoolId, client);

    const result = await client.query(
      `
      INSERT INTO budget_allocations (
        school_id,
        financial_year_id,
        budget_sub_head_id,
        allocated_amount,
        responsible_teacher_id,
        remarks,
        created_by_user_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
      `,
      [
        schoolId,
        financialYearId,
        budgetSubHeadId,
        allocatedAmount,
        responsibleTeacherId,
        remarks || null,
        userId,
      ]
    );

    await client.query("COMMIT");
    return getBudgetAllocationById(result.rows[0].id, schoolId);
  } catch (err) {
    await client.query("ROLLBACK");

    if (err.code === "23505") {
      throw new AppError(
        409,
        "An allocation already exists for this budget sub head in the selected financial year"
      );
    }

    throw err;
  } finally {
    client.release();
  }
};

const updateBudgetAllocation = async ({
  id,
  schoolId,
  allocatedAmount,
  responsibleTeacherId = null,
  remarks = "",
}) => {
  const existing = await getBudgetAllocationById(id, schoolId);

  if (!existing.is_active) {
    throw new AppError(400, "Inactive budget allocations cannot be edited");
  }

  await assertResponsibleTeacher(responsibleTeacherId, schoolId);

  const result = await pool.query(
    `
    UPDATE budget_allocations
    SET
      allocated_amount = $1,
      responsible_teacher_id = $2,
      remarks = $3,
      updated_at = NOW()
    WHERE id = $4
      AND school_id = $5
    RETURNING id
    `,
    [allocatedAmount, responsibleTeacherId, remarks || null, id, schoolId]
  );

  return getBudgetAllocationById(result.rows[0].id, schoolId);
};

const updateBudgetAllocationStatus = async (id, schoolId, isActive) => {
  const result = await pool.query(
    `
    UPDATE budget_allocations
    SET
      is_active = $1,
      updated_at = NOW()
    WHERE id = $2
      AND school_id = $3
    RETURNING id
    `,
    [Boolean(isActive), id, schoolId]
  );

  if (result.rowCount === 0) {
    throw new AppError(404, "Budget allocation not found");
  }

  return getBudgetAllocationById(result.rows[0].id, schoolId);
};

module.exports = {
  listBudgetAllocations,
  getBudgetAllocationSummary,
  getBudgetAllocationById,
  createBudgetAllocation,
  updateBudgetAllocation,
  updateBudgetAllocationStatus,
};
