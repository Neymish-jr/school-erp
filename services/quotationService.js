const pool = require("../db");
const AppError = require("../utils/AppError");
const {
  getQuotationRequiredThreshold,
  requiresQuotationsForAmount,
} = require("../constants/quotationConfig");
const { EXPENSE_REQUEST_STATUS } = require("../constants/expenseRequestStatus");

const QUOTATION_SELECT = `
  q.id,
  q.school_id,
  q.expense_request_id,
  q.expense_id,
  q.vendor_name,
  q.vendor_contact,
  q.quotation_amount,
  q.quotation_date,
  q.remarks,
  q.attachment_path,
  q.is_selected,
  q.created_by_user_id,
  q.selected_by_user_id,
  q.selected_at,
  q.created_at,
  q.updated_at,
  creator.name AS created_by_name,
  selector.name AS selected_by_name
`;

const QUOTATION_FROM = `
  FROM quotations q
  LEFT JOIN users creator ON creator.id = q.created_by_user_id
  LEFT JOIN users selector ON selector.id = q.selected_by_user_id
`;

const getExpenseRequestContext = async (expenseRequestId, schoolId, role) => {
  const params = [expenseRequestId];
  let query = `
    SELECT
      er.id,
      er.school_id,
      er.requested_amount,
      er.status,
      er.created_by_user_id,
      er.selected_quotation_id,
      er.vendor_name
    FROM expense_requests er
    WHERE er.id = $1
  `;

  if (role !== "super_admin" && schoolId != null) {
    params.push(schoolId);
    query += ` AND er.school_id = $${params.length}`;
  }

  const result = await pool.query(query, params);

  if (result.rowCount === 0) {
    throw new AppError(404, "Expense request not found");
  }

  return result.rows[0];
};

const verifyLegacyExpenseInSchool = async (expenseId, role, schoolId) => {
  const params = [expenseId];
  let schoolClause = "";

  if (role !== "super_admin" && schoolId != null) {
    params.push(schoolId);
    schoolClause = ` AND activities.school_id = $${params.length}`;
  }

  const result = await pool.query(
    `
    SELECT e.id, activities.school_id
    FROM expenses e
    JOIN activities ON activities.id = e.activity_id
    WHERE e.id = $1
    ${schoolClause}
    `,
    params
  );

  return result.rows[0] || null;
};

const listQuotationsForExpenseRequest = async ({
  expenseRequestId,
  schoolId,
  role,
}) => {
  if (expenseRequestId) {
    await getExpenseRequestContext(expenseRequestId, schoolId, role);
  }

  const params = [];
  let query = `
    SELECT ${QUOTATION_SELECT}
    ${QUOTATION_FROM}
    WHERE 1=1
  `;

  if (expenseRequestId) {
    params.push(expenseRequestId);
    query += ` AND q.expense_request_id = $${params.length}`;
  }

  if (role !== "super_admin" && schoolId != null) {
    params.push(schoolId);
    query += ` AND q.school_id = $${params.length}`;
  }

  query += ` ORDER BY q.quotation_amount ASC, q.id ASC`;

  const result = await pool.query(query, params);
  return result.rows;
};

const listQuotations = async ({ schoolId, role, expenseRequestId }) => {
  if (expenseRequestId) {
    return listQuotationsForExpenseRequest({ expenseRequestId, schoolId, role });
  }

  const params = [];
  let query = `
    SELECT ${QUOTATION_SELECT}
    ${QUOTATION_FROM}
    WHERE q.expense_request_id IS NOT NULL
  `;

  if (role !== "super_admin" && schoolId != null) {
    params.push(schoolId);
    query += ` AND q.school_id = $${params.length}`;
  }

  query += ` ORDER BY q.created_at DESC, q.id DESC`;

  const result = await pool.query(query, params);
  return result.rows;
};

const getQuotationById = async ({ id, schoolId, role }) => {
  const params = [id];
  let query = `
    SELECT ${QUOTATION_SELECT}
    ${QUOTATION_FROM}
    WHERE q.id = $1
  `;

  if (role !== "super_admin" && schoolId != null) {
    params.push(schoolId);
    query += ` AND q.school_id = $${params.length}`;
  }

  const result = await pool.query(query, params);

  if (result.rowCount === 0) {
    throw new AppError(404, "Quotation not found");
  }

  return result.rows[0];
};

