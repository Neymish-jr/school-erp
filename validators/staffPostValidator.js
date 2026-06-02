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
  post_name: Joi.string().trim().min(2).max(100).required().messages({
    "string.empty": "Post name is required",
    "string.min": "Post name must be at least 2 characters",
    "string.max": "Post name must be at most 100 characters",
    "any.required": "Post name is required",
  }),
  staff_category: Joi.string()
    .valid(...STAFF_CATEGORIES)
    .required()
    .messages({
      "any.only": "Select a valid staff category",
      "any.required": "Staff category is required",
    }),
  appointment_nature: Joi.string()
    .valid(...APPOINTMENT_NATURES)
    .required()
    .messages({
      "any.only": "Select a valid appointment nature",
      "any.required": "Appointment nature is required",
    }),
  is_teaching_post: Joi.boolean().required().messages({
    "boolean.base": "Teaching post must be true or false",
    "any.required": "Teaching post is required",
  }),
  sanctioned_count: Joi.number().integer().min(0).required().messages({
    "number.base": "Sanctioned count must be a number",
    "number.integer": "Sanctioned count must be a whole number",
    "number.min": "Sanctioned count cannot be negative",
    "any.required": "Sanctioned count is required",
  }),
});

module.exports = {
  staffPostSchema,
  STAFF_CATEGORIES,
  APPOINTMENT_NATURES,
};
