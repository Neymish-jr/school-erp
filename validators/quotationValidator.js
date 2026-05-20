const Joi = require("joi");

const quotationSchema = Joi.object({
  expense_id: Joi.number().required(),
  vendor_name: Joi.string().required(),
  quotation_amount: Joi.number().greater(0).required()
});

module.exports = quotationSchema;
