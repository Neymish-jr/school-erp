const pool = require("../db");
const AppError = require("../utils/AppError");
const { FINANCIAL_YEAR_STATUS } = require("../constants/financialYearStatus");
const {
  ACTIVITY_STATUS,
  ALLOCATED_ACTIVITY_STATUSES,
  normalizeActivityStatus,
} = require("../constants/activityStatus");
const { COMMITTED_STATUSES } = require("../constants/expenseRequestStatus");

const ACTIVITY_SELECT = `
  a.id,
  a.activity_name,
  a.description,
  a.allocated_budget,
  a.assigned_teacher_id,
  a.school_id,
  a.budget_allocation_id,
  a.status,
  a.file_path,
  a.created_by_user_id,
  a.submitted_by_user_id,
  a.submitted_at,
  a.reviewed_by_user_id,
  a.reviewed_at,
  a.rejection_remarks,
  a.completed_at,
  a.completed_by_user_id,
  a.created_at,
  a.updated_at,
  t.teacher_name,
  t.designation,
  s.school_name,
  ba.financial_year_id AS budget_financial_year_id,
  ba.allocated_amount AS budget_allocated_amount,
  ba.is_active AS budget_allocation_is_active,
  fy.year_label AS budget_year_label,
  bsh.sub_head_name AS budget_sub_head_name,
  bsh.sub_head_code AS budget_sub_head_code,
  bh.head_name AS budget_head_name,
  bh.head_code AS budget_head_code,
  creator.name AS created_by_name,
  submitter.name AS submitted_by_name,
  reviewer.name AS reviewed_by_name,
  completer.name AS completed_by_name
`;

const ACTIVITY_FROM = `
  FROM activities a
  LEFT JOIN teachers t ON t.id = a.assigned_teacher_id
  LEFT JOIN schools s ON s.id = a.school_id
  LEFT JOIN budget_allocations ba ON ba.id = a.budget_allocation_id
  LEFT JOIN financial_years fy ON fy.id = ba.financial_year_id
  LEFT JOIN budget_sub_heads bsh ON bsh.id = ba.budget_sub_head_id
  LEFT JOIN budget_heads bh ON bh.id = bsh.budget_head_id
  LEFT JOIN users creator ON creator.id = a.created_by_user_id
  LEFT JOIN users submitter ON submitter.id = a.submitted_by_user_id
  LEFT JOIN users reviewer ON reviewer.id = a.reviewed_by_user_id
  LEFT JOIN users completer ON completer.id = a.completed_by_user_id
`;

