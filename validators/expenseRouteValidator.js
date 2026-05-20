const Joi = require("joi");

const expenseEntrySchema = Joi.object({
  activity_id: Joi.number().required(),
  item_name: Joi.string().required(),
  quantity: Joi.number().greater(0).required(),
  amount: Joi.number().greater(0).required(),
  vendor_name: Joi.string().required()
});

const expensePaymentVerificationSchema = Joi.object({
  payment_date: Joi.date().required(),
  voucher_no: Joi.string().required(),
  transaction_id: Joi.string().required()
});

module.exports = {
  expenseEntrySchema,
  expensePaymentVerificationSchema
};
