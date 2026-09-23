'use strict';

/**
 * In-app notifications (`user_notifications`).
 *
 * Producers call `notify()` / `notifyEngagement()` best-effort — a failed
 * notification must never fail the action that triggered it.
 *
 * Presentation levels (client chooses surface from this, not from business rules):
 *   center      — notification center only
 *   toast       — Level 1: brief auto-dismiss
 *   celebration — Level 2: restrained milestone popup
 *
 * Dedupe keys + presented_at keep the same event from reappearing after refresh,
 * route change, new tab, or reconnect.
 */

const pool = require('../db/pool');
const { clampPagination } = require('../utils/pagination');

const TYPES = new Set([
  'follow', 'chapter', 'badge', 'reward', 'checkin', 'task', 'event', 'system', 'achievement',
]);

const CATEGORIES = new Set(['tasks', 'rewards', 'achievements', 'events', 'system']);

const PRESENTATIONS = new Set(['center', 'toast', 'celebration']);

const CATEGORY_BY_TYPE = {
  task: 'tasks',
  reward: 'rewards',
  checkin: 'rewards',
  badge: 'achievements',
  achievement: 'achievements',
  event: 'events',
  follow: 'system',
  chapter: 'system',
  system: 'system',
};

function normalizeCategory(category, type) {
  if (category && CATEGORIES.has(category)) return category;
  return CATEGORY_BY_TYPE[type] || 'system';
}

function serialize(r) {
  let metadata = null;
  if (r.metadata != null) {
    if (typeof r.metadata === 'object') metadata = r.metadata;
    else {
      try { metadata = JSON.parse(r.metadata); } catch (_e) { metadata = null; }
    }
  }
  return {
    id: r.id,
    type: r.type,
    category: r.category || normalizeCategory(null, r.type),
    title: r.title,
    body: r.body || '',
    linkUrl: r.link_url || null,
    metadata,
    presentation: r.presentation || 'center',
    presentedAt: r.presented_at
      ? (r.presented_ts != null
        ? new Date(Number(r.presented_ts) * 1000).toISOString()
        : new Date(r.presented_at).toISOString())
      : null,
    groupKey: r.group_key || null,
    dedupeKey: r.dedupe_key || null,
    isRead: Number(r.is_read) === 1,
    createdAt: r.created_ts != null ? new Date(Number(r.created_ts) * 1000).toISOString() : r.created_at,
  };
}

function buildInsert(userId, payload) {
  const type = TYPES.has(payload.type) ? payload.type : 'system';
  const category = normalizeCategory(payload.category, type);
  const presentation = PRESENTATIONS.has(payload.presentation) ? payload.presentation : 'center';
  const title = String(payload.title || '').slice(0, 200);
  const body = payload.body != null ? String(payload.body).slice(0, 500) : null;
  const linkUrl = payload.linkUrl ? String(payload.linkUrl).slice(0, 500) : null;
  const dedupeKey = payload.dedupeKey ? String(payload.dedupeKey).slice(0, 160) : null;
  const groupKey = payload.groupKey ? String(payload.groupKey).slice(0, 160) : null;
  const metadata = payload.metadata != null ? JSON.stringify(payload.metadata) : null;
  return {
    userId,
    type,
    category,
    title,
    body,
    linkUrl,
    metadata,
    dedupeKey,
    presentation,
    groupKey,
  };
}

/**
 * Idempotent insert. When dedupeKey is set, a second insert for the same
 * user+key is ignored and the existing row id is returned when possible.
 */
