'use strict';

const Joi = require('joi');

module.exports = {
  bookStats: {
    params: Joi.object({
      bookId: Joi.number().integer().positive().required(),
    }),
  },
};
