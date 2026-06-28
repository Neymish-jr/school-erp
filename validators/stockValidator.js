const Joi = require("joi");
const { STOCK_CATEGORIES, STOCK_ISSUE_TYPES } = require("../constants/stockCategories");

const stockEntryCreateSchema = Joi.object({
  item_name: Joi.string().trim().min(2).max(255).required(),
  category: Joi.string()
    .valid(...STOCK_CATEGORIES)
    .required(),
  quantity: Joi.number().precision(2).positive().required(),
  unit: Joi.string().trim().min(1).max(50).required(),
  purchase_rate: Joi.number().precision(2).positive().required(),
  vendor_name: Joi.string().trim().max(150).allow("", null).optional(),
  purchase_date: Joi.date().iso().required(),
}).required();

const stockIssueCreateSchema = Joi.object({
  stock_entry_id: Joi.number().integer().positive().required(),
  issued_quantity: Joi.number().precision(2).positive().required(),
  issue_type: Joi.string()
    .valid(...STOCK_ISSUE_TYPES)
    .required(),
  issued_to_teacher_id: Joi.number().integer().positive().allow(null).optional(),
  issued_to_activity_id: Joi.number().integer().positive().allow(null).optional(),
  issued_to_department: Joi.string().trim().max(150).allow("", null).optional(),
  issue_date: Joi.date().iso().required(),
  remarks: Joi.string().trim().max(500).allow("", null).optional(),
})
  .custom((value, helpers) => {
    if (value.issue_type === "teacher" && !value.issued_to_teacher_id) {
      return helpers.message("issued_to_teacher_id is required for teacher issue");
    }

    if (value.issue_type === "activity" && !value.issued_to_activity_id) {
      return helpers.message("issued_to_activity_id is required for activity issue");
    }

    if (
      value.issue_type === "department" &&
      !String(value.issued_to_department || "").trim()
    ) {
      return helpers.message("issued_to_department is required for department issue");
    }

    return value;
  })
  .required();

const stockEntryListQuerySchema = Joi.object({
  category: Joi.string()
    .valid(...STOCK_CATEGORIES)
    .optional(),
  item_name: Joi.string().trim().max(255).optional(),
  low_stock: Joi.string().valid("true", "false").optional(),
}).unknown(true);

module.exports = {
  stockEntryCreateSchema,
  stockIssueCreateSchema,
  stockEntryListQuerySchema,
};
