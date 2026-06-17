const pool = require("../db");
const AppError = require("../utils/AppError");
const {
  EXPENSE_REQUEST_STATUS,
  COMMITTED_STATUSES,
} = require("../constants/expenseRequestStatus");
const { FINANCIAL_YEAR_STATUS } = require("../constants/financialYearStatus");

const REQUEST_SELECT = `
  er.id,
  er.school_id,
  er.budget_allocation_id,
  er.requested_amount,
  er.purpose,
  er.vendor_name,
  er.remarks,
  er.status,
  er.created_by_user_id,
  er.submitted_by_user_id,
  er.submitted_at,
  er.reviewed_by_user_id,
  er.reviewed_at,
  er.rejection_remarks,
  er.paid_at,
  er.payment_voucher_no,
  er.payment_transaction_id,
  er.created_at,
  er.updated_at,
  ba.financial_year_id,
  ba.allocated_amount,
  ba.is_active AS allocation_is_active,
  fy.year_label,
  fy.status AS financial_year_status,
  bh.head_name AS budget_head_name,
  bh.head_code AS budget_head_code,
  bsh.sub_head_name,
  bsh.sub_head_code,
  creator.name AS created_by_name,
  submitter.name AS submitted_by_name,
  reviewer.name AS reviewed_by_name
`;

const REQUEST_FROM = `
  FROM expense_requests er
  INNER JOIN budget_allocations ba ON ba.id = er.budget_allocation_id
  INNER JOIN financial_years fy ON fy.id = ba.financial_year_id
  INNER JOIN budget_sub_heads bsh ON bsh.id = ba.budget_sub_head_id
  INNER JOIN budget_heads bh ON bh.id = bsh.budget_head_id
  INNER JOIN users creator ON creator.id = er.created_by_user_id
  LEFT JOIN users submitter ON submitter.id = er.submitted_by_user_id
  LEFT JOIN users reviewer ON reviewer.id = er.reviewed_by_user_id
`;

const getCommittedAmountSql = (excludeRequestIdParam = null) => {
  const excludeClause = excludeRequestIdParam
    ? `AND er.id <> $${excludeRequestIdParam}`
    : "";
  const statusList = COMMITTED_STATUSES.map((status) => `'${status}'`).join(", ");

  return `
    SELECT COALESCE(SUM(er.requested_amount), 0) AS committed_amount
    FROM expense_requests er
    WHERE er.budget_allocation_id = $1
      AND er.status IN (${statusList})
      ${excludeClause}
  `;
};

const getAllocationBalance = async (
  budgetAllocationId,
  schoolId,
  client = pool,
  excludeRequestId = null
) => {
  const params = [budgetAllocationId];
  const committedQuery = getCommittedAmountSql(excludeRequestId ? 2 : null);

  if (excludeRequestId) {
    params.push(excludeRequestId);
  }

  const allocationResult = await client.query(
    `
    SELECT
      ba.id,
      ba.school_id,
      ba.allocated_amount,
      ba.is_active,
      fy.status AS financial_year_status
    FROM budget_allocations ba
    INNER JOIN financial_years fy ON fy.id = ba.financial_year_id
    WHERE ba.id = $1
      ${schoolId != null ? "AND ba.school_id = $2" : ""}
    `,
    schoolId != null ? [budgetAllocationId, schoolId] : [budgetAllocationId]
  );

  if (allocationResult.rowCount === 0) {
    throw new AppError(404, "Budget allocation not found");
  }

  const allocation = allocationResult.rows[0];
  const committedResult = await client.query(committedQuery, params);
  const committedAmount = Number(committedResult.rows[0].committed_amount);
  const allocatedAmount = Number(allocation.allocated_amount);

  return {
    budget_allocation_id: allocation.id,
    allocated_amount: allocatedAmount,
    committed_amount: committedAmount,
    available_balance: allocatedAmount - committedAmount,
    allocation_is_active: allocation.is_active,
    financial_year_status: allocation.financial_year_status,
  };
};

