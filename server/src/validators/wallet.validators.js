'use strict';

const Joi = require('joi');

module.exports = {
  list: {
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      pageSize: Joi.number().integer().min(1).max(100).default(20),
      type: Joi.string().valid('purchase', 'unlock', 'admin_adjust'),
    }),
  },
  purchase: {
    body: Joi.object({
      pack: Joi.string().valid('small', 'medium', 'large').default('small'),
      tokens: Joi.number().integer().min(1).max(100000),
    }),
  },
};
