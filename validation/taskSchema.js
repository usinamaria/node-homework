const Joi = require("joi");

const taskSchema = Joi.object({
  title: Joi.string().trim().min(3).max(30).required(),
  isCompleted: Joi.boolean().default(false).not(null),
});

const patchTaskSchema = Joi.object({
  title: Joi.string().trim().min(3).max(30).optional(),
  isCompleted: Joi.boolean().optional(),
})
  .min(1)
  .messages({
    "object.min": "No attributes to change were specified.",
  });

module.exports = { taskSchema, patchTaskSchema };
