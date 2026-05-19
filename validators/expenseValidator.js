const Joi = require("joi");

const expenseSchema = Joi.object({
  title: Joi.string().required(),
  amount: Joi.number().required(),
  category: Joi.string().required(),
  date: Joi.date().required()
});

module.exports = expenseSchema;