const stockRegisterService = require("../services/stockRegisterService");
const { successResponse, errorResponse } = require("../utils/response");
const {
  resolveSchoolIdForWrite,
  resolveSchoolScope,
} = require("../utils/tenantScope");
const {
  STOCK_CATEGORIES,
  STOCK_CATEGORY_LABELS,
  getLowStockThreshold,
} = require("../constants/stockCategories");

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
    message: "Unexpected error processing stock register",
    error: err.message,
    status: 500,
  });
};

const getStockConfig = async (req, res) => {
  return successResponse(res, {
    message: "Stock configuration fetched successfully",
    data: {
      categories: STOCK_CATEGORIES.map((value) => ({
        value,
        label: STOCK_CATEGORY_LABELS[value],
      })),
      low_stock_threshold: getLowStockThreshold(),
    },
  });
};

const getStockDashboard = async (req, res) => {
  try {
    const scope = resolveSchoolScope(req, res);
    if (!scope) {
      return;
    }

    const data = await stockRegisterService.getStockDashboard({
      schoolId: scope.schoolId,
      role: scope.role,
    });

    return successResponse(res, {
      message: "Stock dashboard fetched successfully",
      data,
    });
  } catch (err) {
    return handleServiceError(res, err);
  }
};

const getStockEntries = async (req, res) => {
  try {
    const scope = resolveSchoolScope(req, res);
    if (!scope) {
      return;
    }

    const data = await stockRegisterService.listStockEntries({
      schoolId: scope.schoolId,
      role: scope.role,
      category: req.query.category || undefined,
      itemName: req.query.item_name || undefined,
      lowStockOnly: req.query.low_stock === "true",
    });

    return successResponse(res, {
      message: "Stock entries fetched successfully",
      data,
    });
  } catch (err) {
    return handleServiceError(res, err);
  }
};

const getStockEntryById = async (req, res) => {
  try {
    const scope = resolveSchoolScope(req, res);
    if (!scope) {
      return;
    }

    const data = await stockRegisterService.getStockEntryById({
      id: Number(req.params.id),
      schoolId: scope.schoolId,
      role: scope.role,
    });

    return successResponse(res, {
      message: "Stock entry fetched successfully",
      data,
    });
  } catch (err) {
    return handleServiceError(res, err);
  }
};

const createStockEntry = async (req, res) => {
  try {
    const schoolId = resolveSchoolIdForWrite(req, res);
    if (schoolId == null) {
      return;
    }

    const quantity = Number(req.body.quantity);
    const purchaseRate = Number(req.body.purchase_rate);

    const data = await stockRegisterService.createStockEntry({
      schoolId,
      userId: getUserId(req),
      itemName: String(req.body.item_name || "").trim(),
      category: req.body.category,
      quantity,
      unit: String(req.body.unit || "").trim(),
      purchaseRate,
      vendorName: String(req.body.vendor_name || "").trim() || null,
      purchaseDate: req.body.purchase_date,
      source: "manual",
    });

    return successResponse(res, {
      message: "Stock entry created successfully",
      data,
      status: 201,
    });
  } catch (err) {
    return handleServiceError(res, err);
  }
};

const getStockIssues = async (req, res) => {
  try {
    const scope = resolveSchoolScope(req, res);
    if (!scope) {
      return;
    }

    const data = await stockRegisterService.listStockIssues({
      schoolId: scope.schoolId,
      role: scope.role,
      limit: req.query.limit ? Number(req.query.limit) : 20,
    });

    return successResponse(res, {
      message: "Stock issues fetched successfully",
      data,
    });
  } catch (err) {
    return handleServiceError(res, err);
  }
};

const createStockIssue = async (req, res) => {
  try {
    const schoolId = resolveSchoolIdForWrite(req, res);
    if (schoolId == null) {
      return;
    }

    const data = await stockRegisterService.issueStock({
      schoolId,
      userId: getUserId(req),
      stockEntryId: Number(req.body.stock_entry_id),
      issuedQuantity: Number(req.body.issued_quantity),
      issueType: req.body.issue_type,
      issuedToTeacherId:
        req.body.issued_to_teacher_id != null
          ? Number(req.body.issued_to_teacher_id)
          : null,
      issuedToActivityId:
        req.body.issued_to_activity_id != null
          ? Number(req.body.issued_to_activity_id)
          : null,
      issuedToDepartment: req.body.issued_to_department || null,
      issueDate: req.body.issue_date,
      remarks: String(req.body.remarks || "").trim() || null,
    });

    return successResponse(res, {
      message: "Stock issued successfully",
      data,
      status: 201,
    });
  } catch (err) {
    return handleServiceError(res, err);
  }
};

const getStockAuditLogs = async (req, res) => {
  try {
    const scope = resolveSchoolScope(req, res);
    if (!scope) {
      return;
    }

    const data = await stockRegisterService.listAuditLogs({
      schoolId: scope.schoolId,
      role: scope.role,
      entityType: req.query.entity_type || undefined,
      entityId: req.query.entity_id ? Number(req.query.entity_id) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : 50,
    });

    return successResponse(res, {
      message: "Stock audit logs fetched successfully",
      data,
    });
  } catch (err) {
    return handleServiceError(res, err);
  }
};

// Backward-compatible alias for legacy GET /api/stock
const getStockRegister = getStockEntries;

module.exports = {
  getStockConfig,
  getStockDashboard,
  getStockEntries,
  getStockEntryById,
  createStockEntry,
  getStockIssues,
  createStockIssue,
  getStockAuditLogs,
  getStockRegister,
};
