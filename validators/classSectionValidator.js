const Joi = require("joi");

const classSectionSchema = Joi.object({
  class_name: Joi.string()
    .trim()
    .min(1)
    .max(40)
    .pattern(/^[A-Za-z0-9][A-Za-z0-9\s-]*$/)
    .required()
    .messages({
      "string.empty": "Class name is required.",
      "string.pattern.base": "Class name can include letters, numbers, spaces, or hyphens.",
      "string.max": "Class name must be 40 characters or less.",
    }),
  section_name: Joi.string()
    .trim()
    .min(1)
    .max(10)
    .pattern(/^[A-Za-z0-9]+$/)
    .required()
    .messages({
      "string.empty": "Section name is required.",
      "string.pattern.base": "Section name can include letters or numbers only.",
      "string.max": "Section name must be 10 characters or less.",
    }),
});

module.exports = classSectionSchema;
