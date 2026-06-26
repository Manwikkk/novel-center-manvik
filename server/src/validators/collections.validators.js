'use strict';

const Joi = require('joi');

const csvIds = Joi.string()
  .trim()
  .pattern(/^\d+(,\d+){0,99}$/)
  .messages({ 'string.pattern.base': 'bookIds must be a comma-separated list of positive integers' });

const visibility = Joi.string().valid('public', 'private');

module.exports = {
  list: {
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      pageSize: Joi.number().integer().min(1).max(60).default(20),
    }),
  },
  create: {
    body: Joi.object({
      name: Joi.string().trim().min(1).max(120).required(),
      visibility: visibility.default('private'),
    }),
  },
  update: {
    params: Joi.object({
      id: Joi.number().integer().positive().required(),
    }),
    body: Joi.object({
      name: Joi.string().trim().min(1).max(120),
      visibility,
    }).min(1),
  },
  remove: {
    params: Joi.object({
      id: Joi.number().integer().positive().required(),
    }),
  },
  listBooks: {
    params: Joi.object({
      id: Joi.number().integer().positive().required(),
    }),
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      pageSize: Joi.number().integer().min(1).max(60).default(20),
      q: Joi.string().trim().max(120).allow(''),
    }),
  },
  addBook: {
    params: Joi.object({
      id: Joi.number().integer().positive().required(),
    }),
    body: Joi.object({
      bookId: Joi.number().integer().positive().required(),
    }),
  },
  removeBook: {
    params: Joi.object({
      id: Joi.number().integer().positive().required(),
      bookId: Joi.number().integer().positive().required(),
    }),
  },
  contains: {
    query: Joi.object({
      bookIds: csvIds.required(),
    }),
  },
};
