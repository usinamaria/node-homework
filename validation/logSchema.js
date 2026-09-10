const Joi = require("joi");

const logSchema = Joi.object({
  status: Joi.string().trim().min(1).max(255).required(),
});

module.exports = { logSchema };
