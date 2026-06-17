const pool = require("../db");
const XLSX = require("xlsx");
const AppError = require("../utils/AppError");
const {
  CASHBOOK_ENTRY_TYPE,
  CASHBOOK_DIRECTION,
} = require("../constants/cashbookEntry");

const ENTRY_SELECT = `
  ce.id,
  ce.school_id,
  ce.financial_year_id,
  ce.entry_type,
  ce.direction,
  ce.entry_date,
  ce.amount,
  ce.description,
  ce.vendor_name,
  ce.voucher_no,
  ce.transaction_id,
  ce.budget_allocation_id,
  ce.budget_head_id,
  ce.budget_sub_head_id,
  ce.expense_request_id,
  ce.posted_by_user_id,
  ce.metadata,
  ce.created_at,
  ce.updated_at,
  fy.year_label,
  bh.head_name AS budget_head_name,
  bh.head_code AS budget_head_code,
  bsh.sub_head_name,
  bsh.sub_head_code,
  poster.name AS posted_by_name
`;

const ENTRY_FROM = `
  FROM cashbook_entries ce
  INNER JOIN financial_years fy ON fy.id = ce.financial_year_id
  INNER JOIN budget_heads bh ON bh.id = ce.budget_head_id
  INNER JOIN budget_sub_heads bsh ON bsh.id = ce.budget_sub_head_id
  LEFT JOIN users poster ON poster.id = ce.posted_by_user_id
`;

const buildListFilters = ({
  schoolId,
  role,
  financialYearId,
  budgetHeadId,
  budgetSubHeadId,
  budgetAllocationId,
  dateFrom,
  dateTo,
  voucherNo,
  vendorName,
  search,
}) => {
  const params = [];
  const conditions = ["1=1"];

  if (role !== "super_admin" && schoolId != null) {
    params.push(schoolId);
    conditions.push(`ce.school_id = $${params.length}`);
  }

  if (financialYearId) {
    params.push(financialYearId);
    conditions.push(`ce.financial_year_id = $${params.length}`);
  }

  if (budgetHeadId) {
    params.push(budgetHeadId);
    conditions.push(`ce.budget_head_id = $${params.length}`);
  }

  if (budgetSubHeadId) {
    params.push(budgetSubHeadId);
    conditions.push(`ce.budget_sub_head_id = $${params.length}`);
  }

  if (budgetAllocationId) {
    params.push(budgetAllocationId);
    conditions.push(`ce.budget_allocation_id = $${params.length}`);
  }

  if (dateFrom) {
    params.push(dateFrom);
    conditions.push(`ce.entry_date >= $${params.length}`);
  }

  if (dateTo) {
    params.push(dateTo);
    conditions.push(`ce.entry_date <= $${params.length}`);
  }

  if (voucherNo) {
    params.push(`%${voucherNo}%`);
    conditions.push(`ce.voucher_no ILIKE $${params.length}`);
  }

  if (vendorName) {
    params.push(`%${vendorName}%`);
    conditions.push(`ce.vendor_name ILIKE $${params.length}`);
  }

  if (search) {
    params.push(`%${search}%`);
    const searchParam = `$${params.length}`;
    conditions.push(`(
      ce.description ILIKE ${searchParam}
      OR ce.vendor_name ILIKE ${searchParam}
      OR ce.voucher_no ILIKE ${searchParam}
      OR ce.transaction_id ILIKE ${searchParam}
      OR bh.head_name ILIKE ${searchParam}
      OR bsh.sub_head_name ILIKE ${searchParam}
    )`);
  }

  return { params, whereClause: conditions.join(" AND ") };
};