const assertAllocationEligible = async (budgetAllocationId, schoolId, client = pool) => {
  const result = await client.query(
    `
    SELECT
      ba.id,
      ba.is_active,
      fy.status AS financial_year_status
    FROM budget_allocations ba
    INNER JOIN financial_years fy ON fy.id = ba.financial_year_id
    WHERE ba.id = $1
      AND ba.school_id = $2
    `,
    [budgetAllocationId, schoolId]
  );

  if (result.rowCount === 0) {
    throw new AppError(404, "Budget allocation not found");
  }

  const row = result.rows[0];

  if (!row.is_active) {
    throw new AppError(400, "Budget allocation must be active");
  }

  if (row.financial_year_status !== FINANCIAL_YEAR_STATUS.ACTIVE) {
    throw new AppError(400, "Expense requests require an active financial year");
  }

  return row;
};

const assertAllocationAvailableForRequest = async (
  budgetAllocationId,
  schoolId,
  requestedAmount,
  client = pool,
  excludeRequestId = null
) => {
  const balance = await getAllocationBalance(
    budgetAllocationId,
    schoolId,
    client,
    excludeRequestId
  );

  if (!balance.allocation_is_active) {
    throw new AppError(400, "Budget allocation must be active");
  }

  if (balance.financial_year_status !== FINANCIAL_YEAR_STATUS.ACTIVE) {
    throw new AppError(400, "Expense requests require an active financial year");
  }

  if (Number(requestedAmount) > balance.available_balance) {
    throw new AppError(409, "Insufficient allocation balance");
  }

  return balance;
};

const getExpenseRequestById = async (id, schoolId = null, userId = null, role = null) => {
  const params = [id];
  let query = `
    SELECT ${REQUEST_SELECT}
    ${REQUEST_FROM}
    WHERE er.id = $1
  `;

  if (schoolId != null && role !== "super_admin") {
    params.push(schoolId);
    query += ` AND er.school_id = $${params.length}`;
  }

  if (role === "teacher" && userId != null) {
    params.push(userId);
    query += ` AND er.created_by_user_id = $${params.length}`;
  }

  const result = await pool.query(query, params);

  if (result.rowCount === 0) {
    throw new AppError(404, "Expense request not found");
  }

  const row = result.rows[0];
  const balance = await getAllocationBalance(row.budget_allocation_id, row.school_id);

  return {
    ...row,
    committed_amount: balance.committed_amount,
    available_balance: balance.available_balance,
  };
};

const listExpenseRequests = async ({
  schoolId,
  userId,
  role,
  status,
  budgetAllocationId,
  financialYearId,
  submittedByUserId,
}) => {
  const params = [];
  let query = `
    SELECT ${REQUEST_SELECT}
    ${REQUEST_FROM}
    WHERE 1=1
  `;

  if (role !== "super_admin" && schoolId != null) {
    params.push(schoolId);
    query += ` AND er.school_id = $${params.length}`;
  }

  if (role === "teacher" && userId != null) {
    params.push(userId);
    query += ` AND er.created_by_user_id = $${params.length}`;
  }

  if (status) {
    params.push(status);
    query += ` AND er.status = $${params.length}`;
  }

  if (budgetAllocationId) {
    params.push(budgetAllocationId);
    query += ` AND er.budget_allocation_id = $${params.length}`;
  }

  if (financialYearId) {
    params.push(financialYearId);
    query += ` AND ba.financial_year_id = $${params.length}`;
  }

  if (submittedByUserId) {
    params.push(submittedByUserId);
    query += ` AND er.submitted_by_user_id = $${params.length}`;
  }

  query += ` ORDER BY er.created_at DESC, er.id DESC`;

  const result = await pool.query(query, params);
  return result.rows;
};

const getExpenseRequestSummary = async ({ schoolId, role, userId, financialYearId }) => {
  const params = [];
  let whereClause = "WHERE 1=1";

  if (role !== "super_admin" && schoolId != null) {
    params.push(schoolId);
    whereClause += ` AND er.school_id = $${params.length}`;
  }

  if (role === "teacher" && userId != null) {
    params.push(userId);
    whereClause += ` AND er.created_by_user_id = $${params.length}`;
  }

  if (financialYearId) {
    params.push(financialYearId);
    whereClause += ` AND ba.financial_year_id = $${params.length}`;
  }

  const result = await pool.query(
    `
    SELECT
      er.status,
      COUNT(*)::int AS request_count,
      COALESCE(SUM(er.requested_amount), 0) AS total_amount
    FROM expense_requests er
    INNER JOIN budget_allocations ba ON ba.id = er.budget_allocation_id
    ${whereClause}
    GROUP BY er.status
    ORDER BY er.status ASC
    `,
    params
  );

  return result.rows;
};

