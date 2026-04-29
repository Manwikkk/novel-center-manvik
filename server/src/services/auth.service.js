'use strict';

const pool = require('../db/pool');
const { withTransaction } = require('../db/tx');
const { hashPassword, comparePassword } = require('../utils/hash');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { errors } = require('../utils/HttpError');

function publicUser(row) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    status: row.status,
    createdAt: row.created_at,
  };
}

function tokensFor(user) {
  const payload = { sub: String(user.id), role: user.role, email: user.email };
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

async function findByEmail(email) {
  const [rows] = await pool.execute('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
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
      'INSERT INTO users (email, password_hash, display_name, role) VALUES (?, ?, ?, ?)',
      [email, password_hash, displayName, role || 'user'],
    );
    const userId = r.insertId;
    await conn.execute('INSERT INTO wallets (user_id, balance) VALUES (?, 0)', [userId]);
    const [rows] = await conn.execute('SELECT * FROM users WHERE id = ? LIMIT 1', [userId]);
    const user = rows[0];
    const tokens = tokensFor({ id: user.id, role: user.role, email: user.email });
    return { user: publicUser(user), ...tokens };
  });
}

async function login({ email, password }) {
  const row = await findByEmail(email);
  if (!row) throw errors.unauthorized('Invalid credentials');
  if (row.status === 'suspended') throw errors.forbidden('Account suspended');

  const ok = await comparePassword(password, row.password_hash);
  if (!ok) throw errors.unauthorized('Invalid credentials');

  const tokens = tokensFor({ id: row.id, role: row.role, email: row.email });
  return { user: publicUser(row), ...tokens };
}

async function me(userId) {
  const row = await findById(userId);
  if (!row) throw errors.notFound('User not found');
  const [walletRows] = await pool.execute('SELECT balance FROM wallets WHERE user_id = ?', [userId]);
  const balance = walletRows[0] ? Number(walletRows[0].balance) : 0;
  return { user: publicUser(row), wallet: { balance } };
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

async function refresh({ refreshToken }) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (_e) {
    throw errors.unauthorized('Invalid refresh token');
  }
  const row = await findById(payload.sub);
  if (!row) throw errors.unauthorized('Account not found');
  if (row.status === 'suspended') throw errors.forbidden('Account suspended');
  return { user: publicUser(row), ...tokensFor({ id: row.id, role: row.role, email: row.email }) };
}

module.exports = { register, login, me, updateMe, refresh, publicUser };
