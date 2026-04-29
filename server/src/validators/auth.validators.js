'use strict';

const Joi = require('joi');

const password = Joi.string().min(8).max(128).required();
const email = Joi.string().email().max(190).required();
const displayName = Joi.string().trim().min(2).max(80).required();
const role = Joi.string().valid('user', 'author').default('user');

module.exports = {
  register: {
    body: Joi.object({
      email,
      password,
      displayName,
      role,
    }),
  },
  login: {
    body: Joi.object({
      email,
      password: Joi.string().required(),
    }),
  },
  refresh: {
    body: Joi.object({
      refreshToken: Joi.string().required(),
    }),
  },
  updateMe: {
    body: Joi.object({
      displayName: Joi.string().trim().min(2).max(80),
      bio: Joi.string().trim().max(2000).allow('', null),
      avatarUrl: Joi.string().trim().uri({ scheme: ['http', 'https'] }).max(500).allow('', null),
    }).min(1),
  },
};
