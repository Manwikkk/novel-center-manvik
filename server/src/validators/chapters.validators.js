'use strict';

const Joi = require('joi');

const title = Joi.string().trim().min(1).max(220);
const contentHtml = Joi.string().allow('', null).max(2_000_000); // ~2MB
const isPaid = Joi.boolean();
const tokenPrice = Joi.number().integer().min(0).max(100000);
const status = Joi.string().valid('draft', 'published');
const idx = Joi.number().integer().min(1).max(100000);
const authorThought = Joi.string().trim().allow('', null).max(5000);
const scheduledPublishAt = Joi.date().iso().allow(null);

module.exports = {
  create: {
    body: Joi.object({
      title: title.required(),
      contentHtml,
      authorThought,
      isPaid: isPaid.default(false),
      tokenPrice: tokenPrice.default(0),
      status: status.default('draft'),
      scheduledPublishAt,
      idx,
    }),
  },
  update: {
    body: Joi.object({
      title,
      contentHtml,
      authorThought,
      isPaid,
      tokenPrice,
      status,
      scheduledPublishAt,
      idx,
    }).min(1),
  },
};
