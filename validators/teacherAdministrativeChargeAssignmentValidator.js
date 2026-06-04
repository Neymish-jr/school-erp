const Joi = require("joi");

const createAssignmentSchema = Joi.object({
  teacher_id: Joi.number().integer().positive().required(),
  administrative_charge_id: Joi.number().integer().positive().required(),
  academic_year: Joi.string().max(20).required(),
  remarks: Joi.string().allow("", null).optional(),
  is_additional_charge: Joi.boolean().optional()
});

const updateAssignmentSchema = Joi.object({
  academic_year: Joi.string().max(20).optional(),
  remarks: Joi.string().allow("", null).optional(),
  is_additional_charge: Joi.boolean().optional()
});

module.exports = {
  createAssignmentSchema,
  updateAssignmentSchema
};
