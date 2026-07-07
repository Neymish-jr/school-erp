const expenseRequestService = require("../services/expenseRequestService");
const { successResponse, errorResponse } = require("../utils/response");
const {
  resolveSchoolIdForWrite,
  resolveSchoolScope,
} = require("../utils/tenantScope");

const getUserId = (req) => req.user?.id;

const handleServiceError = (res, err) => {
  if (err.statusCode) {
    return errorResponse(res, {
      message: err.message,
      error: err.message,
      status: err.statusCode,
    });
  }

  console.error(err);
  return errorResponse(res, {
    message: "Unexpected error processing expense request",
    error: err.message,
    status: 500,
  });
};

const normalizeOptionalId = (value) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  return Number(value);
};

const normalizeOptionalQuantity = (value) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  return Number(value);
};

const normalizePayload = (payload = {}) => ({
  budget_allocation_id: Number(payload.budget_allocation_id),
  requested_amount: Number(payload.requested_amount),
  purpose: String(payload.purpose || "").trim(),
  vendor_name: String(payload.vendor_name ?? "").trim(),
  remarks: String(payload.remarks ?? "").trim(),
  activity_id: normalizeOptionalId(payload.activity_id),
  item_name:
    payload.item_name === undefined
      ? undefined
      : String(payload.item_name ?? "").trim() || null,
  quantity: normalizeOptionalQuantity(payload.quantity),
});

const getExpenseRequests = async (req, res) => {
  try {
    const scope = resolveSchoolScope(req, res);
    if (!scope) {
      return;
    }

    const data = await expenseRequestService.listExpenseRequests({
      schoolId: scope.schoolId,
      userId: getUserId(req),
      role: scope.role,
      status: req.query.status,
      budgetAllocationId: req.query.budget_allocation_id
        ? Number(req.query.budget_allocation_id)
        : undefined,
      financialYearId: req.query.financial_year_id
        ? Number(req.query.financial_year_id)
        : undefined,
      submittedByUserId: req.query.submitted_by_user_id
        ? Number(req.query.submitted_by_user_id)
        : undefined,
      activityId: req.query.activity_id ? Number(req.query.activity_id) : undefined,
    });

    return successResponse(res, {
      message: "Expense requests fetched successfully",
      data,
    });
  } catch (err) {
    return handleServiceError(res, err);
  }
};

const getExpenseRequestSummary = async (req, res) => {
  try {
    const scope = resolveSchoolScope(req, res);
    if (!scope) {
      return;
    }

    const data = await expenseRequestService.getExpenseRequestSummary({
      schoolId: scope.schoolId,
      userId: getUserId(req),
      role: scope.role,
      financialYearId: req.query.financial_year_id
        ? Number(req.query.financial_year_id)
        : undefined,
    });

    return successResponse(res, {
      message: "Expense request summary fetched successfully",
      data,
    });
  } catch (err) {
    return handleServiceError(res, err);
  }
};

const getAllocationBalance = async (req, res) => {
  try {
    const schoolId = resolveSchoolIdForWrite(req, res);
    if (schoolId == null) {
      return;
    }

    const excludeRequestId =
      req.query.exclude_request_id != null && req.query.exclude_request_id !== ""
        ? Number(req.query.exclude_request_id)
        : null;

    const data = await expenseRequestService.getAllocationBalance(
      Number(req.params.id),
      schoolId,
      pool,
      excludeRequestId
    );

    return successResponse(res, {
      message: "Allocation balance fetched successfully",
      data,
    });
  } catch (err) {
    return handleServiceError(res, err);
  }
};

const getExpenseRequestById = async (req, res) => {
  try {
    const scope = resolveSchoolScope(req, res);
    if (!scope) {
      return;
    }

    const data = await expenseRequestService.getExpenseRequestById(
      req.params.id,
      scope.schoolId,
      getUserId(req),
      scope.role
    );

    return successResponse(res, {
      message: "Expense request fetched successfully",
      data,
    });
  } catch (err) {
    return handleServiceError(res, err);
  }
};

