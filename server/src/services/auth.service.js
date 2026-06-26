'use strict';

const { OAuth2Client } = require('google-auth-library');
const env = require('../config/env');
const pool = require('../db/pool');
const { withTransaction } = require('../db/tx');
const { hashPassword, comparePassword } = require('../utils/hash');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { errors } = require('../utils/HttpError');
const { publicUser } = require('../utils/publicUser');
const { permissionsForAuthUser } = require('./adminPermissions.service');
const { assertPortalAccess, expireIfNeeded } = require('./suspension.service');

const googleClient = env.google.clientId ? new OAuth2Client(env.google.clientId) : null;

function tokensFor(user) {
  const payload = { sub: String(user.id), role: user.role, email: user.email };
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

async function buildAuthResult(row) {
  await assertPortalAccess(row);
  const adminPermissions = await permissionsForAuthUser(row);
  const user = publicUser(row, adminPermissions != null ? { adminPermissions } : {});
  return {
    user,
    requiresOnboarding: !user.onboardingCompleted,
    ...tokensFor({ id: row.id, role: row.role, email: row.email }),
  };
}

async function findByEmail(email) {
  const [rows] = await pool.execute('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
  return rows[0] || null;
}

async function findByGoogleId(googleId) {
  const [rows] = await pool.execute('SELECT * FROM users WHERE google_id = ? LIMIT 1', [googleId]);
  return rows[0] || null;
}

async function findById(id) {
  const [rows] = await pool.execute('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

async function register({ email, password, displayName, role }) {
  const existing = await findByEmail(email);
  if (existing) throw errors.conflict('Email already registered');

  const password_hash = await hashPassword(password);

  return withTransaction(async (conn) => {
    const [r] = await conn.execute(
      'INSERT INTO users (email, password_hash, display_name, role, onboarding_completed) VALUES (?, ?, ?, ?, 1)',
      [email, password_hash, displayName, role || 'user'],
    );
    const userId = r.insertId;
    await conn.execute('INSERT INTO wallets (user_id, balance) VALUES (?, 0)', [userId]);
    const [rows] = await conn.execute('SELECT * FROM users WHERE id = ? LIMIT 1', [userId]);
    return buildAuthResult(rows[0]);
  });
}

async function login({ email, password }) {
  const row = await expireIfNeeded(await findByEmail(email));
  if (!row) throw errors.unauthorized('Invalid credentials');
  if (!row.password_hash) {
    throw errors.unauthorized('This account uses Google sign-in. Continue with Google.');
  }

  const ok = await comparePassword(password, row.password_hash);
  if (!ok) throw errors.unauthorized('Invalid credentials');

  return buildAuthResult(row);
}

async function me(userId) {
  const row = await expireIfNeeded(await findById(userId));
  if (!row) throw errors.notFound('User not found');
  const [walletRows] = await pool.execute('SELECT balance FROM wallets WHERE user_id = ?', [userId]);
  const balance = walletRows[0] ? Number(walletRows[0].balance) : 0;
  const adminPermissions = await permissionsForAuthUser(row);
  return {
    user: publicUser(row, adminPermissions != null ? { adminPermissions } : {}),
    wallet: { balance },
  };
}

async function updateMe(userId, patch) {
  const fields = [];
  const params = [];
  if (Object.prototype.hasOwnProperty.call(patch, 'displayName') && patch.displayName !== undefined) {
    fields.push('display_name = ?');
    params.push(patch.displayName);
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'bio')) {
    fields.push('bio = ?');
    params.push(patch.bio === '' ? null : patch.bio);
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'avatarUrl')) {
    fields.push('avatar_url = ?');
    params.push(patch.avatarUrl === '' ? null : patch.avatarUrl);
  }

  if (fields.length === 0) {
    return me(userId);
  }

  params.push(userId);
  await pool.execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params);

  return me(userId);
}

async function googleAuth({ credential }) {
  if (!googleClient || !env.google.clientId) {
    throw errors.badRequest('Google sign-in is not configured');
  }
  if (!credential) throw errors.badRequest('Google credential is required');

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: env.google.clientId,
    });
    payload = ticket.getPayload();
  } catch (_err) {
    throw errors.unauthorized('Invalid Google sign-in');
  }

  const googleId = payload.sub;
  const email = String(payload.email || '').trim().toLowerCase();
  const displayName = String(payload.name || email.split('@')[0] || 'Reader').trim().slice(0, 120);
  const avatarUrl = payload.picture || null;

  if (!email || !payload.email_verified) {
    throw errors.badRequest('Google account email must be verified');
  }

  let row = await findByGoogleId(googleId);
  if (!row) {
    const byEmail = await findByEmail(email);
    if (byEmail) {
      if (byEmail.google_id && byEmail.google_id !== googleId) {
        throw errors.conflict('Email is linked to a different Google account');
      }
      await pool.execute(
        'UPDATE users SET google_id = ?, avatar_url = COALESCE(avatar_url, ?) WHERE id = ?',
        [googleId, avatarUrl, byEmail.id],
      );
      row = await findById(byEmail.id);
    }
  }

  if (!row) {
    return withTransaction(async (conn) => {
      const [r] = await conn.execute(
        `INSERT INTO users (email, password_hash, google_id, display_name, role, avatar_url, onboarding_completed)
         VALUES (?, NULL, ?, ?, 'user', ?, 0)`,
        [email, googleId, displayName, avatarUrl],
      );
      const userId = r.insertId;
      await conn.execute('INSERT INTO wallets (user_id, balance) VALUES (?, 0)', [userId]);
      const [rows] = await conn.execute('SELECT * FROM users WHERE id = ? LIMIT 1', [userId]);
      return buildAuthResult(rows[0]);
    });
  }

  row = await expireIfNeeded(row);
  if (row.google_id !== googleId) {
    throw errors.conflict('Account email conflict');
  }
  if (!row.avatar_url && avatarUrl) {
    await pool.execute('UPDATE users SET avatar_url = ? WHERE id = ?', [avatarUrl, row.id]);
    row = await findById(row.id);
  }

  return buildAuthResult(row);
}

async function completeOnboarding(userId, { role }) {
  const safeRole = role === 'author' ? 'author' : 'user';
  const row = await findById(userId);
  if (!row) throw errors.notFound('User not found');
  if (Number(row.onboarding_completed) === 1) {
    return buildAuthResult(row);
  }

  await pool.execute(
    'UPDATE users SET role = ?, onboarding_completed = 1 WHERE id = ?',
    [safeRole, userId],
  );
  const updated = await findById(userId);
  return buildAuthResult(updated);
}

async function refresh({ refreshToken }) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (_e) {
    throw errors.unauthorized('Invalid refresh token');
  }
  const row = await expireIfNeeded(await findById(payload.sub));
  if (!row) throw errors.unauthorized('Account not found');
  return buildAuthResult(row);
}

module.exports = {
  register,
  login,
  googleAuth,
  completeOnboarding,
  me,
  updateMe,
  refresh,
  publicUser,
};
