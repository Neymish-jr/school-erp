const Joi = require("joi");

const createAssignmentSchema = Joi.object({
  teacher_id: Joi.number().integer().positive().required(),
  staff_post_id: Joi.number().integer().positive().required(),
  assignment_start_date: Joi.date().iso().required(), // YYYY-MM-DD format
  remarks: Joi.string().allow("", null).optional(),
});

const relieveAssignmentSchema = Joi.object({
    assignment_end_date: Joi.date().iso().required(),
});

module.exports = {
  createAssignmentSchema,
  relieveAssignmentSchema,
};