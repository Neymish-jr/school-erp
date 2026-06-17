const budgetSubHeadService = require("../services/budgetSubHeadService");

const { successResponse, errorResponse } = require("../utils/response");



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

    message: "Unexpected error processing budget sub head request",

    error: err.message,

    status: 500,

  });

};



const normalizePayload = (payload = {}) => ({

  budget_head_id: Number(payload.budget_head_id),

  sub_head_name: String(payload.sub_head_name || "").trim(),

  remarks: String(payload.remarks ?? "").trim(),

});



const getBudgetSubHeads = async (req, res) => {

  try {

    const isActive =

      req.query.is_active === "true"

        ? true

        : req.query.is_active === "false"

          ? false

          : undefined;



    const data = await budgetSubHeadService.listBudgetSubHeads({

      search: req.query.search,

      budgetHeadId: req.query.budget_head_id ? Number(req.query.budget_head_id) : undefined,

      isActive,

    });



    return successResponse(res, {

      message: "Budget sub heads fetched successfully",

      data,

    });

  } catch (err) {

    return handleServiceError(res, err);

  }

};



const getBudgetSubHeadById = async (req, res) => {

  try {

    const data = await budgetSubHeadService.getBudgetSubHeadById(req.params.id);



    return successResponse(res, {

      message: "Budget sub head fetched successfully",

      data,

    });

  } catch (err) {

    return handleServiceError(res, err);

  }

};



const createBudgetSubHead = async (req, res) => {

  try {

    const payload = normalizePayload(req.body);

    const data = await budgetSubHeadService.createBudgetSubHead({

      userId: getUserId(req),

      budgetHeadId: payload.budget_head_id,

      subHeadName: payload.sub_head_name,

      remarks: payload.remarks,

    });



    return successResponse(res, {

      message: "Budget sub head created successfully",

      data,

      status: 201,

    });

  } catch (err) {

    return handleServiceError(res, err);

  }

};



const updateBudgetSubHead = async (req, res) => {

  try {

    const payload = normalizePayload(req.body);

    const data = await budgetSubHeadService.updateBudgetSubHead({

      id: req.params.id,

      budgetHeadId: payload.budget_head_id,

      subHeadName: payload.sub_head_name,

      remarks: payload.remarks,

    });



    return successResponse(res, {

      message: "Budget sub head updated successfully",

      data,

    });

  } catch (err) {

    return handleServiceError(res, err);

  }

};



const updateBudgetSubHeadStatus = async (req, res) => {

  try {

    const data = await budgetSubHeadService.updateBudgetSubHeadStatus(

      req.params.id,

      req.body.is_active

    );



    return successResponse(res, {

      message: data.is_active

        ? "Budget sub head activated successfully"

        : "Budget sub head deactivated successfully",

      data,

    });

  } catch (err) {

    return handleServiceError(res, err);

  }

};



module.exports = {

  getBudgetSubHeads,

  getBudgetSubHeadById,

  createBudgetSubHead,

  updateBudgetSubHead,

  updateBudgetSubHeadStatus,

};

