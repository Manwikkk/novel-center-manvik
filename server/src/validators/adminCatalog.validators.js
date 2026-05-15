'use strict';

const Joi = require('joi');

const label = Joi.string().trim().min(1).max(120);
const slug = Joi.string().trim().max(64).allow('', null);
const sortOrder = Joi.number().integer();
const isActive = Joi.boolean();

module.exports = {
  createCategory: {
    body: Joi.object({
      label: label.required(),
      slug,
      sortOrder,
      isActive,
    }),
  },
  updateCategory: {
    body: Joi.object({
      label,
      slug,
      sortOrder,
      isActive,
    }).min(1),
  },
  createLanguage: {
    body: Joi.object({
      code: Joi.string().trim().min(1).max(20).required(),
      label: Joi.string().trim().min(1).max(80).required(),
      sortOrder,
      isActive,
    }),
  },
  updateLanguage: {
    body: Joi.object({
      code: Joi.string().trim().min(1).max(20),
      label: Joi.string().trim().min(1).max(80),
      sortOrder,
      isActive,
    }).min(1),
  },
  createContentTag: {
    body: Joi.object({
      label: label.required(),
      slug,
      sortOrder,
      isActive,
    }),
  },
  updateContentTag: {
    body: Joi.object({
      label,
      slug,
      sortOrder,
      isActive,
    }).min(1),
  },
};
