'use strict';

class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    if (details !== undefined) this.details = details;
  }
}

const errors = {
  badRequest:   (m, d) => new HttpError(400, 'BAD_REQUEST',         m || 'Bad request', d),
  unauthorized: (m)    => new HttpError(401, 'UNAUTHORIZED',        m || 'Unauthorized'),
  forbidden:    (m)    => new HttpError(403, 'FORBIDDEN',           m || 'Forbidden'),
  accountSuspended: (m) => new HttpError(403, 'ACCOUNT_SUSPENDED', m || 'Account suspended'),
  notFound:     (m)    => new HttpError(404, 'NOT_FOUND',           m || 'Not found'),
  conflict:     (m)    => new HttpError(409, 'CONFLICT',            m || 'Conflict'),
  payment:      (m)    => new HttpError(402, 'INSUFFICIENT_TOKENS', m || 'Insufficient tokens'),
  unprocessable:(m, d) => new HttpError(422, 'UNPROCESSABLE',       m || 'Unprocessable entity', d),
  internal:     (m)    => new HttpError(500, 'INTERNAL',            m || 'Internal server error'),
};

module.exports = { HttpError, errors };
