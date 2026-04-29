'use strict';

const { verifyAccessToken } = require('../utils/jwt');
const { errors } = require('../utils/HttpError');

function readBearer(req) {
  const h = req.headers.authorization || req.headers.Authorization;
  if (!h || typeof h !== 'string') return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

// Required: rejects without a valid token.
function authRequired(req, _res, next) {
  const token = readBearer(req);
  if (!token) return next(errors.unauthorized('Missing access token'));
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: Number(payload.sub), role: payload.role, email: payload.email };
    return next();
  } catch (e) {
    return next(errors.unauthorized('Invalid or expired token'));
  }
}

// Optional: attaches user if token is valid; otherwise continues anonymously.
function authOptional(req, _res, next) {
  const token = readBearer(req);
  if (!token) return next();
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: Number(payload.sub), role: payload.role, email: payload.email };
  } catch (_e) {
    /* ignore - leave unauthenticated */
  }
  return next();
}

module.exports = { authRequired, authOptional };
