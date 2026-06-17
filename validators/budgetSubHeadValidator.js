const Joi = require("joi");



const budgetSubHeadSchema = Joi.object({

  budget_head_id: Joi.number().integer().positive().required().messages({

    "any.required": "Budget head is required",

    "number.base": "Budget head is required",

  }),

  sub_head_name: Joi.string().trim().min(2).max(150).required().messages({

    "string.empty": "Sub head name is required",

    "string.min": "Sub head name must be at least 2 characters",

    "string.max": "Sub head name must be at most 150 characters",

    "any.required": "Sub head name is required",

  }),

  remarks: Joi.string().trim().max(500).allow("", null).optional().messages({

    "string.max": "Remarks must be at most 500 characters",

  }),

}).required();



const budgetSubHeadStatusSchema = Joi.object({

  is_active: Joi.boolean().required().messages({

    "boolean.base": "Status must be active or inactive",

    "any.required": "Status is required",

  }),

}).required();



module.exports = {

  budgetSubHeadSchema,

  budgetSubHeadStatusSchema,

};

