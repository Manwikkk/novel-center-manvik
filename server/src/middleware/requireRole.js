'use strict';

const { errors } = require('../utils/HttpError');

// Compose AFTER authRequired. Usage: requireRole('admin') or requireRole('author','admin').
function requireRole(...roles) {
  const allowed = new Set(roles);
  return (req, _res, next) => {
    if (!req.user) return next(errors.unauthorized());
    if (!allowed.has(req.user.role)) return next(errors.forbidden('Insufficient role'));
    return next();
  };
}

module.exports = requireRole;
