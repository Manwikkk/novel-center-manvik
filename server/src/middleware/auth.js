'use strict';

const { verifyAccessToken } = require('../utils/jwt');
const { errors } = require('../utils/HttpError');
const { resolveUserRow, assertPortalAccess } = require('../services/suspension.service');

function readBearer(req) {
  const h = req.headers.authorization || req.headers.Authorization;
  if (!h || typeof h !== 'string') return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

function asyncMiddleware(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

async function attachUserFromToken(req) {
  const token = readBearer(req);
  if (!token) return false;
  const payload = verifyAccessToken(token);
  req.user = { id: Number(payload.sub), role: payload.role, email: payload.email };
  return true;
}

async function ensurePortalAccess(req) {
  const row = await resolveUserRow(req.user.id);
  if (!row) throw errors.unauthorized('Account not found');
  await assertPortalAccess(row);
}

// Required: rejects without a valid token or when portal access is blocked.
const authRequired = asyncMiddleware(async (req, _res, next) => {
  const hasToken = await attachUserFromToken(req).catch(() => {
    throw errors.unauthorized('Invalid or expired token');
  });
  if (!hasToken) throw errors.unauthorized('Missing access token');
  await ensurePortalAccess(req);
  next();
});

// Optional: attaches user if token is valid; rejects suspended accounts with a token.
const authOptional = asyncMiddleware(async (req, _res, next) => {
  let attached = false;
  try {
    attached = await attachUserFromToken(req);
  } catch (_e) {
    return next();
  }
  if (!attached) return next();
  try {
    await ensurePortalAccess(req);
  } catch (err) {
    if (err.status === 403) throw err;
    req.user = undefined;
  }
  return next();
});

module.exports = { authRequired, authOptional };
