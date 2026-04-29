'use strict';

const Joi = require('joi');

const title = Joi.string().trim().min(1).max(220);
const contentHtml = Joi.string().allow('', null).max(2_000_000); // ~2MB
const isPaid = Joi.boolean();
const tokenPrice = Joi.number().integer().min(0).max(100000);
const status = Joi.string().valid('draft', 'published');
const idx = Joi.number().integer().min(1).max(100000);

module.exports = {
  create: {
    body: Joi.object({
      title: title.required(),
      contentHtml,
      isPaid: isPaid.default(false),
      tokenPrice: tokenPrice.default(0),
      status: status.default('draft'),
      idx,
    }),
  },
  update: {
    body: Joi.object({
      title,
      contentHtml,
      isPaid,
      tokenPrice,
      status,
      idx,
    }).min(1),
  },
};
