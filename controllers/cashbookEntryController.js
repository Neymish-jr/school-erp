const cashbookEntryService = require("../services/cashbookEntryService");
const { successResponse, errorResponse } = require("../utils/response");
const { resolveSchoolScope } = require("../utils/tenantScope");

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
    message: "Unexpected error processing cashbook request",
    error: err.message,
    status: 500,
  });
};

const buildFilters = (req, res) => {
  const scope = resolveSchoolScope(req, res);
  if (!scope) {
    return null;
  }

  return {
    schoolId: scope.schoolId,
    role: scope.role,
    financialYearId: req.query.financial_year_id ? Number(req.query.financial_year_id) : undefined,
    budgetHeadId: req.query.budget_head_id ? Number(req.query.budget_head_id) : undefined,
    budgetSubHeadId: req.query.budget_sub_head_id ? Number(req.query.budget_sub_head_id) : undefined,
    budgetAllocationId: req.query.budget_allocation_id
      ? Number(req.query.budget_allocation_id)
      : undefined,
    dateFrom: req.query.date_from || undefined,
    dateTo: req.query.date_to || undefined,
    voucherNo: req.query.voucher_no || undefined,
    vendorName: req.query.vendor_name || undefined,
    search: req.query.search || undefined,
    page: req.query.page,
    limit: req.query.limit,
  };
};

const getCashbookEntries = async (req, res) => {
  try {
    const filters = buildFilters(req, res);
    if (!filters) {
      return;
    }

    const result = await cashbookEntryService.listCashbookEntries(filters);

    return res.status(200).json({
      success: true,
      message: "Cashbook entries fetched successfully",
      data: result.data,
      pagination: result.pagination,
      error: null,
    });
  } catch (err) {
    return handleServiceError(res, err);
  }
};

const getCashbookEntry = async (req, res) => {
  try {
    const scope = resolveSchoolScope(req, res);
    if (!scope) {
      return;
    }

    const data = await cashbookEntryService.getCashbookEntryById(
      Number(req.params.id),
      scope.schoolId,
      scope.role
    );

    return successResponse(res, {
      message: "Cashbook entry fetched successfully",
      data,
    });
  } catch (err) {
    return handleServiceError(res, err);
  }
};

const getCashbookSummary = async (req, res) => {
  try {
    const filters = buildFilters(req, res);
    if (!filters) {
      return;
    }

    const data = await cashbookEntryService.getCashbookSummary(filters);

    return successResponse(res, {
      message: "Cashbook summary fetched successfully",
      data,
    });
  } catch (err) {
    return handleServiceError(res, err);
  }
};

const exportCashbook = async (req, res) => {
  try {
    const filters = buildFilters(req, res);
    if (!filters) {
      return;
    }

    const { buffer, filename } = await cashbookEntryService.exportCashbookEntriesXlsx(
      filters
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${filename}`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    return res.send(buffer);
  } catch (err) {
    return handleServiceError(res, err);
  }
};

module.exports = {
  getCashbookEntries,
  getCashbookEntry,
  getCashbookSummary,
  exportCashbook,
};
