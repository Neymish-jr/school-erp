const activityService = require("../services/activityService");
const { successResponse, errorResponse } = require("../utils/response");
const {
  resolveSchoolIdForWrite,
  resolveSchoolScope,
} = require("../utils/tenantScope");

const getUserId = (req) => req.user?.id;
const getTeacherId = (req) => req.user?.teacher_id ?? null;

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
    message: "Unexpected error processing activity",
    error: err.message,
    status: 500,
  });
};

const getScopeContext = (req, res) => {
  const scope = resolveSchoolScope(req, res);
  if (!scope) {
    return null;
  }

  return {
    ...scope,
    userId: getUserId(req),
    teacherId: getTeacherId(req),
  };
};

const getActivities = async (req, res) => {
  try {
    const scope = getScopeContext(req, res);
    if (!scope) {
      return;
    }

    const data = await activityService.listActivities({
      schoolId: scope.schoolId,
      role: scope.role,
      teacherId: scope.teacherId,
      status: req.query.status,
      financialYearId: req.query.financial_year_id
        ? Number(req.query.financial_year_id)
        : undefined,
    });

    return successResponse(res, {
      message: "Activities fetched successfully",
      data,
    });
  } catch (err) {
    return handleServiceError(res, err);
  }
};

const getActivityDashboard = async (req, res) => {
  try {
    const scope = getScopeContext(req, res);
    if (!scope) {
      return;
    }

    const data = await activityService.getActivityDashboard({
      schoolId: scope.schoolId,
      role: scope.role,
      teacherId: scope.teacherId,
      financialYearId: req.query.financial_year_id
        ? Number(req.query.financial_year_id)
        : undefined,
    });

    return successResponse(res, {
      message: "Activity dashboard fetched successfully",
      data,
    });
  } catch (err) {
    return handleServiceError(res, err);
  }
};

const getActivityById = async (req, res) => {
  try {
    const scope = getScopeContext(req, res);
    if (!scope) {
      return;
    }

    const data = await activityService.getActivityById({
      id: Number(req.params.id),
      schoolId: scope.schoolId,
      role: scope.role,
      teacherId: scope.teacherId,
    });

    return successResponse(res, {
      message: "Activity fetched successfully",
      data,
    });
  } catch (err) {
    return handleServiceError(res, err);
  }
};

const getActivityTimeline = async (req, res) => {
  try {
    const scope = getScopeContext(req, res);
    if (!scope) {
      return;
    }

    const data = await activityService.getActivityTimeline({
      id: Number(req.params.id),
      schoolId: scope.schoolId,
      role: scope.role,
      teacherId: scope.teacherId,
    });

    return successResponse(res, {
      message: "Activity timeline fetched successfully",
      data,
    });
  } catch (err) {
    return handleServiceError(res, err);
  }
};

const createActivity = async (req, res) => {
  try {
    const schoolId = resolveSchoolIdForWrite(req, res);
    if (schoolId == null) {
      return;
    }

    const { role, teacher_id: teacherId } = req.user;
    let assignedTeacherId = Number(req.body.assigned_teacher_id);

    if (role === "teacher") {
      if (teacherId == null) {
        return errorResponse(res, {
          message: "Teacher profile is required to create activities",
          error: "Missing teacher_id",
          status: 400,
        });
      }

      assignedTeacherId = Number(teacherId);
    }

    const data = await activityService.createActivity({
      schoolId,
      userId: getUserId(req),
      activityName: req.body.activity_name,
      description: req.body.description,
      allocatedBudget: Number(req.body.allocated_budget),
      assignedTeacherId,
      budgetAllocationId:
        req.body.budget_allocation_id != null && req.body.budget_allocation_id !== ""
          ? Number(req.body.budget_allocation_id)
          : null,
    });

    return successResponse(res, {
      message: "Activity created successfully",
      data,
      status: 201,
    });
  } catch (err) {
    return handleServiceError(res, err);
  }
};

const updateActivity = async (req, res) => {
  try {
    const scope = getScopeContext(req, res);
    if (!scope) {
      return;
    }

    const { role, teacher_id: teacherId } = req.user;
    let assignedTeacherId;

    if (role === "teacher") {
      if (teacherId == null) {
        return errorResponse(res, {
          message: "Teacher profile is required to update activities",
          error: "Missing teacher_id",
          status: 400,
        });
      }
    } else if (req.body.assigned_teacher_id != null && req.body.assigned_teacher_id !== "") {
      assignedTeacherId = Number(req.body.assigned_teacher_id);
    }

    const data = await activityService.updateActivity({
      id: Number(req.params.id),
      schoolId: scope.schoolId,
      userId: scope.userId,
      role: scope.role,
      teacherId: scope.teacherId,
      activityName: req.body.activity_name,
      description: req.body.description,
      allocatedBudget: Number(req.body.allocated_budget),
      assignedTeacherId,
      budgetAllocationId:
        req.body.budget_allocation_id != null && req.body.budget_allocation_id !== ""
          ? Number(req.body.budget_allocation_id)
          : null,
    });

    return successResponse(res, {
      message: "Activity updated successfully",
      data,
    });
  } catch (err) {
    return handleServiceError(res, err);
  }
};

