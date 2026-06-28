const financialYearService = require("../services/financialYearService");
const { successResponse, errorResponse } = require("../utils/response");
const { resolveSchoolIdForWrite } = require("../utils/tenantScope");

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
    message: "Unexpected error processing financial year request",
    error: err.message,
    status: 500,
  });
};

const getFinancialYears = async (req, res) => {
  try {
    const schoolId = resolveSchoolIdForWrite(req, res);
    if (schoolId == null) {
      return;
    }

    const data = await financialYearService.listFinancialYears({
      schoolId,
      search: req.query.search,
      status: req.query.status,
    });

    return successResponse(res, {
      message: "Financial years fetched successfully",
      data,
    });
  } catch (err) {
    return handleServiceError(res, err);
  }
};

const getActiveFinancialYear = async (req, res) => {
  try {
    const schoolId = resolveSchoolIdForWrite(req, res);
    if (schoolId == null) {
      return;
    }

    const data = await financialYearService.getActiveFinancialYear(schoolId);

    if (!data) {
      return errorResponse(res, {
        message: "No active financial year found",
        error: "Not found",
        status: 404,
      });
    }

    return successResponse(res, {
      message: "Active financial year fetched successfully",
      data,
    });
  } catch (err) {
    return handleServiceError(res, err);
  }
};

const getFinancialYearById = async (req, res) => {
  try {
    const schoolId = resolveSchoolIdForWrite(req, res);
    if (schoolId == null) {
      return;
    }

    const data = await financialYearService.getFinancialYearById(
      req.params.id,
      schoolId
    );

    return successResponse(res, {
      message: "Financial year fetched successfully",
      data,
    });
  } catch (err) {
    return handleServiceError(res, err);
  }
};

const createFinancialYear = async (req, res) => {
  try {
    const schoolId = resolveSchoolIdForWrite(req, res);
    if (schoolId == null) {
      return;
    }

    const data = await financialYearService.createFinancialYear({
      schoolId,
      userId: getUserId(req),
      yearLabel: req.body.year_label,
      remarks: req.body.remarks,
    });

    return successResponse(res, {
      message: "Financial year created successfully",
      data,
      status: 201,
    });
  } catch (err) {
    return handleServiceError(res, err);
  }
};

const updateFinancialYear = async (req, res) => {
  try {
    const schoolId = resolveSchoolIdForWrite(req, res);
    if (schoolId == null) {
      return;
    }

    const data = await financialYearService.updateFinancialYear({
      id: req.params.id,
      schoolId,
      remarks: req.body.remarks,
    });

    return successResponse(res, {
      message: "Financial year updated successfully",
      data,
    });
  } catch (err) {
    return handleServiceError(res, err);
  }
};

const activateFinancialYear = async (req, res) => {
  try {
    const schoolId = resolveSchoolIdForWrite(req, res);
    if (schoolId == null) {
      return;
    }

    const data = await financialYearService.activateFinancialYear(
      req.params.id,
      schoolId
    );

    return successResponse(res, {
      message: "Financial year activated successfully",
      data,
    });
  } catch (err) {
    return handleServiceError(res, err);
  }
};

const closeFinancialYear = async (req, res) => {
  try {
    const schoolId = resolveSchoolIdForWrite(req, res);
    if (schoolId == null) {
      return;
    }

    const data = await financialYearService.closeFinancialYear(
      req.params.id,
      schoolId
    );

    return successResponse(res, {
      message: "Financial year closed successfully",
      data,
    });
  } catch (err) {
    return handleServiceError(res, err);
  }
};

const deleteFinancialYear = async (req, res) => {
  try {
    const schoolId = resolveSchoolIdForWrite(req, res);
    if (schoolId == null) {
      return;
    }

    const data = await financialYearService.deleteFinancialYear(
      req.params.id,
      schoolId
    );

    return successResponse(res, {
      message: "Financial year deleted successfully",
      data,
    });
  } catch (err) {
    return handleServiceError(res, err);
  }
};

module.exports = {
  getFinancialYears,
  getActiveFinancialYear,
  getFinancialYearById,
  createFinancialYear,
  updateFinancialYear,
  activateFinancialYear,
  closeFinancialYear,
  deleteFinancialYear,
};