const createPaymentFromExpenseRequest = async (client, expenseRequestId, postedByUserId) => {
  const contextResult = await client.query(
    `
    SELECT
      er.id,
      er.school_id,
      er.budget_allocation_id,
      er.requested_amount,
      er.purpose,
      er.vendor_name,
      er.payment_voucher_no,
      er.payment_transaction_id,
      er.paid_at,
      er.status,
      ba.financial_year_id,
      ba.budget_sub_head_id,
      bsh.budget_head_id
    FROM expense_requests er
    INNER JOIN budget_allocations ba ON ba.id = er.budget_allocation_id
    INNER JOIN budget_sub_heads bsh ON bsh.id = ba.budget_sub_head_id
    WHERE er.id = $1
    FOR UPDATE
    `,
    [expenseRequestId]
  );

  if (contextResult.rowCount === 0) {
    throw new AppError(404, "Expense request not found");
  }

  const row = contextResult.rows[0];

  if (row.status !== "paid") {
    throw new AppError(400, "Expense request must be paid before posting to cashbook");
  }

  const existingEntry = await client.query(
    `
    SELECT id
    FROM cashbook_entries
    WHERE expense_request_id = $1
    `,
    [expenseRequestId]
  );

  if (existingEntry.rowCount > 0) {
    throw new AppError(409, "Cashbook entry already exists for this expense request");
  }

  const paidAt = row.paid_at ? new Date(row.paid_at) : new Date();
  const entryDate = paidAt.toISOString().slice(0, 10);

  const insertResult = await client.query(
    `
    INSERT INTO cashbook_entries (
      school_id,
      financial_year_id,
      entry_type,
      direction,
      entry_date,
      amount,
      description,
      vendor_name,
      voucher_no,
      transaction_id,
      budget_allocation_id,
      budget_head_id,
      budget_sub_head_id,
      expense_request_id,
      posted_by_user_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING id
    `,
    [
      row.school_id,
      row.financial_year_id,
      CASHBOOK_ENTRY_TYPE.PAYMENT,
      CASHBOOK_DIRECTION.OUTFLOW,
      entryDate,
      row.requested_amount,
      row.purpose,
      row.vendor_name,
      row.payment_voucher_no,
      row.payment_transaction_id,
      row.budget_allocation_id,
      row.budget_head_id,
      row.budget_sub_head_id,
      expenseRequestId,
      postedByUserId,
    ]
  );

  return insertResult.rows[0].id;
};

const listCashbookEntries = async (filters) => {
  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(filters.limit) || 25));
  const offset = (page - 1) * limit;

  const { params, whereClause } = buildListFilters(filters);

  const countResult = await pool.query(
    `
    SELECT COUNT(*)::int AS total
    ${ENTRY_FROM}
    WHERE ${whereClause}
    `,
    params
  );

  const listParams = [...params, limit, offset];
  const result = await pool.query(
    `
    SELECT ${ENTRY_SELECT}
    ${ENTRY_FROM}
    WHERE ${whereClause}
    ORDER BY ce.entry_date DESC, ce.id DESC
    LIMIT $${listParams.length - 1}
    OFFSET $${listParams.length}
    `,
    listParams
  );

  const total = countResult.rows[0].total;

  return {
    data: result.rows,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.max(1, Math.ceil(total / limit)),
    },
  };
};

const getCashbookEntryById = async (id, schoolId, role) => {
  const params = [id];
  let query = `
    SELECT ${ENTRY_SELECT}
    ${ENTRY_FROM}
    WHERE ce.id = $1
  `;

  if (role !== "super_admin" && schoolId != null) {
    params.push(schoolId);
    query += ` AND ce.school_id = $${params.length}`;
  }

  const result = await pool.query(query, params);

  if (result.rowCount === 0) {
    throw new AppError(404, "Cashbook entry not found");
  }

  return result.rows[0];
};