const createExpenseRequest = async ({
  schoolId,
  userId,
  budgetAllocationId,
  requestedAmount,
  purpose,
  vendorName = "",
  remarks = "",
}) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const allocationCheck = await client.query(
      `
      SELECT ba.id, ba.school_id
      FROM budget_allocations ba
      WHERE ba.id = $1 AND ba.school_id = $2
      `,
      [budgetAllocationId, schoolId]
    );

    if (allocationCheck.rowCount === 0) {
      throw new AppError(404, "Budget allocation not found");
    }

    await assertAllocationEligible(budgetAllocationId, schoolId, client);

    const result = await client.query(
      `
      INSERT INTO expense_requests (
        school_id,
        budget_allocation_id,
        requested_amount,
        purpose,
        vendor_name,
        remarks,
        status,
        created_by_user_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
      `,
      [
        schoolId,
        budgetAllocationId,
        requestedAmount,
        purpose,
        vendorName || null,
        remarks || null,
        EXPENSE_REQUEST_STATUS.DRAFT,
        userId,
      ]
    );

    await client.query("COMMIT");
    return getExpenseRequestById(result.rows[0].id, schoolId);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

const updateExpenseRequest = async ({
  id,
  schoolId,
  userId,
  role,
  requestedAmount,
  purpose,
  vendorName = "",
  remarks = "",
}) => {
  const existing = await getExpenseRequestById(id, schoolId, userId, role);

  if (existing.status !== EXPENSE_REQUEST_STATUS.DRAFT) {
    throw new AppError(400, "Only draft expense requests can be edited");
  }

  if (role === "teacher" && existing.created_by_user_id !== userId) {
    throw new AppError(403, "You can only edit your own draft expense requests");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await assertAllocationEligible(existing.budget_allocation_id, schoolId, client);

    await client.query(
      `
      UPDATE expense_requests
      SET
        requested_amount = $1,
        purpose = $2,
        vendor_name = $3,
        remarks = $4,
        updated_at = NOW()
      WHERE id = $5
        AND school_id = $6
        AND status = $7
      `,
      [
        requestedAmount,
        purpose,
        vendorName || null,
        remarks || null,
        id,
        schoolId,
        EXPENSE_REQUEST_STATUS.DRAFT,
      ]
    );

    await client.query("COMMIT");
    return getExpenseRequestById(id, schoolId, userId, role);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

const deleteExpenseRequest = async (id, schoolId, userId, role) => {
  const existing = await getExpenseRequestById(id, schoolId, userId, role);

  if (existing.status !== EXPENSE_REQUEST_STATUS.DRAFT) {
    throw new AppError(400, "Only draft expense requests can be deleted");
  }

  if (role === "teacher" && existing.created_by_user_id !== userId) {
    throw new AppError(403, "You can only delete your own draft expense requests");
  }

  const result = await pool.query(
    `
    DELETE FROM expense_requests
    WHERE id = $1
      AND school_id = $2
      AND status = $3
    RETURNING id
    `,
    [id, schoolId, EXPENSE_REQUEST_STATUS.DRAFT]
  );

  if (result.rowCount === 0) {
    throw new AppError(404, "Expense request not found");
  }

  return { id: result.rows[0].id };
};

const submitExpenseRequest = async (id, schoolId, userId, role) => {
  const existing = await getExpenseRequestById(id, schoolId, userId, role);

  if (existing.status !== EXPENSE_REQUEST_STATUS.DRAFT) {
    throw new AppError(400, "Only draft expense requests can be submitted");
  }

  if (role === "teacher" && existing.created_by_user_id !== userId) {
    throw new AppError(403, "You can only submit your own draft expense requests");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(
      `
      SELECT id FROM budget_allocations
      WHERE id = $1 AND school_id = $2
      FOR UPDATE
      `,
      [existing.budget_allocation_id, schoolId]
    );

    await assertAllocationAvailableForRequest(
      existing.budget_allocation_id,
      schoolId,
      existing.requested_amount,
      client,
      id
    );

    await client.query(
      `
      UPDATE expense_requests
      SET
        status = $1,
        submitted_by_user_id = $2,
        submitted_at = NOW(),
        updated_at = NOW()
      WHERE id = $3
        AND school_id = $4
        AND status = $5
      `,
      [
        EXPENSE_REQUEST_STATUS.PENDING,
        userId,
        id,
        schoolId,
        EXPENSE_REQUEST_STATUS.DRAFT,
      ]
    );

    await client.query("COMMIT");
    return getExpenseRequestById(id, schoolId, userId, role);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

const approveExpenseRequest = async (id, schoolId, adminUserId) => {
  const existing = await getExpenseRequestById(id, schoolId);

  if (existing.status !== EXPENSE_REQUEST_STATUS.PENDING) {
    throw new AppError(400, "Only pending expense requests can be approved");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(
      `
      SELECT id FROM budget_allocations
      WHERE id = $1 AND school_id = $2
      FOR UPDATE
      `,
      [existing.budget_allocation_id, schoolId]
    );

    await assertAllocationAvailableForRequest(
      existing.budget_allocation_id,
      schoolId,
      existing.requested_amount,
      client,
      id
    );

    await client.query(
      `
      UPDATE expense_requests
      SET
        status = $1,
        reviewed_by_user_id = $2,
        reviewed_at = NOW(),
        rejection_remarks = NULL,
        updated_at = NOW()
      WHERE id = $3
        AND school_id = $4
        AND status = $5
      `,
      [
        EXPENSE_REQUEST_STATUS.APPROVED,
        adminUserId,
        id,
        schoolId,
        EXPENSE_REQUEST_STATUS.PENDING,
      ]
    );

    await client.query("COMMIT");
    return getExpenseRequestById(id, schoolId);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

const rejectExpenseRequest = async (id, schoolId, adminUserId, rejectionRemarks) => {
  const existing = await getExpenseRequestById(id, schoolId);

  if (existing.status !== EXPENSE_REQUEST_STATUS.PENDING) {
    throw new AppError(400, "Only pending expense requests can be rejected");
  }

  const result = await pool.query(
    `
    UPDATE expense_requests
    SET
      status = $1,
      reviewed_by_user_id = $2,
      reviewed_at = NOW(),
      rejection_remarks = $3,
      updated_at = NOW()
    WHERE id = $4
      AND school_id = $5
      AND status = $6
    RETURNING id
    `,
    [
      EXPENSE_REQUEST_STATUS.REJECTED,
      adminUserId,
      rejectionRemarks,
      id,
      schoolId,
      EXPENSE_REQUEST_STATUS.PENDING,
    ]
  );

  if (result.rowCount === 0) {
    throw new AppError(404, "Expense request not found");
  }

  return getExpenseRequestById(id, schoolId);
};

const markExpenseRequestPaid = async (
  id,
  schoolId,
  adminUserId,
  { paymentVoucherNo, paymentTransactionId, paidAt = null }
) => {
  const existing = await getExpenseRequestById(id, schoolId);

  if (existing.status !== EXPENSE_REQUEST_STATUS.APPROVED) {
    throw new AppError(400, "Only approved expense requests can be marked as paid");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const updateResult = await client.query(
      `
      UPDATE expense_requests
      SET
        status = $1,
        paid_at = COALESCE($2, NOW()),
        payment_voucher_no = $3,
        payment_transaction_id = $4,
        updated_at = NOW()
      WHERE id = $5
        AND school_id = $6
        AND status = $7
      RETURNING id
      `,
      [
        EXPENSE_REQUEST_STATUS.PAID,
        paidAt,
        paymentVoucherNo,
        paymentTransactionId,
        id,
        schoolId,
        EXPENSE_REQUEST_STATUS.APPROVED,
      ]
    );

    if (updateResult.rowCount === 0) {
      throw new AppError(404, "Expense request not found");
    }

    const cashbookEntryService = require("./cashbookEntryService");
    await cashbookEntryService.createPaymentFromExpenseRequest(client, id, adminUserId);

    await client.query("COMMIT");
    return getExpenseRequestById(id, schoolId);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

module.exports = {
  assertAllocationEligible,
  getAllocationBalance,
  getExpenseRequestById,
  listExpenseRequests,
  getExpenseRequestSummary,
  createExpenseRequest,
  updateExpenseRequest,
  deleteExpenseRequest,
  submitExpenseRequest,
  approveExpenseRequest,
  rejectExpenseRequest,
  markExpenseRequestPaid,
};
