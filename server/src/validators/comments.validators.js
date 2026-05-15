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
      pageSize: Joi.number().integer().min(1).max(50).default(5),
      sort: Joi.string().valid('oldest', 'newest', 'likes', 'dislikes').default('oldest'),
    }).or('bookId', 'chapterId'),
  },
  create: {
    body: Joi.object({
      bookId: Joi.number().integer().positive(),
      chapterId: Joi.number().integer().positive(),
      parentId: Joi.number().integer().positive().allow(null),
      body: Joi.string().trim().min(1).max(2000).required(),
      isSpoiler: Joi.boolean().default(false),
    }).or('bookId', 'chapterId'),
  },
  reaction: {
    body: Joi.object({
      reaction: Joi.string().valid('like', 'dislike').allow(null).default(null),
    }),
  },
  update: {
    body: Joi.object({
      body: Joi.string().trim().min(1).max(2000).required(),
    }),
  },
};
