const Joi = require("joi");

const examSchema = Joi.object({
  exam_name: Joi.string().trim().min(2).required(),
  class_id: Joi.number().integer().positive().required(),
  exam_type: Joi.string().trim().min(2).required(),
  academic_year: Joi.string()
    .valid("2025-26", "2026-27", "2027-28")
    .required(),
  start_date: Joi.date().required(),
  end_date: Joi.date().required(),
  total_marks: Joi.number().integer().min(1).required(),
});

module.exports = examSchema;