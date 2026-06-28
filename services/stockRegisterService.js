const pool = require("../db");
const AppError = require("../utils/AppError");
const {
  STOCK_CATEGORIES,
  STOCK_CATEGORY_LABELS,
  STOCK_ISSUE_TYPES,
  getLowStockThreshold,
} = require("../constants/stockCategories");

const ENTRY_SELECT = `
  se.id,
  se.school_id,
  se.expense_request_id,
  se.item_name,
  se.category,
  se.quantity,
  se.unit,
  se.purchase_rate,
  se.total_value,
  se.vendor_name,
  se.purchase_date,
  se.source,
  se.created_by_user_id,
  se.created_at,
  se.updated_at,
  creator.name AS created_by_name
`;

const ENTRY_FROM = `
  FROM stock_entries se
  LEFT JOIN users creator ON creator.id = se.created_by_user_id
`;

const writeAuditLog = async (
  client,
  { schoolId, entityType, entityId, action, actorUserId, changes = {} }
) => {
  await client.query(
    `
    INSERT INTO stock_audit_logs (
      school_id,
      entity_type,
      entity_id,
      action,
      actor_user_id,
      changes
    )
    VALUES ($1, $2, $3, $4, $5, $6::jsonb)
    `,
    [schoolId, entityType, entityId, action, actorUserId, JSON.stringify(changes)]
  );
};

const getIssuedQuantityForEntry = async (client, stockEntryId, schoolId) => {
  const executor = client || pool;
  const result = await executor.query(
    `
    SELECT COALESCE(SUM(issued_quantity), 0)::numeric AS issued_quantity
    FROM stock_issues
    WHERE stock_entry_id = $1
      AND school_id = $2
    `,
    [stockEntryId, schoolId]
  );

  return Number(result.rows[0].issued_quantity);
};

const enrichEntryWithBalance = async (entry, client = null) => {
  const issuedQuantity = await getIssuedQuantityForEntry(
    client,
    entry.id,
    entry.school_id
  );
  const receivedQuantity = Number(entry.quantity);
  const availableQuantity = Number((receivedQuantity - issuedQuantity).toFixed(2));

  return {
    ...entry,
    category_label: STOCK_CATEGORY_LABELS[entry.category] || entry.category,
    issued_quantity: issuedQuantity,
    available_quantity: availableQuantity,
    is_low_stock: availableQuantity <= getLowStockThreshold(),
  };
};

const getStockEntryById = async ({ id, schoolId, role, client = null }) => {
  const executor = client || pool;
  const params = [id];
  let query = `
    SELECT ${ENTRY_SELECT}
    ${ENTRY_FROM}
    WHERE se.id = $1
  `;

  if (role !== "super_admin" && schoolId != null) {
    params.push(schoolId);
    query += ` AND se.school_id = $${params.length}`;
  }

  const result = await executor.query(query, params);

  if (result.rowCount === 0) {
    throw new AppError(404, "Stock entry not found");
  }

  return enrichEntryWithBalance(result.rows[0], client);
};

const listStockEntries = async ({ schoolId, role, category, itemName, lowStockOnly }) => {
  const params = [];
  let query = `
    SELECT ${ENTRY_SELECT}
    ${ENTRY_FROM}
    WHERE 1=1
  `;

  if (role !== "super_admin" && schoolId != null) {
    params.push(schoolId);
    query += ` AND se.school_id = $${params.length}`;
  }

  if (category) {
    params.push(category);
    query += ` AND se.category = $${params.length}`;
  }

  if (itemName) {
    params.push(`%${itemName}%`);
    query += ` AND se.item_name ILIKE $${params.length}`;
  }

  query += ` ORDER BY se.purchase_date DESC, se.id DESC`;

  const result = await pool.query(query, params);
  const entries = await Promise.all(
    result.rows.map((row) => enrichEntryWithBalance(row))
  );

  if (lowStockOnly) {
    return entries.filter((row) => row.is_low_stock);
  }

  return entries;
};