const getCashbookSummary = async (filters) => {
  const { params, whereClause } = buildListFilters({
    ...filters,
    search: undefined,
    voucherNo: undefined,
    vendorName: undefined,
  });

  const paymentFilter = `${whereClause} AND ce.entry_type = '${CASHBOOK_ENTRY_TYPE.PAYMENT}' AND ce.direction = '${CASHBOOK_DIRECTION.OUTFLOW}'`;

  const totalsResult = await pool.query(
    `
    SELECT
      COALESCE(SUM(ce.amount), 0) AS total_outflow,
      COUNT(*)::int AS payment_count
    ${ENTRY_FROM}
    WHERE ${paymentFilter}
    `,
    params
  );

  const byHeadResult = await pool.query(
    `
    SELECT
      ce.budget_head_id,
      bh.head_name AS budget_head_name,
      COALESCE(SUM(ce.amount), 0) AS total_amount,
      COUNT(*)::int AS payment_count
    ${ENTRY_FROM}
    WHERE ${paymentFilter}
    GROUP BY ce.budget_head_id, bh.head_name
    ORDER BY bh.head_name ASC
    `,
    params
  );

  const bySubHeadResult = await pool.query(
    `
    SELECT
      ce.budget_sub_head_id,
      bsh.sub_head_name,
      bh.head_name AS budget_head_name,
      COALESCE(SUM(ce.amount), 0) AS total_amount,
      COUNT(*)::int AS payment_count
    ${ENTRY_FROM}
    WHERE ${paymentFilter}
    GROUP BY ce.budget_sub_head_id, bsh.sub_head_name, bh.head_name
    ORDER BY bh.head_name ASC, bsh.sub_head_name ASC
    `,
    params
  );

  const monthlyResult = await pool.query(
    `
    SELECT
      TO_CHAR(ce.entry_date, 'YYYY-MM') AS month_key,
      COALESCE(SUM(ce.amount), 0) AS total_amount,
      COUNT(*)::int AS payment_count
    ${ENTRY_FROM}
    WHERE ${paymentFilter}
    GROUP BY TO_CHAR(ce.entry_date, 'YYYY-MM')
    ORDER BY month_key ASC
    `,
    params
  );

  return {
    total_outflow: totalsResult.rows[0].total_outflow,
    payment_count: totalsResult.rows[0].payment_count,
    expenditure_by_head: byHeadResult.rows,
    expenditure_by_sub_head: bySubHeadResult.rows,
    monthly_totals: monthlyResult.rows,
  };
};

const exportCashbookEntriesXlsx = async (filters) => {
  const { params, whereClause } = buildListFilters(filters);

  const result = await pool.query(
    `
    SELECT
      ce.entry_date,
      ce.voucher_no,
      bh.head_name AS budget_head_name,
      bsh.sub_head_name,
      ce.description,
      ce.vendor_name,
      ce.amount,
      ce.transaction_id,
      fy.year_label
    ${ENTRY_FROM}
    WHERE ${whereClause}
    ORDER BY ce.entry_date DESC, ce.id DESC
    `,
    params
  );

  const rows = result.rows.map((row) => ({
    Date: row.entry_date,
    "Voucher No": row.voucher_no || "",
    Head: row.budget_head_name,
    "Sub Head": row.sub_head_name,
    Description: row.description,
    Vendor: row.vendor_name || "",
    Amount: Number(row.amount),
    "Transaction ID": row.transaction_id || "",
  }));

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Cashbook");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  const yearLabel = result.rows[0]?.year_label || "Export";

  return {
    buffer,
    filename: `Cashbook_${yearLabel}.xlsx`,
  };
};

