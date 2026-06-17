const Joi = require("joi");



const budgetAllocationSchema = Joi.object({

  financial_year_id: Joi.number().integer().positive().required().messages({

    "any.required": "Financial year is required",

    "number.base": "Financial year is required",

  }),

  budget_sub_head_id: Joi.number().integer().positive().required().messages({

    "any.required": "Budget sub head is required",

    "number.base": "Budget sub head is required",

  }),

  allocated_amount: Joi.number().precision(2).positive().required().messages({

    "any.required": "Allocated amount is required",

    "number.positive": "Allocated amount must be greater than zero",

  }),

  responsible_teacher_id: Joi.number().integer().positive().allow(null).optional(),

  remarks: Joi.string().trim().max(500).allow("", null).optional().messages({

    "string.max": "Remarks must be at most 500 characters",

  }),

}).required();



const budgetAllocationUpdateSchema = Joi.object({

  allocated_amount: Joi.number().precision(2).positive().required().messages({

    "any.required": "Allocated amount is required",

    "number.positive": "Allocated amount must be greater than zero",

  }),

  responsible_teacher_id: Joi.number().integer().positive().allow(null).optional(),

  remarks: Joi.string().trim().max(500).allow("", null).optional().messages({

    "string.max": "Remarks must be at most 500 characters",

  }),

}).required();



const budgetAllocationStatusSchema = Joi.object({

  is_active: Joi.boolean().required().messages({

    "boolean.base": "Status must be active or inactive",

    "any.required": "Status is required",

  }),

}).required();



module.exports = {

  budgetAllocationSchema,

  budgetAllocationUpdateSchema,

  budgetAllocationStatusSchema,

};

