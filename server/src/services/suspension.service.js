'use strict';

const pool = require('../db/pool');
const { errors } = require('../utils/HttpError');
const {
  RESTRICTION_KEYS,
  sanitizeRestrictions,
  hasAnyRestriction,
} = require('../constants/suspensionRestrictions');

function parseRestrictions(raw) {
  if (!raw) return null;
  try {
    const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return sanitizeRestrictions(obj);
  } catch (_e) {
    return null;
  }
}

function suspensionMeta(row) {
  const restrictions = parseRestrictions(row.suspension_restrictions);
  const hasRestrictions = restrictions && hasAnyRestriction(restrictions);
  return {
    suspensionType: row.suspension_type || null,
    suspendedUntil: row.suspended_until
      ? new Date(row.suspended_until).toISOString()
      : null,
    restrictions: hasRestrictions ? restrictions : null,
  };
}

function isExpired(row) {
  if (!row?.suspended_until) return false;
  return new Date(row.suspended_until).getTime() <= Date.now();
}

function blocksPortal(row) {
  if (!row) return false;
  if (row.status === 'suspended') {
    const restrictions = parseRestrictions(row.suspension_restrictions);
    if (!restrictions || !hasAnyRestriction(restrictions)) return true;
    return !!restrictions.portal_access;
  }
  const restrictions = parseRestrictions(row.suspension_restrictions);
  return !!(restrictions?.portal_access);
}

function hasRestriction(row, key) {
  if (!row || row.role === 'admin') return false;
  const restrictions = parseRestrictions(row.suspension_restrictions);
  if (!restrictions || !hasAnyRestriction(restrictions)) {
    return row.status === 'suspended' && key === 'portal_access';
  }
  return !!restrictions[key];
}

async function clearSuspension(conn, userId) {
  await conn.execute(
    `UPDATE users
        SET status = 'active',
            suspension_type = NULL,
            suspended_until = NULL,
            suspension_restrictions = NULL
      WHERE id = ?`,
    [userId],
  );
}

async function expireIfNeeded(row, { conn = null } = {}) {
  if (!row || !isExpired(row)) return row;
  const exec = conn ? conn.execute.bind(conn) : pool.execute.bind(pool);
  await exec(
    `UPDATE users
        SET status = 'active',
            suspension_type = NULL,
            suspended_until = NULL,
            suspension_restrictions = NULL
      WHERE id = ?`,
    [row.id],
  );
  return {
    ...row,
    status: 'active',
    suspension_type: null,
    suspended_until: null,
    suspension_restrictions: null,
  };
}

async function loadUserRow(userId, { conn = null } = {}) {
  const exec = conn ? conn.execute.bind(conn) : pool.execute.bind(pool);
  const [rows] = await exec('SELECT * FROM users WHERE id = ? LIMIT 1', [userId]);
  return rows[0] || null;
}

async function resolveUserRow(userId, { conn = null } = {}) {
  const row = await loadUserRow(userId, { conn });
  if (!row) return null;
  return expireIfNeeded(row, { conn });
}

async function assertPortalAccess(row) {
  const resolved = await expireIfNeeded(row);
  if (blocksPortal(resolved)) {
    throw errors.accountSuspended('Account suspended');
  }
  return resolved;
}

function assertRestriction(row, key, message) {
  if (hasRestriction(row, key)) {
    throw errors.forbidden(message || 'This action is restricted on your account');
  }
}

async function expireTemporarySuspensions() {
  const [result] = await pool.execute(
    `UPDATE users
        SET status = 'active',
            suspension_type = NULL,
            suspended_until = NULL,
            suspension_restrictions = NULL
      WHERE suspended_until IS NOT NULL
        AND suspended_until <= UTC_TIMESTAMP()`,
  );
  return result.affectedRows || 0;
}

module.exports = {
  RESTRICTION_KEYS,
  parseRestrictions,
  suspensionMeta,
  isExpired,
  blocksPortal,
  hasRestriction,
  clearSuspension,
  expireIfNeeded,
  loadUserRow,
  resolveUserRow,
  assertPortalAccess,
  assertRestriction,
  expireTemporarySuspensions,
  sanitizeRestrictions,
  hasAnyRestriction,
};
