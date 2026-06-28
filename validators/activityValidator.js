const Joi = require("joi");
const { ACTIVITY_STATUS_VALUES } = require("../constants/activityStatus");

const activitySchema = Joi.object({
  activity_name: Joi.string().trim().min(3).max(255).required(),
  description: Joi.string().trim().min(3).required(),
  allocated_budget: Joi.number().greater(0).required(),
  assigned_teacher_id: Joi.number().integer().positive().optional(),
  budget_allocation_id: Joi.number().integer().positive().allow(null).optional(),
});

const activityStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...ACTIVITY_STATUS_VALUES, "Pending", "Approved", "Rejected", "Completed")
    .required(),
});

const activityRejectSchema = Joi.object({
  rejection_remarks: Joi.string().trim().min(5).max(500).required(),
}).required();

const activityListQuerySchema = Joi.object({
  status: Joi.string().optional(),
  financial_year_id: Joi.number().integer().positive().optional(),
}).unknown(true);

module.exports = {
  activitySchema,
  activityStatusSchema,
  activityRejectSchema,
  activityListQuerySchema,
};
