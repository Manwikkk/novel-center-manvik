'use strict';

const Joi = require('joi');
const { FREQUENCIES } = require('../constants/taskCatalog');

const idParam = Joi.object({ id: Joi.number().integer().positive().required() });

const taskBody = {
  code: Joi.string().trim().max(80),
  title: Joi.string().trim().min(1).max(160),
  description: Joi.string().trim().max(400).allow(''),
  frequency: Joi.string().valid(...FREQUENCIES),
  conditionKey: Joi.string().trim().max(64),
  params: Joi.object().unknown(true),
  expReward: Joi.number().integer().min(0).max(100000),
  enabled: Joi.boolean(),
  sortOrder: Joi.number().integer().min(0).max(100000),
  startsAt: Joi.date().iso().allow(null),
  endsAt: Joi.date().iso().allow(null),
  coins: Joi.any().forbidden(),
  coinAmount: Joi.any().forbidden(),
  rewardType: Joi.any().forbidden(),
};

module.exports = {
  idParam,
  create: {
    body: Joi.object({
      ...taskBody,
      title: taskBody.title.required(),
      frequency: taskBody.frequency.required(),
      conditionKey: taskBody.conditionKey.required(),
      expReward: taskBody.expReward.required(),
    }),
  },
  update: {
    params: idParam,
    body: Joi.object(taskBody).min(1),
  },
};
