const Joi = require("joi");

const activitySchema = Joi.object({
  activity_name: Joi.string().required(),
  description: Joi.string().required(),
  allocated_budget: Joi.number().greater(0).required(),
  assigned_teacher_id: Joi.number().required(),
  school_id: Joi.number().required()
});

const activityStatusSchema = Joi.object({
  status: Joi.string()
    .valid("Pending", "Approved", "Rejected", "Completed")
    .required()
});

module.exports = {
  activitySchema,
  activityStatusSchema
};
