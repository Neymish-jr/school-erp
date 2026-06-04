const Joi = require("joi");

const administrativeChargeSchema = Joi.object({
  charge_name: Joi.string().trim().min(2).max(100).required().messages({
    "string.empty": "Charge name is required",
    "string.min": "Charge name must be at least 2 characters",
    "string.max": "Charge name must be at most 100 characters",
    "any.required": "Charge name is required",
  }),
  description: Joi.string().trim().max(500).allow("").optional().messages({
    "string.max": "Description must be at most 500 characters",
  }),
}).required();

const administrativeChargeStatusSchema = Joi.object({
  is_active: Joi.boolean().required().messages({
    "boolean.base": "Status must be active or inactive",
    "any.required": "Status is required",
  }),
}).required();

module.exports = {
  administrativeChargeSchema,
  administrativeChargeStatusSchema,
};
