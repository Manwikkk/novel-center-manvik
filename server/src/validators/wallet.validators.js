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
      pack: Joi.string().valid(
        'pack_99', 'pack_249', 'pack_499', 'pack_999', 'pack_1999', 'pack_2999',
        'small', 'medium', 'large',
      ).default('pack_99'),
      tokens: Joi.number().integer().min(1).max(100000),
      couponCode: Joi.string().trim().max(64).allow('', null),
    }),
  },
};