const getFinanceDashboardMetrics = async (schoolId, role, financialYearId = null) => {
  let fyId = financialYearId;
  let yearLabel = null;

  if (!fyId) {
    const activeParams = [];
    let activeQuery = `
      SELECT id, year_label
      FROM financial_years
      WHERE status = 'active'
    `;

    if (role !== "super_admin" && schoolId != null) {
      activeParams.push(schoolId);
      activeQuery += ` AND school_id = $${activeParams.length}`;
    }

    activeQuery += ` ORDER BY id DESC LIMIT 1`;

    const activeResult = await pool.query(activeQuery, activeParams);

    if (activeResult.rowCount === 0) {
      return {
        financial_year_id: null,
        year_label: null,
        total_budget_received: 0,
        total_expenditure: 0,
        available_balance: 0,
        budget_utilization_pct: 0,
        pending_requests_count: 0,
        pending_requests_amount: 0,
      };
    }

    fyId = activeResult.rows[0].id;
    yearLabel = activeResult.rows[0].year_label;
  } else {
    const fyParams = [fyId];
    let fyQuery = `SELECT year_label FROM financial_years WHERE id = $1`;

    if (role !== "super_admin" && schoolId != null) {
      fyParams.push(schoolId);
      fyQuery += ` AND school_id = $${fyParams.length}`;
    }

    const fyResult = await pool.query(fyQuery, fyParams);
    yearLabel = fyResult.rows[0]?.year_label || null;
  }

  const budgetParams = [fyId];
  let budgetSchoolFilter = "";

  if (role !== "super_admin" && schoolId != null) {
    budgetParams.push(schoolId);
    budgetSchoolFilter = ` AND ba.school_id = $${budgetParams.length}`;
  }

  const budgetResult = await pool.query(
    `
    SELECT COALESCE(SUM(ba.allocated_amount) FILTER (WHERE ba.is_active = TRUE), 0) AS total_budget_received
    FROM budget_allocations ba
    WHERE ba.financial_year_id = $1
      ${budgetSchoolFilter}
    `,
    budgetParams
  );

  const expenditureParams = [fyId];
  let expenditureSchoolFilter = "";

  if (role !== "super_admin" && schoolId != null) {
    expenditureParams.push(schoolId);
    expenditureSchoolFilter = ` AND ce.school_id = $${expenditureParams.length}`;
  }

  const expenditureResult = await pool.query(
    `
    SELECT COALESCE(SUM(ce.amount), 0) AS total_expenditure
    FROM cashbook_entries ce
    WHERE ce.financial_year_id = $1
      AND ce.entry_type = 'payment'
      AND ce.direction = 'outflow'
      ${expenditureSchoolFilter}
    `,
    expenditureParams
  );

  const pendingParams = [fyId];
  let pendingSchoolFilter = "";

  if (role !== "super_admin" && schoolId != null) {
    pendingParams.push(schoolId);
    pendingSchoolFilter = ` AND er.school_id = $${pendingParams.length}`;
  }

  const pendingResult = await pool.query(
    `
    SELECT
      COUNT(*)::int AS pending_requests_count,
      COALESCE(SUM(er.requested_amount), 0) AS pending_requests_amount
    FROM expense_requests er
    INNER JOIN budget_allocations ba ON ba.id = er.budget_allocation_id
    WHERE ba.financial_year_id = $1
      AND er.status = 'pending'
      ${pendingSchoolFilter}
    `,
    pendingParams
  );

  const totalBudgetReceived = Number(budgetResult.rows[0].total_budget_received);
  const totalExpenditure = Number(expenditureResult.rows[0].total_expenditure);
  const availableBalance = totalBudgetReceived - totalExpenditure;
  const budgetUtilizationPct =
    totalBudgetReceived <= 0
      ? 0
      : Number(((totalExpenditure / totalBudgetReceived) * 100).toFixed(2));

  return {
    financial_year_id: fyId,
    year_label: yearLabel,
    total_budget_received: totalBudgetReceived,
    total_expenditure: totalExpenditure,
    available_balance: availableBalance,
    budget_utilization_pct: budgetUtilizationPct,
    pending_requests_count: pendingResult.rows[0].pending_requests_count,
    pending_requests_amount: Number(pendingResult.rows[0].pending_requests_amount),
  };
};

module.exports = {
  createPaymentFromExpenseRequest,
  listCashbookEntries,
  getCashbookEntryById,
  getCashbookSummary,
  exportCashbookEntriesXlsx,
  getFinanceDashboardMetrics,
};
