'use strict';

const Joi = require('joi');

const targetSchema = Joi.alternatives().try(
  Joi.object({
    bookId: Joi.number().integer().positive().required(),
    chapterId: Joi.forbidden(),
  }),
  Joi.object({
    chapterId: Joi.number().integer().positive().required(),
    bookId: Joi.forbidden(),
  }),
);

module.exports = {
  list: {
    query: Joi.object({
      bookId: Joi.number().integer().positive(),
      chapterId: Joi.number().integer().positive(),
      page: Joi.number().integer().min(1).default(1),
      pageSize: Joi.number().integer().min(1).max(100).default(50),
    }).or('bookId', 'chapterId'),
  },
  create: {
    body: Joi.object({
      bookId: Joi.number().integer().positive(),
      chapterId: Joi.number().integer().positive(),
      parentId: Joi.number().integer().positive().allow(null),
      body: Joi.string().trim().min(1).max(2000).required(),
    }).or('bookId', 'chapterId'),
  },
  update: {
    body: Joi.object({
      body: Joi.string().trim().min(1).max(2000).required(),
    }),
  },
};