const assertBudgetAllocationForActivity = async (
  budgetAllocationId,
  schoolId,
  client = pool
) => {
  if (budgetAllocationId == null) {
    return null;
  }

  const result = await client.query(
    `
    SELECT
      ba.id,
      ba.school_id,
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
    throw new AppError(400, "Activities require an active financial year");
  }

  return row;
};

const assertActivityLinkForExpenseRequest = async ({
  activityId,
  schoolId,
  budgetAllocationId,
  client = pool,
}) => {
  if (activityId == null) {
    return null;
  }

  const result = await client.query(
    `
    SELECT
      id,
      school_id,
      budget_allocation_id,
      status
    FROM activities
    WHERE id = $1
      AND school_id = $2
    `,
    [activityId, schoolId],
    client === pool ? undefined : undefined
  );

  if (result.rowCount === 0) {
    throw new AppError(404, "Activity not found");
  }

  const activity = result.rows[0];

  if (
    activity.budget_allocation_id != null &&
    Number(activity.budget_allocation_id) !== Number(budgetAllocationId)
  ) {
    throw new AppError(
      400,
      "Expense request budget allocation must match the linked activity allocation"
    );
  }

  return activity;
};

const buildActivityAccessClause = ({ role, schoolId, userId, teacherId, params }) => {
  const clauses = ["1=1"];

  if (schoolId != null) {
    params.push(schoolId);
    clauses.push(`a.school_id = $${params.length}`);
  }

  if (role === "teacher" && teacherId != null) {
    params.push(teacherId);
    clauses.push(`a.assigned_teacher_id = $${params.length}`);
  }

  return clauses.join(" AND ");
};

const getExpenseSummaryForActivity = async (activityId, schoolId) => {
  const result = await pool.query(
    `
    SELECT
      COUNT(*)::int AS request_count,
      COALESCE(SUM(requested_amount), 0) AS total_requested_amount,
      COALESCE(SUM(requested_amount) FILTER (
        WHERE status IN ('approved', 'paid')
      ), 0) AS total_approved_amount,
      COALESCE(SUM(requested_amount) FILTER (
        WHERE status IN ('pending', 'approved', 'paid')
      ), 0) AS total_committed_amount,
      MIN(submitted_at) AS first_expense_submitted_at
    FROM expense_requests
    WHERE activity_id = $1
      AND school_id = $2
    `,
    [activityId, schoolId]
  );

  return result.rows[0];
};

const listActivities = async ({
  schoolId,
  role,
  teacherId,
  status,
  financialYearId,
}) => {
  const params = [];
  let query = `
    SELECT ${ACTIVITY_SELECT}
    ${ACTIVITY_FROM}
    WHERE ${buildActivityAccessClause({ role, schoolId, teacherId, params })}
  `;

  if (status) {
    params.push(normalizeActivityStatus(status));
    query += ` AND a.status = $${params.length}`;
  }

  if (financialYearId) {
    params.push(financialYearId);
    query += ` AND ba.financial_year_id = $${params.length}`;
  }

  query += ` ORDER BY a.created_at DESC, a.id DESC`;

  const result = await pool.query(query, params);
  return result.rows;
};

const getActivityById = async ({
  id,
  schoolId,
  role,
  teacherId,
}) => {
  const params = [id];
  let query = `
    SELECT ${ACTIVITY_SELECT}
    ${ACTIVITY_FROM}
    WHERE a.id = $1
  `;

  if (schoolId != null) {
    params.push(schoolId);
    query += ` AND a.school_id = $${params.length}`;
  }

  if (role === "teacher" && teacherId != null) {
    params.push(teacherId);
    query += ` AND a.assigned_teacher_id = $${params.length}`;
  }

  const result = await pool.query(query, params);

  if (result.rowCount === 0) {
    throw new AppError(404, "Activity not found");
  }

  const activity = result.rows[0];
  const expenseSummary = await getExpenseSummaryForActivity(activity.id, activity.school_id);

  const expenseRequests = await pool.query(
    `
    SELECT
      er.id,
      er.requested_amount,
      er.purpose,
      er.status,
      er.submitted_at,
      er.reviewed_at,
      er.paid_at,
      er.created_at
    FROM expense_requests er
    WHERE er.activity_id = $1
      AND er.school_id = $2
    ORDER BY er.created_at DESC, er.id DESC
    `,
    [activity.id, activity.school_id]
  );

  return {
    ...activity,
    expense_summary: expenseSummary,
    expense_requests: expenseRequests.rows,
  };
};

const getActivityDashboard = async ({ schoolId, role, teacherId, financialYearId }) => {
  const activityParams = [];
  const accessClause = buildActivityAccessClause({
    role,
    schoolId,
    teacherId,
    params: activityParams,
  });

  let activityFyClause = "";
  if (financialYearId) {
    activityParams.push(financialYearId);
    activityFyClause = ` AND ba.financial_year_id = $${activityParams.length}`;
  }

  const budgetParams = [];
  let budgetFyClause = "";
  if (schoolId != null) {
    budgetParams.push(schoolId);
  }
  if (financialYearId) {
    budgetParams.push(financialYearId);
    budgetFyClause = ` AND ba.financial_year_id = $${budgetParams.length}`;
  }

  const schoolBudgetClause =
    schoolId != null
      ? ` AND ba.school_id = $1 AND ba.is_active = TRUE`
      : ` AND ba.is_active = TRUE`;

  const budgetResult = await pool.query(
    `
    SELECT COALESCE(SUM(ba.allocated_amount), 0) AS total_budget
    FROM budget_allocations ba
    WHERE 1=1
      ${schoolBudgetClause}
      ${budgetFyClause}
    `,
    budgetParams
  );

  const allocatedStatuses = ALLOCATED_ACTIVITY_STATUSES.map((s) => `'${s}'`).join(", ");
  const allocatedResult = await pool.query(
    `
    SELECT COALESCE(SUM(a.allocated_budget), 0) AS allocated_budget
    FROM activities a
    LEFT JOIN budget_allocations ba ON ba.id = a.budget_allocation_id
    WHERE ${accessClause}
      AND a.status IN (${allocatedStatuses})
      ${activityFyClause}
    `,
    activityParams
  );

  const utilizedParams = [];
  const utilizedAccessClause = buildActivityAccessClause({
    role,
    schoolId,
    teacherId,
    params: utilizedParams,
  });
  let utilizedFyClause = "";
  if (financialYearId) {
    utilizedParams.push(financialYearId);
    utilizedFyClause = ` AND ba.financial_year_id = $${utilizedParams.length}`;
  }

  const committedStatuses = COMMITTED_STATUSES.map((s) => `'${s}'`).join(", ");
  const utilizedResult = await pool.query(
    `
    SELECT COALESCE(SUM(er.requested_amount), 0) AS utilized_budget
    FROM expense_requests er
    INNER JOIN activities a ON a.id = er.activity_id AND a.school_id = er.school_id
    LEFT JOIN budget_allocations ba ON ba.id = a.budget_allocation_id
    WHERE ${utilizedAccessClause}
      AND er.status IN (${committedStatuses})
      ${utilizedFyClause}
    `,
    utilizedParams
  );

  const totalBudget = Number(budgetResult.rows[0].total_budget);
  const allocatedBudget = Number(allocatedResult.rows[0].allocated_budget);
  const utilizedBudget = Number(utilizedResult.rows[0].utilized_budget);

  return {
    financial_year_id: financialYearId || null,
    total_budget: totalBudget,
    allocated_budget: allocatedBudget,
    utilized_budget: utilizedBudget,
    remaining_budget: totalBudget - utilizedBudget,
  };
};

const getActivityTimeline = async ({ id, schoolId, role, teacherId }) => {
  const activity = await getActivityById({ id, schoolId, role, teacherId });
  const events = [];

  events.push({
    key: "created",
    label: "Created",
    at: activity.created_at,
    by_user_id: activity.created_by_user_id,
    by_user_name: activity.created_by_name,
  });

  if (activity.submitted_at) {
    events.push({
      key: "submitted",
      label: "Submitted",
      at: activity.submitted_at,
      by_user_id: activity.submitted_by_user_id,
      by_user_name: activity.submitted_by_name,
    });
  }

  if (
    activity.reviewed_at &&
    [ACTIVITY_STATUS.APPROVED, ACTIVITY_STATUS.COMPLETED].includes(activity.status)
  ) {
    events.push({
      key: "approved",
      label: "Approved",
      at: activity.reviewed_at,
      by_user_id: activity.reviewed_by_user_id,
      by_user_name: activity.reviewed_by_name,
    });
  }

  if (activity.reviewed_at && activity.status === ACTIVITY_STATUS.REJECTED) {
    events.push({
      key: "rejected",
      label: "Rejected",
      at: activity.reviewed_at,
      by_user_id: activity.reviewed_by_user_id,
      by_user_name: activity.reviewed_by_name,
      remarks: activity.rejection_remarks,
    });
  }

  if (activity.expense_summary?.first_expense_submitted_at) {
    events.push({
      key: "expenses_raised",
      label: "Expenses Raised",
      at: activity.expense_summary.first_expense_submitted_at,
      count: activity.expense_summary.request_count,
    });
  }

  if (activity.completed_at) {
    events.push({
      key: "completed",
      label: "Completed",
      at: activity.completed_at,
      by_user_id: activity.completed_by_user_id,
      by_user_name: activity.completed_by_name,
    });
  }

  return {
    activity_id: activity.id,
    status: activity.status,
    events: events.sort((left, right) => new Date(left.at) - new Date(right.at)),
  };
};

const createActivity = async ({
  schoolId,
  userId,
  activityName,
  description,
  allocatedBudget,
  assignedTeacherId,
  budgetAllocationId = null,
}) => {
  await assertBudgetAllocationForActivity(budgetAllocationId, schoolId);

  const teacherCheck = await pool.query(
    `
    SELECT id
    FROM teachers
    WHERE id = $1 AND school_id = $2
    `,
    [assignedTeacherId, schoolId]
  );

  if (teacherCheck.rowCount === 0) {
    throw new AppError(404, "Assigned teacher not found in your school");
  }

  const result = await pool.query(
    `
    INSERT INTO activities (
      activity_name,
      description,
      allocated_budget,
      assigned_teacher_id,
      school_id,
      budget_allocation_id,
      status,
      created_by_user_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id
    `,
    [
      activityName,
      description,
      allocatedBudget,
      assignedTeacherId,
      schoolId,
      budgetAllocationId,
      ACTIVITY_STATUS.DRAFT,
      userId,
    ]
  );

  const requiresQuotation = Number(allocatedBudget) > 50000;

  const activity = await getActivityById({
    id: result.rows[0].id,
    schoolId,
    role: "admin",
  });

  return { activity, requires_quotation: requiresQuotation };
};

const submitActivity = async ({ id, schoolId, userId, role, teacherId }) => {
  const activity = await getActivityById({ id, schoolId, role, teacherId });

  if (activity.status !== ACTIVITY_STATUS.DRAFT) {
    throw new AppError(400, "Only draft activities can be submitted");
  }

  if (role === "teacher") {
    const isOwner =
      activity.created_by_user_id === userId ||
      (teacherId != null &&
        Number(activity.assigned_teacher_id) === Number(teacherId));

    if (!isOwner) {
      throw new AppError(403, "You can only submit your own activities");
    }
  }

  await pool.query(
    `
    UPDATE activities
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
      ACTIVITY_STATUS.SUBMITTED,
      userId,
      id,
      schoolId,
      ACTIVITY_STATUS.DRAFT,
    ]
  );

  return getActivityById({ id, schoolId, role, teacherId });
};