const getActivityAllocationAvailability = async (req, res) => {
  try {
    const scope = getScopeContext(req, res);
    if (!scope) {
      return;
    }

    const allocationId = Number(req.params.allocationId);
    const excludeActivityId =
      req.query.exclude_activity_id != null && req.query.exclude_activity_id !== ""
        ? Number(req.query.exclude_activity_id)
        : null;

    const data = await activityService.getActivityAllocationAvailability(
      allocationId,
      scope.schoolId,
      excludeActivityId
    );

    return successResponse(res, {
      message: "Activity allocation availability fetched successfully",
      data,
    });
  } catch (err) {
    return handleServiceError(res, err);
  }
};

const submitActivity = async (req, res) => {
  try {
    const scope = getScopeContext(req, res);
    if (!scope) {
      return;
    }

    const data = await activityService.submitActivity({
      id: Number(req.params.id),
      schoolId: scope.schoolId,
      userId: scope.userId,
      role: scope.role,
      teacherId: scope.teacherId,
    });

    return successResponse(res, {
      message: "Activity submitted successfully",
      data,
    });
  } catch (err) {
    return handleServiceError(res, err);
  }
};

const approveActivity = async (req, res) => {
  try {
    const schoolId = resolveSchoolIdForWrite(req, res);
    if (schoolId == null) {
      return;
    }

    const data = await activityService.approveActivity({
      id: Number(req.params.id),
      schoolId,
      reviewerUserId: getUserId(req),
    });

    return successResponse(res, {
      message: "Activity approved successfully",
      data,
    });
  } catch (err) {
    return handleServiceError(res, err);
  }
};

const rejectActivity = async (req, res) => {
  try {
    const schoolId = resolveSchoolIdForWrite(req, res);
    if (schoolId == null) {
      return;
    }

    const data = await activityService.rejectActivity({
      id: Number(req.params.id),
      schoolId,
      reviewerUserId: getUserId(req),
      rejectionRemarks: String(req.body.rejection_remarks || "").trim(),
    });

    return successResponse(res, {
      message: "Activity rejected successfully",
      data,
    });
  } catch (err) {
    return handleServiceError(res, err);
  }
};

const completeActivity = async (req, res) => {
  try {
    const scope = getScopeContext(req, res);
    if (!scope) {
      return;
    }

    const data = await activityService.completeActivity({
      id: Number(req.params.id),
      schoolId: scope.schoolId,
      userId: scope.userId,
      role: scope.role,
      teacherId: scope.teacherId,
    });

    return successResponse(res, {
      message: "Activity completed successfully",
      data,
    });
  } catch (err) {
    return handleServiceError(res, err);
  }
};

const updateActivityStatus = async (req, res) => {
  try {
    const scope = getScopeContext(req, res);
    if (!scope) {
      return;
    }

    const data = await activityService.updateActivityStatusLegacy({
      id: Number(req.params.id),
      schoolId: scope.schoolId,
      role: scope.role,
      teacherId: scope.teacherId,
      status: req.body.status,
      reviewerUserId: scope.userId,
    });

    return successResponse(res, {
      message: "Activity status updated successfully",
      data,
    });
  } catch (err) {
    return handleServiceError(res, err);
  }
};

const uploadActivityFile = async (req, res) => {
  try {
    const scope = getScopeContext(req, res);
    if (!scope) {
      return;
    }

    if (!req.file) {
      return errorResponse(res, {
        message: "No file uploaded",
        error: "No file uploaded",
        status: 400,
      });
    }

    const data = await activityService.uploadActivityFile({
      id: Number(req.params.id),
      schoolId: scope.schoolId,
      role: scope.role,
      teacherId: scope.teacherId,
      filePath: req.file.path,
    });

    return successResponse(res, {
      message: "File uploaded successfully",
      data,
    });
  } catch (err) {
    return handleServiceError(res, err);
  }
};

module.exports = {
  getActivities,
  getActivityDashboard,
  getActivityById,
  getActivityTimeline,
  createActivity,
  updateActivity,
  getActivityAllocationAvailability,
  submitActivity,
  approveActivity,
  rejectActivity,
  completeActivity,
  updateActivityStatus,
  uploadActivityFile,
};
