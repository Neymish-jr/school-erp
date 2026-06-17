const Joi = require("joi");



const budgetHeadSchema = Joi.object({

  head_name: Joi.string().trim().min(2).max(150).required().messages({

    "string.empty": "Head name is required",

    "string.min": "Head name must be at least 2 characters",

    "string.max": "Head name must be at most 150 characters",

    "any.required": "Head name is required",

  }),

  remarks: Joi.string().trim().max(500).allow("", null).optional().messages({

    "string.max": "Remarks must be at most 500 characters",

  }),

}).required();



const budgetHeadStatusSchema = Joi.object({

  is_active: Joi.boolean().required().messages({

    "boolean.base": "Status must be active or inactive",

    "any.required": "Status is required",

  }),

}).required();



module.exports = {

  budgetHeadSchema,

  budgetHeadStatusSchema,

};