const createStockEntry = async ({
  schoolId,
  userId,
  itemName,
  category,
  quantity,
  unit,
  purchaseRate,
  vendorName = null,
  purchaseDate,
  expenseRequestId = null,
  source = "manual",
  client = null,
}) => {
  if (!STOCK_CATEGORIES.includes(category)) {
    throw new AppError(400, "Invalid stock category");
  }

  const normalizedQuantity = Number(quantity);
  const normalizedRate = Number(purchaseRate);
  const totalValue = Number((normalizedQuantity * normalizedRate).toFixed(2));

  const executor = client || pool;

  const insertResult = await executor.query(
    `
    INSERT INTO stock_entries (
      school_id,
      expense_request_id,
      item_name,
      category,
      quantity,
      unit,
      purchase_rate,
      total_value,
      vendor_name,
      purchase_date,
      source,
      created_by_user_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING id
    `,
    [
      schoolId,
      expenseRequestId,
      itemName,
      category,
      normalizedQuantity,
      unit,
      normalizedRate,
      totalValue,
      vendorName,
      purchaseDate,
      source,
      userId,
    ]
  );

  const entryId = insertResult.rows[0].id;

  await writeAuditLog(executor, {
    schoolId,
    entityType: "stock_entry",
    entityId: entryId,
    action: source === "expense_payment" ? "auto_created" : "created",
    actorUserId: userId,
    changes: {
      item_name: itemName,
      category,
      quantity: normalizedQuantity,
      unit,
      purchase_rate: normalizedRate,
      total_value: totalValue,
      expense_request_id: expenseRequestId,
      source,
    },
  });

  return getStockEntryById({
    id: entryId,
    schoolId,
    role: "admin",
    client: executor,
  });
};

