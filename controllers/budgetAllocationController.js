const budgetAllocationService = require("../services/budgetAllocationService");
const { successResponse, errorResponse } = require("../utils/response");

const getSchoolId = (req) => req.user?.school_id || 1;
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
    message: "Unexpected error processing budget allocation request",
    error: err.message,
    status: 500,
  });
};

const getBudgetAllocations = async (req, res) => {
  try {
    const isActive =
      req.query.is_active === "true"
        ? true
        : req.query.is_active === "false"
          ? false
          : undefined;

    const data = await budgetAllocationService.listBudgetAllocations({
      schoolId: getSchoolId(req),
      financialYearId: req.query.financial_year_id
        ? Number(req.query.financial_year_id)
        : undefined,
      budgetSubHeadId: req.query.budget_sub_head_id
        ? Number(req.query.budget_sub_head_id)
        : undefined,
      budgetHeadId: req.query.budget_head_id ? Number(req.query.budget_head_id) : undefined,
      responsibleTeacherId: req.query.responsible_teacher_id
        ? Number(req.query.responsible_teacher_id)
        : undefined,
      isActive,
    });

    return successResponse(res, {
      message: "Budget allocations fetched successfully",
      data,
    });
  } catch (err) {
    return handleServiceError(res, err);
  }
};

const getBudgetAllocationSummary = async (req, res) => {
  try {
    const data = await budgetAllocationService.getBudgetAllocationSummary(
      getSchoolId(req),
      req.query.financial_year_id ? Number(req.query.financial_year_id) : undefined
    );

    return successResponse(res, {
      message: "Budget allocation summary fetched successfully",
      data,
    });
  } catch (err) {
    return handleServiceError(res, err);
  }
};

const getBudgetAllocationById = async (req, res) => {
  try {
    const data = await budgetAllocationService.getBudgetAllocationById(
      req.params.id,
      getSchoolId(req)
    );

    return successResponse(res, {
      message: "Budget allocation fetched successfully",
      data,
    });
  } catch (err) {
    return handleServiceError(res, err);
  }
};

const createBudgetAllocation = async (req, res) => {
  try {
    const data = await budgetAllocationService.createBudgetAllocation({
      schoolId: getSchoolId(req),
      userId: getUserId(req),
      financialYearId: req.body.financial_year_id,
      budgetSubHeadId: req.body.budget_sub_head_id,
      allocatedAmount: req.body.allocated_amount,
      responsibleTeacherId: req.body.responsible_teacher_id ?? null,
      remarks: req.body.remarks,
    });

    return successResponse(res, {
      message: "Budget allocation created successfully",
      data,
      status: 201,
    });
  } catch (err) {
    return handleServiceError(res, err);
  }
};

const updateBudgetAllocation = async (req, res) => {
  try {
    const data = await budgetAllocationService.updateBudgetAllocation({
      id: req.params.id,
      schoolId: getSchoolId(req),
      allocatedAmount: req.body.allocated_amount,
      responsibleTeacherId: req.body.responsible_teacher_id ?? null,
      remarks: req.body.remarks,
    });

    return successResponse(res, {
      message: "Budget allocation updated successfully",
      data,
    });
  } catch (err) {
    return handleServiceError(res, err);
  }
};

const updateBudgetAllocationStatus = async (req, res) => {
  try {
    const data = await budgetAllocationService.updateBudgetAllocationStatus(
      req.params.id,
      getSchoolId(req),
      req.body.is_active
    );

    return successResponse(res, {
      message: data.is_active
        ? "Budget allocation activated successfully"
        : "Budget allocation deactivated successfully",
      data,
    });
  } catch (err) {
    return handleServiceError(res, err);
  }
};

module.exports = {
  getBudgetAllocations,
  getBudgetAllocationSummary,
  getBudgetAllocationById,
  createBudgetAllocation,
  updateBudgetAllocation,
  updateBudgetAllocationStatus,
};
