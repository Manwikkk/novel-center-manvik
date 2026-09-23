'use strict';

/**
 * In-app notifications (`user_notifications`). Producers call `notify()`
 * best-effort — a failed notification must never fail the action that
 * triggered it — and the header bell reads `list()` / `unreadCount()`.
 */

const pool = require('../db/pool');
const { clampPagination } = require('../utils/pagination');

const TYPES = new Set([
  'follow', 'chapter', 'badge', 'reward', 'checkin', 'task', 'event', 'system',
]);

function serialize(r) {
  return {
    id: r.id,
    type: r.type,
    title: r.title,
    body: r.body || '',
    linkUrl: r.link_url || null,
    isRead: Number(r.is_read) === 1,
    createdAt: r.created_ts != null ? new Date(Number(r.created_ts) * 1000).toISOString() : r.created_at,
  };
}

async function notify(userId, { type = 'system', title, body = null, linkUrl = null }, conn = pool) {
  if (!userId || !title) return null;
  const kind = TYPES.has(type) ? type : 'system';
  try {
    const [r] = await conn.execute(
      'INSERT INTO user_notifications (user_id, type, title, body, link_url) VALUES (?, ?, ?, ?, ?)',
      [userId, kind, String(title).slice(0, 200), body ? String(body).slice(0, 500) : null, linkUrl ? String(linkUrl).slice(0, 500) : null],
    );
    return r.insertId;
  } catch (_e) {
    return null;
  }
}

/** Same notification to many users (e.g. every follower of an author). */
async function notifyMany(userIds, payload, conn = pool) {
  const ids = [...new Set((userIds || []).map(Number).filter(Boolean))];
  for (const id of ids) {
    // eslint-disable-next-line no-await-in-loop
    await notify(id, payload, conn);
  }
  return ids.length;
}

async function list(userId, { page, pageSize, unreadOnly = false } = {}) {
  const { page: safePage, pageSize: safePageSize, offset } = clampPagination(page, pageSize, {
    defaultSize: 20,
    max: 50,
  });
  const where = ['user_id = ?'];
  const params = [userId];
  if (unreadOnly) where.push('is_read = 0');
  const whereSql = where.join(' AND ');
  const [rows] = await pool.execute(
    `SELECT id, type, title, body, link_url, is_read, created_at, UNIX_TIMESTAMP(created_at) AS created_ts
       FROM user_notifications
      WHERE ${whereSql}
      ORDER BY created_at DESC, id DESC
      LIMIT ${safePageSize} OFFSET ${offset}`,
    params,
  );
  const [[counts]] = await pool.execute(
    `SELECT COUNT(*) AS total, SUM(is_read = 0) AS unread FROM user_notifications WHERE user_id = ?`,
    [userId],
  );
  return {
    items: rows.map(serialize),
    page: safePage,
    pageSize: safePageSize,
    total: Number(counts.total || 0),
    unread: Number(counts.unread || 0),
  };
}

async function unreadCount(userId) {
  const [[r]] = await pool.execute(
    'SELECT COUNT(*) AS c FROM user_notifications WHERE user_id = ? AND is_read = 0',
    [userId],
  );
  return Number(r.c || 0);
}

async function markRead(userId, { ids = null, all = false } = {}) {
  if (all || !ids || !ids.length) {
    await pool.execute('UPDATE user_notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0', [userId]);
  } else {
    const clean = ids.map(Number).filter(Boolean).slice(0, 200);
    if (clean.length) {
      const placeholders = clean.map(() => '?').join(',');
      await pool.execute(
        `UPDATE user_notifications SET is_read = 1 WHERE user_id = ? AND id IN (${placeholders})`,
        [userId, ...clean],
      );
    }
  }
  return { unread: await unreadCount(userId) };
}

module.exports = { notify, notifyMany, list, unreadCount, markRead };
