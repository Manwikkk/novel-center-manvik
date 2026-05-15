'use strict';

const Joi = require('joi');

module.exports = {
  listUsers: {
    query: Joi.object({
      q: Joi.string().trim().max(120),
      role: Joi.string().valid('admin', 'author', 'user'),
      status: Joi.string().valid('active', 'suspended'),
      page: Joi.number().integer().min(1).default(1),
      pageSize: Joi.number().integer().min(1).max(100).default(20),
    }),
  },
  updateUser: {
    body: Joi.object({
      role: Joi.string().valid('admin', 'author', 'user'),
      status: Joi.string().valid('active', 'suspended'),
      walletDelta: Joi.number().integer(),
    }).min(1),
  },
  listBooks: {
    query: Joi.object({
      q: Joi.string().trim().max(120),
      status: Joi.string().valid('draft', 'published', 'archived'),
      page: Joi.number().integer().min(1).default(1),
      pageSize: Joi.number().integer().min(1).max(100).default(20),
    }),
  },
  listTransactions: {
    query: Joi.object({
      type: Joi.string().valid('purchase', 'unlock', 'admin_adjust'),
      userId: Joi.number().integer().positive(),
      page: Joi.number().integer().min(1).default(1),
      pageSize: Joi.number().integer().min(1).max(100).default(20),
    }),
  },
  listComments: {
    query: Joi.object({
      status: Joi.string().valid('visible', 'hidden', 'deleted'),
      bookId: Joi.number().integer().positive(),
      chapterId: Joi.number().integer().positive(),
      chapterNull: Joi.boolean().truthy('1', 'true').falsy('0', 'false'),
      order: Joi.string().valid('asc', 'desc').default('asc'),
      page: Joi.number().integer().min(1).default(1),
      pageSize: Joi.number().integer().min(1).max(100).default(20),
    }),
  },
  commentsByBook: {
    query: Joi.object({
      q: Joi.string().trim().max(120),
      page: Joi.number().integer().min(1).default(1),
      pageSize: Joi.number().integer().min(1).max(60).default(12),
    }),
  },
  commentsByChapter: {
    query: Joi.object({
      bookId: Joi.number().integer().positive().required(),
      page: Joi.number().integer().min(1).default(1),
      pageSize: Joi.number().integer().min(1).max(100).default(50),
    }),
  },
  moderateComment: {
    body: Joi.object({
      status: Joi.string().valid('visible', 'hidden', 'deleted').required(),
    }),
  },
  patchPageSections: {
    body: Joi.object({
      weekly_book: Joi.boolean(),
      meet_webnovel: Joi.boolean(),
      recommended: Joi.boolean(),
      new_arrivals: Joi.boolean(),
      ranking_novels: Joi.boolean(),
      updated_today: Joi.boolean(),
      completed_novels: Joi.boolean(),
      editors_choice: Joi.boolean(),
      gs_originals: Joi.boolean(),
    }).min(1),
  },
};