const createExpenseRequest = async (req, res) => {
  try {
    const schoolId = resolveSchoolIdForWrite(req, res);
    if (schoolId == null) {
      return;
    }

    const payload = normalizePayload(req.body);
    const data = await expenseRequestService.createExpenseRequest({
      schoolId,
      userId: getUserId(req),
      budgetAllocationId: payload.budget_allocation_id,
      requestedAmount: payload.requested_amount,
      purpose: payload.purpose,
      vendorName: payload.vendor_name,
      remarks: payload.remarks,
      activityId: payload.activity_id ?? null,
      itemName: payload.item_name ?? null,
      quantity: payload.quantity ?? null,
    });

    return successResponse(res, {
      message: "Expense request created successfully",
      data,
      status: 201,
    });
  } catch (err) {
    return handleServiceError(res, err);
  }
};

const updateExpenseRequest = async (req, res) => {
  try {
    const scope = resolveSchoolScope(req, res);
    if (!scope) {
      return;
    }

    const payload = normalizePayload(req.body);
    const data = await expenseRequestService.updateExpenseRequest({
      id: req.params.id,
      schoolId: scope.schoolId,
      userId: getUserId(req),
      role: scope.role,
      requestedAmount: payload.requested_amount,
      purpose: payload.purpose,
      vendorName: payload.vendor_name,
      remarks: payload.remarks,
      activityId: payload.activity_id,
      itemName: payload.item_name,
      quantity: payload.quantity,
    });

    return successResponse(res, {
      message: "Expense request updated successfully",
      data,
    });
  } catch (err) {
    return handleServiceError(res, err);
  }
};

const deleteExpenseRequest = async (req, res) => {
  try {
    const scope = resolveSchoolScope(req, res);
    if (!scope) {
      return;
    }

    const data = await expenseRequestService.deleteExpenseRequest(
      req.params.id,
      scope.schoolId,
      getUserId(req),
      scope.role
    );

    return successResponse(res, {
      message: "Expense request deleted successfully",
      data,
    });
  } catch (err) {
    return handleServiceError(res, err);
  }
};

const submitExpenseRequest = async (req, res) => {
  try {
    const scope = resolveSchoolScope(req, res);
    if (!scope) {
      return;
    }

    const data = await expenseRequestService.submitExpenseRequest(
      req.params.id,
      scope.schoolId,
      getUserId(req),
      scope.role
    );

    return successResponse(res, {
      message: "Expense request submitted successfully",
      data,
    });
  } catch (err) {
    return handleServiceError(res, err);
  }
};

const approveExpenseRequest = async (req, res) => {
  try {
    const schoolId = resolveSchoolIdForWrite(req, res);
    if (schoolId == null) {
      return;
    }

    const data = await expenseRequestService.approveExpenseRequest(
      req.params.id,
      schoolId,
      getUserId(req)
    );

    return successResponse(res, {
      message: "Expense request approved successfully",
      data,
    });
  } catch (err) {
    return handleServiceError(res, err);
  }
};

const rejectExpenseRequest = async (req, res) => {
  try {
    const schoolId = resolveSchoolIdForWrite(req, res);
    if (schoolId == null) {
      return;
    }

    const data = await expenseRequestService.rejectExpenseRequest(
      req.params.id,
      schoolId,
      getUserId(req),
      String(req.body.rejection_remarks || "").trim()
    );

    return successResponse(res, {
      message: "Expense request rejected successfully",
      data,
    });
  } catch (err) {
    return handleServiceError(res, err);
  }
};

const markExpenseRequestPaid = async (req, res) => {
  try {
    const schoolId = resolveSchoolIdForWrite(req, res);
    if (schoolId == null) {
      return;
    }

    const data = await expenseRequestService.markExpenseRequestPaid(
      req.params.id,
      schoolId,
      getUserId(req),
      {
        paymentVoucherNo: String(req.body.payment_voucher_no || "").trim(),
        paymentTransactionId: String(req.body.payment_transaction_id || "").trim(),
        paidAt: req.body.paid_at || null,
        createStockEntry: Boolean(req.body.create_stock_entry),
        stockCategory: req.body.stock_category || null,
        stockUnit: req.body.stock_unit || null,
        purchaseRate:
          req.body.purchase_rate != null ? Number(req.body.purchase_rate) : null,
      }
    );

    return successResponse(res, {
      message: "Expense request marked as paid successfully",
      data,
    });
  } catch (err) {
    return handleServiceError(res, err);
  }
};

module.exports = {
  getExpenseRequests,
  getExpenseRequestSummary,
  getAllocationBalance,
  getExpenseRequestById,
  createExpenseRequest,
  updateExpenseRequest,
  deleteExpenseRequest,
  submitExpenseRequest,
  approveExpenseRequest,
  rejectExpenseRequest,
  markExpenseRequestPaid,
};
