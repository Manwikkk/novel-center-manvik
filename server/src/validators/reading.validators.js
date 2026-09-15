'use strict';

const Joi = require('joi');

module.exports = {
  saveProgress: {
    body: Joi.object({
      chapterId: Joi.number().integer().positive().required(),
      percent:   Joi.number().min(0).max(100).required(),
      position:  Joi.number().integer().min(0).default(0),
    }),
  },
  bookProgress: {
    params: Joi.object({
      bookId: Joi.number().integer().positive().required(),
    }),
  },
  recent: {
    query: Joi.object({
      limit:    Joi.number().integer().min(1).max(24),
      page:     Joi.number().integer().min(1).default(1),
      pageSize: Joi.number().integer().min(1).max(24).default(4),
    }),
  },
};