const approveActivity = async ({ id, schoolId, reviewerUserId }) => {
  const activity = await getActivityById({ id, schoolId, role: "admin" });

  if (activity.status !== ACTIVITY_STATUS.SUBMITTED) {
    throw new AppError(400, "Only submitted activities can be approved");
  }

  await pool.query(
    `
    UPDATE activities
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
      ACTIVITY_STATUS.APPROVED,
      reviewerUserId,
      id,
      schoolId,
      ACTIVITY_STATUS.SUBMITTED,
    ]
  );

  return getActivityById({ id, schoolId, role: "admin" });
};

const rejectActivity = async ({
  id,
  schoolId,
  reviewerUserId,
  rejectionRemarks,
}) => {
  const activity = await getActivityById({ id, schoolId, role: "admin" });

  if (activity.status !== ACTIVITY_STATUS.SUBMITTED) {
    throw new AppError(400, "Only submitted activities can be rejected");
  }

  await pool.query(
    `
    UPDATE activities
    SET
      status = $1,
      reviewed_by_user_id = $2,
      reviewed_at = NOW(),
      rejection_remarks = $3,
      updated_at = NOW()
    WHERE id = $4
      AND school_id = $5
      AND status = $6
    `,
    [
      ACTIVITY_STATUS.REJECTED,
      reviewerUserId,
      rejectionRemarks,
      id,
      schoolId,
      ACTIVITY_STATUS.SUBMITTED,
    ]
  );

  return getActivityById({ id, schoolId, role: "admin" });
};

const completeActivity = async ({ id, schoolId, userId, role, teacherId }) => {
  const activity = await getActivityById({ id, schoolId, role, teacherId });

  if (activity.status !== ACTIVITY_STATUS.APPROVED) {
    throw new AppError(400, "Only approved activities can be completed");
  }

  if (role === "teacher") {
    if (
      teacherId == null ||
      Number(activity.assigned_teacher_id) !== Number(teacherId)
    ) {
      throw new AppError(403, "Only the assigned teacher can complete this activity");
    }
  }

  await pool.query(
    `
    UPDATE activities
    SET
      status = $1,
      completed_by_user_id = $2,
      completed_at = NOW(),
      updated_at = NOW()
    WHERE id = $3
      AND school_id = $4
      AND status = $5
    `,
    [
      ACTIVITY_STATUS.COMPLETED,
      userId,
      id,
      schoolId,
      ACTIVITY_STATUS.APPROVED,
    ]
  );

  return getActivityById({ id, schoolId, role, teacherId });
};

const updateActivityStatusLegacy = async ({
  id,
  schoolId,
  role,
  teacherId,
  status,
  reviewerUserId,
}) => {
  const normalizedStatus = normalizeActivityStatus(status);

  if (normalizedStatus === ACTIVITY_STATUS.SUBMITTED) {
    return submitActivity({ id, schoolId, userId: reviewerUserId, role, teacherId });
  }

  if (normalizedStatus === ACTIVITY_STATUS.APPROVED) {
    return approveActivity({ id, schoolId, reviewerUserId });
  }

  if (normalizedStatus === ACTIVITY_STATUS.REJECTED) {
    throw new AppError(400, "Use reject endpoint with rejection remarks");
  }

  if (normalizedStatus === ACTIVITY_STATUS.COMPLETED) {
    return completeActivity({
      id,
      schoolId,
      userId: reviewerUserId,
      role,
      teacherId,
    });
  }

  throw new AppError(400, "Invalid status transition");
};

const uploadActivityFile = async ({
  id,
  schoolId,
  role,
  teacherId,
  filePath,
}) => {
  const activity = await getActivityById({ id, schoolId, role, teacherId });

  await pool.query(
    `
    UPDATE activities
    SET file_path = $1, updated_at = NOW()
    WHERE id = $2 AND school_id = $3
    `,
    [filePath, activity.id, schoolId]
  );

  return { file_path: filePath };
};

module.exports = {
  assertBudgetAllocationForActivity,
  assertActivityLinkForExpenseRequest,
  listActivities,
  getActivityById,
  getActivityDashboard,
  getActivityTimeline,
  createActivity,
  submitActivity,
  approveActivity,
  rejectActivity,
  completeActivity,
  updateActivityStatusLegacy,
  uploadActivityFile,
};