async function notify(userId, payload = {}, conn = pool) {
  if (!userId || !payload.title) return null;
  const row = buildInsert(userId, payload);
  if (!row.title) return null;
  try {
    const [r] = await conn.execute(
      `INSERT INTO user_notifications
         (user_id, type, category, title, body, link_url, metadata, dedupe_key, presentation, group_key)
       VALUES (?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?, ?, ?)`,
      [
        row.userId, row.type, row.category, row.title, row.body, row.linkUrl,
        row.metadata, row.dedupeKey, row.presentation, row.groupKey,
      ],
    );
    return r.insertId || null;
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY' && row.dedupeKey) {
      try {
        const [existing] = await conn.execute(
          'SELECT id FROM user_notifications WHERE user_id = ? AND dedupe_key = ? LIMIT 1',
          [userId, row.dedupeKey],
        );
        return existing[0]?.id || null;
      } catch (_e) {
        return null;
      }
    }
    // Schema may predate engagement columns — fall back to legacy insert.
    if (err && (err.code === 'ER_BAD_FIELD_ERROR' || /Unknown column/i.test(err.message || ''))) {
      try {
        const [r] = await conn.execute(
          'INSERT INTO user_notifications (user_id, type, title, body, link_url) VALUES (?, ?, ?, ?, ?)',
          [row.userId, row.type, row.title, row.body, row.linkUrl],
        );
        return r.insertId || null;
      } catch (_e) {
        return null;
      }
    }
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

/**
 * Engagement helper: pick presentation + category from event kind, always
 * store in the center, and optionally surface as toast or celebration.
 *
 * @param {number} userId
 * @param {object} opts
 * @param {'toast'|'celebration'|'center'} [opts.level]
 * @param {string} opts.eventType  semantic key e.g. task_complete, checkin_claimed
 * @param {string} opts.dedupeKey  unique per user outcome
 * @param {string} [opts.groupKey] shared key when several center rows share one celebration
 */
async function notifyEngagement(userId, opts = {}, conn = pool) {
  const level = PRESENTATIONS.has(opts.level) ? opts.level : 'center';
  const type = opts.type || 'system';
  const category = normalizeCategory(opts.category, type);
  return notify(userId, {
    type,
    category,
    title: opts.title,
    body: opts.body,
    linkUrl: opts.linkUrl,
    dedupeKey: opts.dedupeKey,
    groupKey: opts.groupKey || null,
    presentation: level,
    metadata: {
      eventType: opts.eventType || null,
      ...(opts.metadata && typeof opts.metadata === 'object' ? opts.metadata : {}),
    },
  }, conn);
}

/**
 * Multi-outcome action: store individual center records, plus at most one
 * celebration (and optionally one toast) so the UI never stacks popups.
 */
async function notifyBundle(userId, {
  groupKey,
  centerItems = [],
  celebration = null,
  toast = null,
} = {}, conn = pool) {
  const ids = { center: [], celebration: null, toast: null };
  for (const item of centerItems) {
    // eslint-disable-next-line no-await-in-loop
    const id = await notifyEngagement(userId, {
      ...item,
      level: 'center',
      groupKey: groupKey || item.groupKey || null,
    }, conn);
    if (id) ids.center.push(id);
  }
  if (celebration) {
    ids.celebration = await notifyEngagement(userId, {
      ...celebration,
      level: 'celebration',
      groupKey: groupKey || celebration.groupKey || null,
    }, conn);
  } else if (toast) {
    ids.toast = await notifyEngagement(userId, {
      ...toast,
      level: 'toast',
      groupKey: groupKey || toast.groupKey || null,
    }, conn);
  }
  return ids;
}

async function list(userId, {
  page, pageSize, unreadOnly = false, category = null,
} = {}) {
  const { page: safePage, pageSize: safePageSize, offset } = clampPagination(page, pageSize, {
    defaultSize: 20,
    max: 50,
  });
  const where = ['user_id = ?'];
  const params = [userId];
  if (unreadOnly) where.push('is_read = 0');
  if (category && category !== 'all' && CATEGORIES.has(category)) {
    where.push('category = ?');
    params.push(category);
  }
  const whereSql = where.join(' AND ');
  let rows;
  try {
    const [result] = await pool.execute(
      `SELECT id, type, category, title, body, link_url, metadata, dedupe_key, presentation,
              presented_at, UNIX_TIMESTAMP(presented_at) AS presented_ts, group_key,
              is_read, created_at, UNIX_TIMESTAMP(created_at) AS created_ts
         FROM user_notifications
        WHERE ${whereSql}
        ORDER BY created_at DESC, id DESC
        LIMIT ${safePageSize} OFFSET ${offset}`,
      params,
    );
    rows = result;
  } catch (err) {
    if (!(err && (err.code === 'ER_BAD_FIELD_ERROR' || /Unknown column/i.test(err.message || '')))) throw err;
    const legacyWhere = ['user_id = ?'];
    const legacyParams = [userId];
    if (unreadOnly) legacyWhere.push('is_read = 0');
    const [legacy] = await pool.execute(
      `SELECT id, type, title, body, link_url, is_read, created_at, UNIX_TIMESTAMP(created_at) AS created_ts
         FROM user_notifications
        WHERE ${legacyWhere.join(' AND ')}
        ORDER BY created_at DESC, id DESC
        LIMIT ${safePageSize} OFFSET ${offset}`,
      legacyParams,
    );
    rows = legacy;
  }

  const [[counts]] = await pool.execute(
    `SELECT COUNT(*) AS total, SUM(is_read = 0) AS unread FROM user_notifications WHERE user_id = ?`,
    [userId],
  );

  let categoryCounts = null;
  try {
    const [catRows] = await pool.execute(
      `SELECT category, COUNT(*) AS total, SUM(is_read = 0) AS unread
         FROM user_notifications
        WHERE user_id = ?
        GROUP BY category`,
      [userId],
    );
    categoryCounts = { all: { total: Number(counts.total || 0), unread: Number(counts.unread || 0) } };
    for (const c of catRows) {
      categoryCounts[c.category] = {
        total: Number(c.total || 0),
        unread: Number(c.unread || 0),
      };
    }
  } catch (_e) {
    categoryCounts = { all: { total: Number(counts.total || 0), unread: Number(counts.unread || 0) } };
  }

  return {
    items: rows.map(serialize),
    page: safePage,
    pageSize: safePageSize,
    total: Number(counts.total || 0),
    unread: Number(counts.unread || 0),
    categoryCounts,
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

/** Unpresented toast / celebration rows for the live surface host. */
async function listPendingSurface(userId, { limit = 20 } = {}) {
  const safeLimit = Math.max(1, Math.min(50, Number(limit) || 20));
  try {
    const [rows] = await pool.execute(
      `SELECT id, type, category, title, body, link_url, metadata, dedupe_key, presentation,
              presented_at, UNIX_TIMESTAMP(presented_at) AS presented_ts, group_key,
              is_read, created_at, UNIX_TIMESTAMP(created_at) AS created_ts
         FROM user_notifications
        WHERE user_id = ?
          AND presentation IN ('toast', 'celebration')
          AND presented_at IS NULL
        ORDER BY
          CASE presentation WHEN 'celebration' THEN 0 ELSE 1 END,
          created_at ASC, id ASC
        LIMIT ${safeLimit}`,
      [userId],
    );
    return { items: rows.map(serialize) };
  } catch (err) {
    if (err && (err.code === 'ER_BAD_FIELD_ERROR' || /Unknown column/i.test(err.message || ''))) {
      return { items: [] };
    }
    throw err;
  }
}

async function markPresented(userId, { ids = [] } = {}) {
  const clean = (ids || []).map(Number).filter(Boolean).slice(0, 50);
  if (!clean.length) return { ok: true, presented: 0 };
  const placeholders = clean.map(() => '?').join(',');
  const [r] = await pool.execute(
    `UPDATE user_notifications
        SET presented_at = COALESCE(presented_at, NOW())
      WHERE user_id = ?
        AND id IN (${placeholders})
        AND presentation IN ('toast', 'celebration')`,
    [userId, ...clean],
  );
  return { ok: true, presented: r.affectedRows || 0 };
}

module.exports = {
  notify,
  notifyMany,
  notifyEngagement,
  notifyBundle,
  list,
  unreadCount,
  markRead,
  listPendingSurface,
  markPresented,
  CATEGORIES,
  PRESENTATIONS,
};
