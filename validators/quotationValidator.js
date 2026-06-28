const Joi = require("joi");

const quotationCreateSchema = Joi.object({
  expense_request_id: Joi.number().integer().positive().optional(),
  expense_id: Joi.number().integer().positive().optional(),
  vendor_name: Joi.string().trim().min(2).max(150).required(),
  vendor_contact: Joi.string().trim().max(100).allow("", null).optional(),
  quotation_amount: Joi.number().precision(2).positive().required(),
  quotation_date: Joi.date().iso().optional(),
  remarks: Joi.string().trim().max(500).allow("", null).optional(),
})
  .custom((value, helpers) => {
    if (!value.expense_request_id && !value.expense_id) {
      return helpers.message("expense_request_id is required");
    }

    return value;
  })
  .required();

const quotationListQuerySchema = Joi.object({
  expense_request_id: Joi.number().integer().positive().optional(),
}).unknown(true);

module.exports = {
  quotationCreateSchema,
  quotationListQuerySchema,
};
