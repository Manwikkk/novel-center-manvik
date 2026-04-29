'use strict';

const Joi = require('joi');

module.exports = {
  list: {
    query: Joi.object({
      q: Joi.string().trim().max(120),
      page: Joi.number().integer().min(1).default(1),
      pageSize: Joi.number().integer().min(1).max(60).default(12),
    }),
  },
  getById: {
    params: Joi.object({
      id: Joi.number().integer().positive().required(),
    }),
    query: Joi.object({
      booksPage: Joi.number().integer().min(1).default(1),
      booksPageSize: Joi.number().integer().min(1).max(60).default(12),
    }),
  },
};
