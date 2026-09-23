'use strict';

const Joi = require('joi');
const { EVENT_REWARD_TYPES } = require('../constants/taskCatalog');

const idParam = Joi.object({ id: Joi.number().integer().positive().required() });

const activity = Joi.object({
  code: Joi.string().trim().max(64),
  conditionKey: Joi.string().trim().max(64).required(),
  title: Joi.string().trim().min(1).max(160).required(),
  description: Joi.string().trim().max(300).allow(''),
  params: Joi.object().unknown(true),
  sortOrder: Joi.number().integer().min(0).max(100000),
});

const reward = Joi.object({
  code: Joi.string().trim().max(64),
  title: Joi.string().trim().min(1).max(160).required(),
  description: Joi.string().trim().max(300).allow(''),
  rewardType: Joi.string().valid(...EVENT_REWARD_TYPES).required(),
  payload: Joi.object().unknown(true).required(),
  requires: Joi.object({
    type: Joi.string().valid('all_activities', 'activity').required(),
    code: Joi.string().trim().max(64),
  }),
  sortOrder: Joi.number().integer().min(0).max(100000),
});

const eventFields = {
  slug: Joi.string().trim().max(80),
  name: Joi.string().trim().min(1).max(160),
  summary: Joi.string().trim().max(300).allow(''),
  description: Joi.string().trim().max(5000).allow(''),
  startsAt: Joi.date().iso(),
  endsAt: Joi.date().iso(),
  enabled: Joi.boolean(),
  promoted: Joi.boolean(),
  activities: Joi.array().items(activity).min(1).max(12),
  rewards: Joi.array().items(reward).min(1).max(12),
};

module.exports = {
  idParam,
  rewardParam: Joi.object({
    id: Joi.number().integer().positive().required(),
    rewardId: Joi.number().integer().positive().required(),
  }),
  create: {
    body: Joi.object({
      ...eventFields,
      name: eventFields.name.required(),
      startsAt: eventFields.startsAt.required(),
      endsAt: eventFields.endsAt.required(),
      activities: eventFields.activities.required(),
      rewards: eventFields.rewards.required(),
    }),
  },
  update: {
    params: idParam,
    body: Joi.object(eventFields).min(1),
  },
};
