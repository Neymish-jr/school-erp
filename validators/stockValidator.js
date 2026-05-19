const Joi = require("joi");

const stockSchema = Joi.object({
  item_name: Joi.string().required(),
  quantity: Joi.number().required(),
  supplier: Joi.string().required()
});

module.exports = stockSchema;