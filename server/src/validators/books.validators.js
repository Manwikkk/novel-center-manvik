'use strict';

const Joi = require('joi');

const title = Joi.string().trim().min(1).max(220);
const synopsis = Joi.string().trim().max(5000).allow('', null);
const category = Joi.string().trim().max(80).allow('', null);
const language = Joi.string().trim().max(20);
const status = Joi.string().valid('draft', 'published', 'archived');

module.exports = {
  list: {
    query: Joi.object({
      q: Joi.string().trim().max(120).allow('', null),
      author: Joi.number().integer().positive(),
      category: Joi.string().trim().max(80),
      status: Joi.string().valid('draft', 'published', 'archived'),
      page: Joi.number().integer().min(1).default(1),
      pageSize: Joi.number().integer().min(1).max(50).default(12),
    }),
  },
  bySlug: {
    params: Joi.object({ slug: Joi.string().min(1).max(220).required() }),
  },
  create: {
    body: Joi.object({
      title: title.required(),
      synopsis,
      category,
      language: language.default('en'),
      coverUrl: Joi.string().uri().max(500).allow('', null),
      status: status.default('draft'),
    }),
  },
  update: {
    body: Joi.object({
      title,
      synopsis,
      category,
      language,
      coverUrl: Joi.string().uri().max(500).allow('', null),
      status,
    }).min(1),
  },
};
