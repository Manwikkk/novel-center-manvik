'use strict';

const Joi = require('joi');

const idParam = Joi.object({
  id: Joi.number().integer().positive().required(),
});

const bookIdParam = Joi.object({
  id: Joi.number().integer().positive().required(),
  bookId: Joi.number().integer().positive().required(),
});

const collectionParam = Joi.object({
  id: Joi.number().integer().positive().required(),
  collectionId: Joi.number().integer().positive().required(),
});

const pagination = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(60).default(20),
  }),
};

const socialLinks = Joi.object({
  website: Joi.string().trim().uri({ scheme: ['http', 'https'] }).max(300).allow('', null),
  twitter: Joi.string().trim().max(300).allow('', null),
  discord: Joi.string().trim().max(300).allow('', null),
  instagram: Joi.string().trim().max(300).allow('', null),
  facebook: Joi.string().trim().max(300).allow('', null),
  youtube: Joi.string().trim().max(300).allow('', null),
}).unknown(false);

module.exports = {
  idParam: { params: idParam },
  bookIdParam: { params: bookIdParam },
  collectionParam: { params: collectionParam },
  pagination,
  novelsQuery: {
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      pageSize: Joi.number().integer().min(1).max(48).default(12),
      status: Joi.string().valid('all', 'ongoing', 'completed', 'hiatus').default('all'),
    }),
  },
  updateProfile: {
    body: Joi.object({
      displayName: Joi.string().trim().min(2).max(80),
      bio: Joi.string().trim().max(2000).allow('', null),
      country: Joi.string().trim().max(80).allow('', null),
      birthDate: Joi.alternatives().try(
        Joi.date().iso(),
        Joi.string().isoDate(),
        Joi.valid(null, ''),
      ),
      showReviews: Joi.boolean(),
      showComments: Joi.boolean(),
      notifyEmail: Joi.boolean(),
      notifyPush: Joi.boolean(),
      experience: Joi.string().valid('reader', 'creator', 'both'),
      socialLinks,
    }).min(1),
  },
  novelVisibility: {
    params: Joi.object({
      bookId: Joi.number().integer().positive().required(),
    }),
    body: Joi.object({
      showOnProfile: Joi.boolean().required(),
    }),
  },
  changePassword: {
    body: Joi.object({
      currentPassword: Joi.string().required(),
      newPassword: Joi.string().min(8).max(128).required(),
    }),
  },
  updateEmail: {
    body: Joi.object({
      email: Joi.string().email().max(190).required(),
      password: Joi.string().allow('', null),
    }),
  },
  deleteAccount: {
    body: Joi.object({
      password: Joi.string().allow('', null),
      confirm: Joi.string().valid('DELETE').required(),
    }),
  },
};
