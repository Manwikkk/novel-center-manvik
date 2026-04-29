'use strict';

const { errors } = require('../utils/HttpError');

// Validate body/query/params against a Joi schema map: { body, query, params }.
function validate(schemaMap) {
  return (req, _res, next) => {
    const opts = { abortEarly: false, stripUnknown: true, convert: true };
    try {
      if (schemaMap.body) {
        const { error, value } = schemaMap.body.validate(req.body, opts);
        if (error) return next(errors.unprocessable('Validation failed', error.details.map((d) => d.message)));
        req.body = value;
      }
      if (schemaMap.query) {
        const { error, value } = schemaMap.query.validate(req.query, opts);
        if (error) return next(errors.unprocessable('Validation failed', error.details.map((d) => d.message)));
        req.query = value;
      }
      if (schemaMap.params) {
        const { error, value } = schemaMap.params.validate(req.params, opts);
        if (error) return next(errors.unprocessable('Validation failed', error.details.map((d) => d.message)));
        req.params = value;
      }
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

module.exports = validate;
