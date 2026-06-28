const quotationService = require("../services/quotationService");
const { successResponse, errorResponse } = require("../utils/response");
const {
  resolveSchoolIdForWrite,
  resolveSchoolScope,
} = require("../utils/tenantScope");
const {
  getQuotationRequiredThreshold,
} = require("../constants/quotationConfig");

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
    message: "Unexpected error processing quotation",
    error: err.message,
    status: 500,
  });
};

const getQuotationConfig = async (req, res) => {
  return successResponse(res, {
    message: "Quotation configuration fetched successfully",
    data: {
      quotation_required_threshold: getQuotationRequiredThreshold(),
    },
  });
};

const getQuotations = async (req, res) => {
  try {
    const scope = resolveSchoolScope(req, res);
    if (!scope) {
      return;
    }

    const data = await quotationService.listQuotations({
      schoolId: scope.schoolId,
      role: scope.role,
      expenseRequestId: req.query.expense_request_id
        ? Number(req.query.expense_request_id)
        : undefined,
    });

    return successResponse(res, {
      message: "Quotations fetched successfully",
      data,
    });
  } catch (err) {
    return handleServiceError(res, err);
  }
};

const getQuotationComparison = async (req, res) => {
  try {
    const scope = resolveSchoolScope(req, res);
    if (!scope) {
      return;
    }

    const data = await quotationService.getQuotationComparison({
      expenseRequestId: Number(req.params.expenseRequestId),
      schoolId: scope.schoolId,
      role: scope.role,
    });

    return successResponse(res, {
      message: "Quotation comparison fetched successfully",
      data,
    });
  } catch (err) {
    return handleServiceError(res, err);
  }
};

const getQuotationById = async (req, res) => {
  try {
    const scope = resolveSchoolScope(req, res);
    if (!scope) {
      return;
    }

    const data = await quotationService.getQuotationById({
      id: Number(req.params.id),
      schoolId: scope.schoolId,
      role: scope.role,
    });

    return successResponse(res, {
      message: "Quotation fetched successfully",
      data,
    });
  } catch (err) {
    return handleServiceError(res, err);
  }
};

const createQuotation = async (req, res) => {
  try {
    const schoolId = resolveSchoolIdForWrite(req, res);
    if (schoolId == null) {
      return;
    }

    const expenseRequestId =
      req.body.expense_request_id != null && req.body.expense_request_id !== ""
        ? Number(req.body.expense_request_id)
        : null;
    const expenseId =
      req.body.expense_id != null && req.body.expense_id !== ""
        ? Number(req.body.expense_id)
        : null;

    const data = await quotationService.createQuotation({
      schoolId,
      role: req.user.role,
      userId: getUserId(req),
      expenseRequestId,
      expenseId,
      vendorName: String(req.body.vendor_name || "").trim(),
      vendorContact: String(req.body.vendor_contact || "").trim() || null,
      quotationAmount: Number(req.body.quotation_amount),
      quotationDate: req.body.quotation_date || new Date().toISOString().slice(0, 10),
      remarks: String(req.body.remarks || "").trim() || null,
      attachmentPath: req.file?.path || null,
    });

    return successResponse(res, {
      message: "Quotation created successfully",
      data,
      status: 201,
    });
  } catch (err) {
    return handleServiceError(res, err);
  }
};

const selectQuotation = async (req, res) => {
  try {
    const schoolId = resolveSchoolIdForWrite(req, res);
    if (schoolId == null) {
      return;
    }

    const data = await quotationService.selectQuotation({
      id: Number(req.params.id),
      schoolId,
      role: req.user.role,
      userId: getUserId(req),
    });

    return successResponse(res, {
      message: "Quotation selected successfully",
      data,
    });
  } catch (err) {
    return handleServiceError(res, err);
  }
};

module.exports = {
  getQuotationConfig,
  getQuotations,
  getQuotationComparison,
  getQuotationById,
  createQuotation,
  selectQuotation,
};
