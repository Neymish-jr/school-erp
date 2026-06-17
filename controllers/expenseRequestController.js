const expenseRequestService = require("../services/expenseRequestService");
const { successResponse, errorResponse } = require("../utils/response");

const getSchoolId = (req) => req.user?.school_id || 1;
const getUserId = (req) => req.user?.id;
const getRole = (req) => req.user?.role;

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

const normalizePayload = (payload = {}) => ({
  budget_allocation_id: Number(payload.budget_allocation_id),
  requested_amount: Number(payload.requested_amount),
  purpose: String(payload.purpose || "").trim(),
  vendor_name: String(payload.vendor_name ?? "").trim(),
  remarks: String(payload.remarks ?? "").trim(),
});

const getExpenseRequests = async (req, res) => {
  try {
    const data = await expenseRequestService.listExpenseRequests({
      schoolId: getSchoolId(req),
      userId: getUserId(req),
      role: getRole(req),
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
    const data = await expenseRequestService.getExpenseRequestSummary({
      schoolId: getSchoolId(req),
      userId: getUserId(req),
      role: getRole(req),
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
    const data = await expenseRequestService.getAllocationBalance(
      Number(req.params.id),
      getSchoolId(req)
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
    const data = await expenseRequestService.getExpenseRequestById(
      req.params.id,
      getSchoolId(req),
      getUserId(req),
      getRole(req)
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
    const payload = normalizePayload(req.body);
    const data = await expenseRequestService.createExpenseRequest({
      schoolId: getSchoolId(req),
      userId: getUserId(req),
      budgetAllocationId: payload.budget_allocation_id,
      requestedAmount: payload.requested_amount,
      purpose: payload.purpose,
      vendorName: payload.vendor_name,
      remarks: payload.remarks,
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
    const payload = normalizePayload(req.body);
    const data = await expenseRequestService.updateExpenseRequest({
      id: req.params.id,
      schoolId: getSchoolId(req),
      userId: getUserId(req),
      role: getRole(req),
      requestedAmount: payload.requested_amount,
      purpose: payload.purpose,
      vendorName: payload.vendor_name,
      remarks: payload.remarks,
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
    const data = await expenseRequestService.deleteExpenseRequest(
      req.params.id,
      getSchoolId(req),
      getUserId(req),
      getRole(req)
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
    const data = await expenseRequestService.submitExpenseRequest(
      req.params.id,
      getSchoolId(req),
      getUserId(req),
      getRole(req)
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
    const data = await expenseRequestService.approveExpenseRequest(
      req.params.id,
      getSchoolId(req),
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
    const data = await expenseRequestService.rejectExpenseRequest(
      req.params.id,
      getSchoolId(req),
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
    const data = await expenseRequestService.markExpenseRequestPaid(
      req.params.id,
      getSchoolId(req),
      getUserId(req),
      {
        paymentVoucherNo: String(req.body.payment_voucher_no || "").trim(),
        paymentTransactionId: String(req.body.payment_transaction_id || "").trim(),
        paidAt: req.body.paid_at || null,
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
