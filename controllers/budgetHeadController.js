const budgetHeadService = require("../services/budgetHeadService");

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

    message: "Unexpected error processing budget head request",

    error: err.message,

    status: 500,

  });

};



const normalizePayload = (payload = {}) => ({

  head_name: String(payload.head_name || "").trim(),

  remarks: String(payload.remarks ?? "").trim(),

});



const getBudgetHeads = async (req, res) => {

  try {

    const isActive =

      req.query.is_active === "true"

        ? true

        : req.query.is_active === "false"

          ? false

          : undefined;



    const data = await budgetHeadService.listBudgetHeads({

      search: req.query.search,

      isActive,

      includeSubHeads: req.query.include_sub_heads === "true",

    });



    return successResponse(res, {

      message: "Budget heads fetched successfully",

      data,

    });

  } catch (err) {

    return handleServiceError(res, err);

  }

};



const getBudgetHeadById = async (req, res) => {

  try {

    const data = await budgetHeadService.getBudgetHeadById(req.params.id);



    return successResponse(res, {

      message: "Budget head fetched successfully",

      data,

    });

  } catch (err) {

    return handleServiceError(res, err);

  }

};



const createBudgetHead = async (req, res) => {

  try {

    const payload = normalizePayload(req.body);

    const data = await budgetHeadService.createBudgetHead({

      userId: getUserId(req),

      headName: payload.head_name,

      remarks: payload.remarks,

    });



    return successResponse(res, {

      message: "Budget head created successfully",

      data,

      status: 201,

    });

  } catch (err) {

    return handleServiceError(res, err);

  }

};



const updateBudgetHead = async (req, res) => {

  try {

    const payload = normalizePayload(req.body);

    const data = await budgetHeadService.updateBudgetHead({

      id: req.params.id,

      headName: payload.head_name,

      remarks: payload.remarks,

    });



    return successResponse(res, {

      message: "Budget head updated successfully",

      data,

    });

  } catch (err) {

    return handleServiceError(res, err);

  }

};



const updateBudgetHeadStatus = async (req, res) => {

  try {

    const data = await budgetHeadService.updateBudgetHeadStatus(

      req.params.id,

      req.body.is_active

    );



    return successResponse(res, {

      message: data.is_active

        ? "Budget head activated successfully"

        : "Budget head deactivated successfully",

      data,

    });

  } catch (err) {

    return handleServiceError(res, err);

  }

};



module.exports = {

  getBudgetHeads,

  getBudgetHeadById,

  createBudgetHead,

  updateBudgetHead,

  updateBudgetHeadStatus,

};