const getQuotationComparison = async ({ expenseRequestId, schoolId, role }) => {
  const expenseRequest = await getExpenseRequestContext(
    expenseRequestId,
    schoolId,
    role
  );
  const quotations = await listQuotationsForExpenseRequest({
    expenseRequestId,
    schoolId,
    role,
  });

  const lowestAmount = quotations.length
    ? Math.min(...quotations.map((row) => Number(row.quotation_amount)))
    : null;

  const quotes = quotations.map((row) => {
    const amount = Number(row.quotation_amount);
    const difference =
      lowestAmount == null ? null : Number((amount - lowestAmount).toFixed(2));

    return {
      ...row,
      difference_from_lowest: difference,
      is_lowest: lowestAmount != null && amount === lowestAmount,
    };
  });

  const selectedQuotation =
    quotes.find((row) => row.is_selected) ||
    quotes.find((row) => row.id === expenseRequest.selected_quotation_id) ||
    null;

  return {
    expense_request_id: expenseRequest.id,
    requested_amount: Number(expenseRequest.requested_amount),
    quotation_threshold: getQuotationRequiredThreshold(),
    quotations_required: requiresQuotationsForAmount(expenseRequest.requested_amount),
    quotation_count: quotes.length,
    lowest_amount: lowestAmount,
    selected_quotation_id: expenseRequest.selected_quotation_id,
    selected_quotation: selectedQuotation,
    quotes,
  };
};

const assertCanUploadQuotations = async ({
  expenseRequestId,
  schoolId,
  role,
  userId,
}) => {
  const expenseRequest = await getExpenseRequestContext(
    expenseRequestId,
    schoolId,
    role
  );

  const allowedStatuses = [
    EXPENSE_REQUEST_STATUS.DRAFT,
    EXPENSE_REQUEST_STATUS.PENDING,
  ];

  if (!allowedStatuses.includes(expenseRequest.status)) {
    throw new AppError(
      400,
      "Quotations can only be added while the expense request is draft or pending"
    );
  }

  if (
    role === "teacher" &&
    Number(expenseRequest.created_by_user_id) !== Number(userId)
  ) {
    throw new AppError(403, "You can only add quotations to your own expense requests");
  }

  return expenseRequest;
};

const createQuotation = async ({
  schoolId,
  role,
  userId,
  expenseRequestId = null,
  expenseId = null,
  vendorName,
  vendorContact = null,
  quotationAmount,
  quotationDate,
  remarks = null,
  attachmentPath = null,
}) => {
  let resolvedSchoolId = schoolId;
  let resolvedExpenseRequestId = expenseRequestId;

  if (resolvedExpenseRequestId != null) {
    const expenseRequest = await assertCanUploadQuotations({
      expenseRequestId: resolvedExpenseRequestId,
      schoolId,
      role,
      userId,
    });
    resolvedSchoolId = expenseRequest.school_id;
  } else if (expenseId != null) {
    const legacyExpense = await verifyLegacyExpenseInSchool(expenseId, role, schoolId);
    if (!legacyExpense) {
      throw new AppError(404, "Expense not found in your school");
    }
    resolvedSchoolId = legacyExpense.school_id;
  } else {
    throw new AppError(400, "expense_request_id is required");
  }

  const result = await pool.query(
    `
    INSERT INTO quotations (
      school_id,
      expense_request_id,
      expense_id,
      vendor_name,
      vendor_contact,
      quotation_amount,
      quotation_date,
      remarks,
      attachment_path,
      created_by_user_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING id
    `,
    [
      resolvedSchoolId,
      resolvedExpenseRequestId,
      expenseId,
      vendorName,
      vendorContact,
      quotationAmount,
      quotationDate,
      remarks,
      attachmentPath,
      userId,
    ]
  );

  return getQuotationById({
    id: result.rows[0].id,
    schoolId: resolvedSchoolId,
    role: "admin",
  });
};

