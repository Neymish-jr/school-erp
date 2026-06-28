const Joi = require("joi");
const { EXPENSE_REQUEST_STATUS_VALUES } = require("../constants/expenseRequestStatus");

const expenseRequestSchema = Joi.object({
  budget_allocation_id: Joi.number().integer().positive().required().messages({
    "any.required": "Budget allocation is required",
    "number.base": "Budget allocation is required",
  }),
  requested_amount: Joi.number().precision(2).positive().required().messages({
    "any.required": "Requested amount is required",
    "number.positive": "Requested amount must be greater than zero",
  }),
  purpose: Joi.string().trim().min(3).max(255).required().messages({
    "string.empty": "Purpose is required",
    "string.min": "Purpose must be at least 3 characters",
    "string.max": "Purpose must be at most 255 characters",
    "any.required": "Purpose is required",
  }),
  vendor_name: Joi.string().trim().max(150).allow("", null).optional(),
  remarks: Joi.string().trim().max(500).allow("", null).optional(),
  activity_id: Joi.number().integer().positive().allow(null).optional(),
  item_name: Joi.string().trim().max(255).allow("", null).optional(),
  quantity: Joi.number().precision(2).positive().allow(null).optional(),
})
  .custom((value, helpers) => {
    const quantity = value.quantity;
    const itemName = String(value.item_name ?? "").trim();

    if (quantity != null && !itemName) {
      return helpers.message("item_name is required when quantity is provided");
    }

    return value;
  })
  .required();

const expenseRequestRejectSchema = Joi.object({
  rejection_remarks: Joi.string().trim().min(5).max(500).required().messages({
    "string.empty": "Rejection remarks are required",
    "string.min": "Rejection remarks must be at least 5 characters",
    "any.required": "Rejection remarks are required",
  }),
}).required();

const expenseRequestMarkPaidSchema = Joi.object({
  payment_voucher_no: Joi.string().trim().min(1).max(50).required().messages({
    "any.required": "Payment voucher number is required",
  }),
  payment_transaction_id: Joi.string().trim().min(1).max(100).required().messages({
    "any.required": "Payment transaction ID is required",
  }),
  paid_at: Joi.date().iso().optional(),
  create_stock_entry: Joi.boolean().optional(),
  stock_category: Joi.string()
    .valid(...require("../constants/stockCategories").STOCK_CATEGORIES)
    .when("create_stock_entry", {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
  stock_unit: Joi.string().trim().min(1).max(50).when("create_stock_entry", {
    is: true,
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  purchase_rate: Joi.number().precision(2).positive().optional(),
}).required();

const expenseRequestListQuerySchema = Joi.object({
  status: Joi.string()
    .valid(...EXPENSE_REQUEST_STATUS_VALUES)
    .optional(),
  budget_allocation_id: Joi.number().integer().positive().optional(),
  financial_year_id: Joi.number().integer().positive().optional(),
  submitted_by_user_id: Joi.number().integer().positive().optional(),
  activity_id: Joi.number().integer().positive().optional(),
}).unknown(true);

module.exports = {
  expenseRequestSchema,
  expenseRequestRejectSchema,
  expenseRequestMarkPaidSchema,
  expenseRequestListQuerySchema,
};
