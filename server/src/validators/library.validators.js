'use strict';

const Joi = require('joi');

const csvIds = Joi.string()
  .trim()
  .pattern(/^\d+(,\d+){0,99}$/)
  .messages({ 'string.pattern.base': 'bookIds must be a comma-separated list of positive integers' });

const readingStatus = Joi.string().valid('active', 'on_hold', 'archive', 'dropped');

module.exports = {
  list: {
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      pageSize: Joi.number().integer().min(1).max(60).default(20),
      q: Joi.string().trim().max(120).allow(''),
      readingStatus: readingStatus.default('active'),
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
  statusMany: {
    query: Joi.object({
      bookIds: csvIds.required(),
    }),
  },
  setStatus: {
    params: Joi.object({
      bookId: Joi.number().integer().positive().required(),
    }),
    body: Joi.object({
      status: readingStatus.required(),
    }),
  },
};