const selectQuotation = async ({ id, schoolId, role, userId }) => {
  const quotation = await getQuotationById({ id, schoolId, role });

  if (!quotation.expense_request_id) {
    throw new AppError(400, "Only expense-request quotations can be selected");
  }

  const expenseRequest = await getExpenseRequestContext(
    quotation.expense_request_id,
    schoolId,
    role
  );

  if (expenseRequest.status !== EXPENSE_REQUEST_STATUS.PENDING) {
    throw new AppError(
      400,
      "Quotations can only be selected while the expense request is pending approval"
    );
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `
      UPDATE quotations
      SET
        is_selected = FALSE,
        selected_by_user_id = NULL,
        selected_at = NULL,
        updated_at = NOW()
      WHERE expense_request_id = $1
      `,
      [quotation.expense_request_id]
    );

    await client.query(
      `
      UPDATE quotations
      SET
        is_selected = TRUE,
        selected_by_user_id = $1,
        selected_at = NOW(),
        updated_at = NOW()
      WHERE id = $2
      `,
      [userId, id]
    );

    await client.query(
      `
      UPDATE expense_requests
      SET
        selected_quotation_id = $1,
        vendor_name = COALESCE($2, vendor_name),
        updated_at = NOW()
      WHERE id = $3
        AND school_id = $4
      `,
      [id, quotation.vendor_name, quotation.expense_request_id, quotation.school_id]
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  return getQuotationComparison({
    expenseRequestId: quotation.expense_request_id,
    schoolId: quotation.school_id,
    role: "admin",
  });
};

const assertQuotationRequirementsForSubmit = async (expenseRequestId, schoolId) => {
  const expenseRequest = await getExpenseRequestContext(
    expenseRequestId,
    schoolId,
    "admin"
  );

  if (!requiresQuotationsForAmount(expenseRequest.requested_amount)) {
    return;
  }

  const result = await pool.query(
    `
    SELECT COUNT(*)::int AS count
    FROM quotations
    WHERE expense_request_id = $1
      AND school_id = $2
    `,
    [expenseRequestId, expenseRequest.school_id]
  );

  if (result.rows[0].count < 1) {
    throw new AppError(
      400,
      `At least one quotation is required for expense requests of ₹${getQuotationRequiredThreshold()} or more`
    );
  }
};

const assertQuotationRequirementsForApprove = async (expenseRequestId, schoolId) => {
  const expenseRequest = await getExpenseRequestContext(
    expenseRequestId,
    schoolId,
    "admin"
  );

  if (!requiresQuotationsForAmount(expenseRequest.requested_amount)) {
    return;
  }

  const result = await pool.query(
    `
    SELECT COUNT(*)::int AS count
    FROM quotations
    WHERE expense_request_id = $1
      AND school_id = $2
      AND is_selected = TRUE
    `,
    [expenseRequestId, expenseRequest.school_id]
  );

  if (result.rows[0].count < 1) {
    throw new AppError(
      400,
      `A quotation must be selected before approving expense requests of ₹${getQuotationRequiredThreshold()} or more`
    );
  }
};

const getQuotationMetaForExpenseRequest = async (expenseRequest) => {
  const quotations = await listQuotationsForExpenseRequest({
    expenseRequestId: expenseRequest.id,
    schoolId: expenseRequest.school_id,
    role: "admin",
  });

  const comparison = await getQuotationComparison({
    expenseRequestId: expenseRequest.id,
    schoolId: expenseRequest.school_id,
    role: "admin",
  });

  return {
    quotation_threshold: getQuotationRequiredThreshold(),
    quotations_required: requiresQuotationsForAmount(expenseRequest.requested_amount),
    quotation_count: quotations.length,
    selected_quotation_id: expenseRequest.selected_quotation_id,
    quotations,
    quotation_comparison: comparison,
  };
};

module.exports = {
  getQuotationRequiredThreshold,
  requiresQuotationsForAmount,
  listQuotations,
  listQuotationsForExpenseRequest,
  getQuotationById,
  getQuotationComparison,
  createQuotation,
  selectQuotation,
  assertQuotationRequirementsForSubmit,
  assertQuotationRequirementsForApprove,
  getQuotationMetaForExpenseRequest,
  verifyLegacyExpenseInSchool,
};
