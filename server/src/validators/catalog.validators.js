'use strict';

const Joi = require('joi');

module.exports = {
  createContentTag: {
    body: Joi.object({
      label: Joi.string().trim().min(2).max(120).required(),
    }),
  },
};
