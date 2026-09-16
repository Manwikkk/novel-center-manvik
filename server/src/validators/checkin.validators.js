'use strict';

const Joi = require('joi');
const { REWARD_TYPES, DISPLAY_CYCLE_DAYS } = require('../constants/checkin');

const idParam = Joi.object({ id: Joi.number().integer().positive().required() });

const optionSchema = Joi.object({
  key: Joi.string().trim().pattern(/^[a-z0-9_]{1,40}$/).required(),
  type: Joi.string().valid(...REWARD_TYPES).required(),
  enabled: Joi.boolean().default(true),
  label: Joi.string().trim().max(80).allow('', null),
  amount: Joi.number().integer().min(0).max(100000),
  percent: Joi.number().integer().min(1).max(100),
  maxDiscountCoins: Joi.number().integer().min(1).max(100000),
  validDays: Joi.number().integer().min(1).max(365),
  bundleSize: Joi.number().integer().min(2).max(20),
  hours: Joi.number().integer().min(1).max(24 * 30),
});

const milestoneSchema = Joi.object({
  title: Joi.string().trim().max(120),
  options: Joi.array().items(optionSchema).min(1).max(8),
});

module.exports = {
  idParam,
  claimMilestone: {
    params: Joi.object({ checkinId: Joi.number().integer().positive().required() }),
    body: Joi.object({
      option: Joi.string().trim().pattern(/^[a-z0-9_]{1,40}$/).required(),
    }),
  },
  history: {
    query: Joi.object({
      month: Joi.string().pattern(/^\d{4}-\d{2}$/),
    }),
  },
  activateReward: {
    params: idParam,
    body: Joi.object({
      bookId: Joi.number().integer().positive(),
    }),
  },
  adminConfig: {
    body: Joi.object({
      enabled: Joi.boolean(),
      timezone: Joi.string().trim().max(64),
      dailyExp: Joi.array().items(Joi.number().integer().min(0).max(10000)).length(DISPLAY_CYCLE_DAYS),
      milestones: Joi.object({
        day7: milestoneSchema,
        day14: milestoneSchema,
      }),
      luckyPass: Joi.object({
        enabled: Joi.boolean(),
        hours: Joi.number().integer().min(1).max(24 * 30),
        dropProbabilityPercent: Joi.number().min(0).max(100),
        upgradeProbabilityPercent: Joi.number().min(0).max(100),
        minStreak: Joi.number().integer().min(1).max(100000),
      }),
      passRules: Joi.object({
        excludeOriginals: Joi.boolean(),
        excludedBookIds: Joi.array().items(Joi.number().integer().positive()).max(500),
      }),
    }).min(1),
  },
  adminCampaign: {
    body: Joi.object({
      name: Joi.string().trim().min(1).max(160).required(),
      description: Joi.string().trim().max(300).allow('', null),
      startsAt: Joi.date().iso().required(),
      endsAt: Joi.date().iso().required(),
      enabled: Joi.boolean().default(true),
      expMultiplier: Joi.number().min(0.1).max(10).default(1),
      bonusCoins: Joi.number().integer().min(0).max(100000).default(0),
      novelPassHours: Joi.number().integer().min(1).max(24 * 30).allow(null),
    }),
  },
  adminCampaignPatch: {
    params: idParam,
    body: Joi.object({
      name: Joi.string().trim().min(1).max(160),
      description: Joi.string().trim().max(300).allow('', null),
      startsAt: Joi.date().iso(),
      endsAt: Joi.date().iso(),
      enabled: Joi.boolean(),
      expMultiplier: Joi.number().min(0.1).max(10),
      bonusCoins: Joi.number().integer().min(0).max(100000),
      novelPassHours: Joi.number().integer().min(1).max(24 * 30).allow(null),
    }).min(1),
  },
};
