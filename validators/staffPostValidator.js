const Joi = require("joi");

const STAFF_CATEGORIES = [
  "Teaching",
  "Administrative",
  "Office",
  "Support",
  "Contractual",
];

const APPOINTMENT_NATURES = [
  "Permanent",
  "Temporary",
  "Contractual",
  "Part-time",
  "Outsourced",
  "Deputation",
];

const staffPostSchema = Joi.object({
  post_name: Joi.string().trim().min(1).required().messages({
    "string.empty": "Post name is required",
    "any.required": "Post name is required",
  }),
  post_code: Joi.string().trim().uppercase().min(1).required().messages({
    "string.empty": "Post code is required",
    "any.required": "Post code is required",
  }),
  staff_category: Joi.string()
    .valid(...STAFF_CATEGORIES)
    .required()
    .messages({
      "any.only": "Staff category must be one of the allowed values",
      "any.required": "Staff category is required",
    }),
  appointment_nature: Joi.string()
    .valid(...APPOINTMENT_NATURES)
    .required()
    .messages({
      "any.only": "Appointment nature must be one of the allowed values",
      "any.required": "Appointment nature is required",
    }),
  sanctioned_count: Joi.number().integer().min(0).required().messages({
    "number.base": "Sanctioned count must be a non-negative integer",
    "number.min": "Sanctioned count must be a non-negative integer",
    "any.required": "Sanctioned count is required",
  }),
}).required();

module.exports = {
  staffPostSchema,
};
