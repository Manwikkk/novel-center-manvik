'use strict';

const Joi = require('joi');

const csvIds = Joi.string()
  .trim()
  .pattern(/^\d+(,\d+){0,99}$/)
  .messages({ 'string.pattern.base': 'bookIds must be a comma-separated list of positive integers' });

module.exports = {
  list: {
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      pageSize: Joi.number().integer().min(1).max(60).default(20),
    }),
  },
  add: {
    body: Joi.object({
      bookId: Joi.number().integer().positive().required(),
    }),
  },
  remove: {
    params: Joi.object({
      bookId: Joi.number().integer().positive().required(),
    }),
  },
  contains: {
    query: Joi.object({
      bookIds: csvIds.required(),
    }),
  },
};
