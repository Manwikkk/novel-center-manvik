'use strict';

// Single-use, hashed password reset tokens (also used as staff invites).

const crypto = require('crypto');
const pool = require('../db/pool');
const { errors } = require('../utils/HttpError');
const { hashPassword } = require('../utils/hash');
const emailSvc = require('./email.service');

const RESET_TTL_HOURS = 1;
const INVITE_TTL_HOURS = 24;

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

async function issueToken(userId, { purpose = 'reset', ttlHours = RESET_TTL_HOURS, conn = pool } = {}) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + ttlHours * 3600 * 1000);
  // A new token supersedes any unused one for the same user.
  await conn.execute(
    'UPDATE password_resets SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL',
    [userId],
  );
  await conn.execute(
    'INSERT INTO password_resets (user_id, token_hash, purpose, expires_at) VALUES (?, ?, ?, ?)',
    [userId, hashToken(token), purpose, expiresAt],
  );
  return { token, expiresAt, ttlHours };
}

// Always resolves the same way so the endpoint cannot be used to probe emails.
async function requestReset(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return { ok: true };
  const [rows] = await pool.execute(
    'SELECT id, email, display_name, status FROM users WHERE email = ? LIMIT 1',
    [normalized],
  );
  const user = rows[0];
  if (!user) return { ok: true };

  const { token, ttlHours } = await issueToken(user.id, { purpose: 'reset', ttlHours: RESET_TTL_HOURS });
  try {
    await emailSvc.sendPasswordResetEmail({
      to: user.email,
      displayName: user.display_name,
      token,
      ttlHours,
    });
  } catch (err) {
    console.error('[email] password reset send failed:', err.message);
  }
  return { ok: true };
}

async function findValid(token) {
  if (!token) return null;
  const [rows] = await pool.execute(
    `SELECT pr.id, pr.user_id, pr.purpose, pr.expires_at, pr.used_at, u.email, u.display_name
       FROM password_resets pr
       JOIN users u ON u.id = pr.user_id
      WHERE pr.token_hash = ?
      LIMIT 1`,
    [hashToken(token)],
  );
  const row = rows[0];
  if (!row || row.used_at) return null;
  if (new Date(row.expires_at).getTime() <= Date.now()) return null;
  return row;
}

async function inspect(token) {
  const row = await findValid(token);
  if (!row) throw errors.badRequest('This password link is invalid or has expired');
  return { valid: true, email: row.email, purpose: row.purpose };
}

async function resetPassword({ token, password }) {
  const row = await findValid(token);
  if (!row) throw errors.badRequest('This password link is invalid or has expired');

  const password_hash = await hashPassword(password);
  await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, row.user_id]);
  await pool.execute(
    'UPDATE password_resets SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL',
    [row.user_id],
  );
  return { ok: true, email: row.email };
}

module.exports = {
  RESET_TTL_HOURS,
  INVITE_TTL_HOURS,
  issueToken,
  requestReset,
  inspect,
  resetPassword,
};
