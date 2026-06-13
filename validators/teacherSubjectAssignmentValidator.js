const Joi = require("joi");

const teacherSubjectAssignmentSchema = Joi.object({
  teacher_id: Joi.number().integer().positive().required().messages({
    "number.base": "Teacher ID must be a number",
    "number.integer": "Teacher ID must be an integer",
    "number.positive": "Teacher ID must be greater than 0",
    "any.required": "Teacher ID is required",
  }),
  class_section_id: Joi.number().integer().positive().required().messages({
    "number.base": "Class section ID must be a number",
    "number.integer": "Class section ID must be an integer",
    "number.positive": "Class section ID must be greater than 0",
    "any.required": "Class section ID is required",
  }),
  subject_id: Joi.number().integer().positive().required().messages({
    "number.base": "Subject ID must be a number",
    "number.integer": "Subject ID must be an integer",
    "number.positive": "Subject ID must be greater than 0",
    "any.required": "Subject ID is required",
  }),
  assignment_start_date: Joi.date().iso().required().messages({
    "date.base": "Assignment start date must be a valid date",
    "any.required": "Assignment start date is required",
  }),
}).required();

const relieveSubjectAssignmentSchema = Joi.object({
  assignment_end_date: Joi.date().iso().required().messages({
    "date.base": "Assignment end date must be a valid date",
    "any.required": "Assignment end date is required",
  }),
}).required();

module.exports = {
  teacherSubjectAssignmentSchema,
  relieveSubjectAssignmentSchema,
};