const createStockEntryFromExpenseRequest = async (
  client,
  expenseRequestId,
  userId,
  { category, unit, purchaseRate = null }
) => {
  const contextResult = await client.query(
    `
    SELECT
      er.id,
      er.school_id,
      er.item_name,
      er.quantity,
      er.requested_amount,
      er.vendor_name,
      er.paid_at,
      er.status
    FROM expense_requests er
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
    throw new AppError(400, "Expense request must be paid before creating stock entry");
  }

  const itemName = String(row.item_name || "").trim();
  const quantity = row.quantity != null ? Number(row.quantity) : null;

  if (!itemName || quantity == null || quantity <= 0) {
    throw new AppError(
      400,
      "Expense request must have item_name and quantity to create stock entry"
    );
  }

  if (!category || !unit) {
    throw new AppError(400, "Stock category and unit are required for auto stock creation");
  }

  const existing = await client.query(
    `
    SELECT id FROM stock_entries WHERE expense_request_id = $1
    `,
    [expenseRequestId]
  );

  if (existing.rowCount > 0) {
    throw new AppError(409, "Stock entry already exists for this expense request");
  }

  const resolvedRate =
    purchaseRate != null && Number(purchaseRate) > 0
      ? Number(purchaseRate)
      : Number((Number(row.requested_amount) / quantity).toFixed(2));

  const purchaseDate = row.paid_at
    ? new Date(row.paid_at).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  return createStockEntry({
    schoolId: row.school_id,
    userId,
    itemName,
    category,
    quantity,
    unit,
    purchaseRate: resolvedRate,
    vendorName: row.vendor_name,
    purchaseDate,
    expenseRequestId,
    source: "expense_payment",
    client,
  });
};

const verifyIssueTarget = async ({ schoolId, issueType, teacherId, activityId, department }) => {
  if (!STOCK_ISSUE_TYPES.includes(issueType)) {
    throw new AppError(400, "Invalid issue type");
  }

  if (issueType === "teacher") {
    if (!teacherId) {
      throw new AppError(400, "Teacher is required for teacher issue");
    }

    const result = await pool.query(
      `SELECT id FROM teachers WHERE id = $1 AND school_id = $2`,
      [teacherId, schoolId]
    );

    if (result.rowCount === 0) {
      throw new AppError(404, "Teacher not found in your school");
    }

    return;
  }

  if (issueType === "activity") {
    if (!activityId) {
      throw new AppError(400, "Activity is required for activity issue");
    }

    const result = await pool.query(
      `SELECT id FROM activities WHERE id = $1 AND school_id = $2`,
      [activityId, schoolId]
    );

    if (result.rowCount === 0) {
      throw new AppError(404, "Activity not found in your school");
    }

    return;
  }

  if (!department || !String(department).trim()) {
    throw new AppError(400, "Department name is required for department issue");
  }
};

const issueStock = async ({
  schoolId,
  userId,
  stockEntryId,
  issuedQuantity,
  issueType,
  issuedToTeacherId = null,
  issuedToActivityId = null,
  issuedToDepartment = null,
  issueDate,
  remarks = null,
}) => {
  const entry = await getStockEntryById({
    id: stockEntryId,
    schoolId,
    role: "admin",
  });

  await verifyIssueTarget({
    schoolId: entry.school_id,
    issueType,
    teacherId: issuedToTeacherId,
    activityId: issuedToActivityId,
    department: issuedToDepartment,
  });

  const normalizedIssueQty = Number(issuedQuantity);

  if (normalizedIssueQty > entry.available_quantity) {
    throw new AppError(
      400,
      `Cannot issue more than available quantity (${entry.available_quantity})`
    );
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const insertResult = await client.query(
      `
      INSERT INTO stock_issues (
        school_id,
        stock_entry_id,
        issued_quantity,
        issue_type,
        issued_to_teacher_id,
        issued_to_activity_id,
        issued_to_department,
        issue_date,
        remarks,
        created_by_user_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
      `,
      [
        entry.school_id,
        stockEntryId,
        normalizedIssueQty,
        issueType,
        issuedToTeacherId,
        issuedToActivityId,
        issuedToDepartment ? String(issuedToDepartment).trim() : null,
        issueDate,
        remarks,
        userId,
      ]
    );

    const issueId = insertResult.rows[0].id;

    await writeAuditLog(client, {
      schoolId: entry.school_id,
      entityType: "stock_issue",
      entityId: issueId,
      action: "issued",
      actorUserId: userId,
      changes: {
        stock_entry_id: stockEntryId,
        item_name: entry.item_name,
        issued_quantity: normalizedIssueQty,
        issue_type: issueType,
        issued_to_teacher_id: issuedToTeacherId,
        issued_to_activity_id: issuedToActivityId,
        issued_to_department: issuedToDepartment,
        issue_date: issueDate,
        remarks,
      },
    });

    await client.query("COMMIT");

    return getStockIssueById({
      id: issueId,
      schoolId: entry.school_id,
      role: "admin",
    });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

const ISSUE_SELECT = `
  si.id,
  si.school_id,
  si.stock_entry_id,
  si.issued_quantity,
  si.issue_type,
  si.issued_to_teacher_id,
  si.issued_to_activity_id,
  si.issued_to_department,
  si.issue_date,
  si.remarks,
  si.created_by_user_id,
  si.created_at,
  si.updated_at,
  se.item_name,
  se.category,
  se.unit,
  teacher.teacher_name AS issued_to_teacher_name,
  activity.activity_name AS issued_to_activity_name,
  creator.name AS created_by_name
`;

const ISSUE_FROM = `
  FROM stock_issues si
  INNER JOIN stock_entries se ON se.id = si.stock_entry_id
  LEFT JOIN teachers teacher ON teacher.id = si.issued_to_teacher_id
  LEFT JOIN activities activity ON activity.id = si.issued_to_activity_id
  LEFT JOIN users creator ON creator.id = si.created_by_user_id
`;

const getStockIssueById = async ({ id, schoolId, role }) => {
  const params = [id];
  let query = `
    SELECT ${ISSUE_SELECT}
    ${ISSUE_FROM}
    WHERE si.id = $1
  `;

  if (role !== "super_admin" && schoolId != null) {
    params.push(schoolId);
    query += ` AND si.school_id = $${params.length}`;
  }

  const result = await pool.query(query, params);

  if (result.rowCount === 0) {
    throw new AppError(404, "Stock issue not found");
  }

  const row = result.rows[0];

  return {
    ...row,
    category_label: STOCK_CATEGORY_LABELS[row.category] || row.category,
    issued_to:
      row.issue_type === "teacher"
        ? row.issued_to_teacher_name
        : row.issue_type === "activity"
          ? row.issued_to_activity_name
          : row.issued_to_department,
  };
};

const listStockIssues = async ({ schoolId, role, limit = 20 }) => {
  const params = [];
  let query = `
    SELECT ${ISSUE_SELECT}
    ${ISSUE_FROM}
    WHERE 1=1
  `;

  if (role !== "super_admin" && schoolId != null) {
    params.push(schoolId);
    query += ` AND si.school_id = $${params.length}`;
  }

  params.push(limit);
  query += ` ORDER BY si.issue_date DESC, si.id DESC LIMIT $${params.length}`;

  const result = await pool.query(query, params);

  return result.rows.map((row) => ({
    ...row,
    category_label: STOCK_CATEGORY_LABELS[row.category] || row.category,
    issued_to:
      row.issue_type === "teacher"
        ? row.issued_to_teacher_name
        : row.issue_type === "activity"
          ? row.issued_to_activity_name
          : row.issued_to_department,
  }));
};

const getStockDashboard = async ({ schoolId, role }) => {
  const entries = await listStockEntries({ schoolId, role });
  const recentIssues = await listStockIssues({ schoolId, role, limit: 10 });

  const totalItems = entries.length;
  const totalValue = entries.reduce(
    (sum, row) => sum + Number(row.available_quantity) * Number(row.purchase_rate),
    0
  );
  const lowStockItems = entries.filter((row) => row.is_low_stock);

  return {
    total_items: totalItems,
    total_value: Number(totalValue.toFixed(2)),
    low_stock_threshold: getLowStockThreshold(),
    low_stock_count: lowStockItems.length,
    low_stock_items: lowStockItems,
    recent_issues: recentIssues,
    categories: STOCK_CATEGORIES.map((value) => ({
      value,
      label: STOCK_CATEGORY_LABELS[value],
    })),
  };
};

const listAuditLogs = async ({ schoolId, role, entityType, entityId, limit = 50 }) => {
  const params = [];
  let query = `
    SELECT
      sal.id,
      sal.school_id,
      sal.entity_type,
      sal.entity_id,
      sal.action,
      sal.actor_user_id,
      sal.changes,
      sal.created_at,
      actor.name AS actor_name
    FROM stock_audit_logs sal
    LEFT JOIN users actor ON actor.id = sal.actor_user_id
    WHERE 1=1
  `;

  if (role !== "super_admin" && schoolId != null) {
    params.push(schoolId);
    query += ` AND sal.school_id = $${params.length}`;
  }

  if (entityType) {
    params.push(entityType);
    query += ` AND sal.entity_type = $${params.length}`;
  }

  if (entityId) {
    params.push(entityId);
    query += ` AND sal.entity_id = $${params.length}`;
  }

  params.push(limit);
  query += ` ORDER BY sal.created_at DESC LIMIT $${params.length}`;

  const result = await pool.query(query, params);
  return result.rows;
};

module.exports = {
  getLowStockThreshold,
  listStockEntries,
  getStockEntryById,
  createStockEntry,
  createStockEntryFromExpenseRequest,
  issueStock,
  listStockIssues,
  getStockIssueById,
  getStockDashboard,
  listAuditLogs,
};
