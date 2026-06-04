const Joi = require("joi");

const studentResultsSchema = Joi.object({
  student_id: Joi.number().integer().positive().required(),
  subject_id: Joi.number().integer().positive().required(),
  exam_name: Joi.string().trim().min(2).max(100).required(),
  marks_obtained: Joi.number().integer().min(0).required(),
  max_marks: Joi.number().integer().positive().required(),
});

module.exports = studentResultsSchema;
