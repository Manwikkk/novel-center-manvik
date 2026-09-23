'use strict';

/**
 * Reward framework shared by the Daily Check-In (and, later, daily tasks,
 * achievements, campaigns and membership perks).
 *
 * A reward is a row in `user_rewards`:
 *   COINS               credited to the wallet immediately (row kept for history)
 *   CHAPTER_DISCOUNT    % off one chapter unlock, capped, valid for N days
 *   BUNDLE_DISCOUNT     % off a multi-chapter unlock, capped, valid for N days
 *   NOVEL_PASS          free eligible chapters in one novel for N hours after activation
 *   PLATFORM_WIDE_PASS  free eligible chapters everywhere for N hours after activation
 *
 * The server owns every value here; clients only ever send a reward id (and a
 * novel id when activating a Novel Pass).
 */

const pool = require('../db/pool');
const { withTransaction } = require('../db/tx');
const { errors } = require('../utils/HttpError');
const finance = require('./finance.service');
const checkinConfig = require('./checkinConfig.service');

const PASS_TYPES = new Set(['NOVEL_PASS', 'PLATFORM_WIDE_PASS']);
const VOUCHER_TYPES = new Set(['CHAPTER_DISCOUNT', 'BUNDLE_DISCOUNT']);

function parseJson(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch (_e) { return fallback; }
}

// All instants are read back as epoch seconds computed by MySQL (UNIX_TIMESTAMP)
// so the result does not depend on the API process timezone; mysql2 would
// otherwise parse DATETIME strings as local time.
function isoFromTs(ts) {
  if (ts == null) return null;
  const n = Number(ts);
  return Number.isFinite(n) ? new Date(n * 1000).toISOString() : null;
}

function hoursLabel(hours) {
  const h = Number(hours) || 0;
  if (h % 24 === 0 && h >= 24) return `${h / 24}-day`;
  return `${h}-hour`;
}

/** Human-facing title/description for a reward definition. */
function describe(def) {
  switch (def.type) {
    case 'COINS':
      return { title: `${def.amount} Coins`, description: 'Credited to your wallet instantly.' };
    case 'CHAPTER_DISCOUNT':
      return {
        title: `${def.percent}% Chapter Discount`,
        description: `Up to ${def.maxDiscountCoins} coins off one chapter unlock. Valid ${def.validDays} days.`,
      };
    case 'BUNDLE_DISCOUNT':
      return {
        title: `${def.percent}% Bundle Discount`,
        description: `Up to ${def.maxDiscountCoins} coins off when you unlock ${def.bundleSize || 5} chapters together. Valid ${def.validDays} days.`,
      };
    case 'NOVEL_PASS':
      return {
        title: `${hoursLabel(def.hours)} Novel Pass`,
        description: `Read every eligible locked chapter of one novel free for ${def.hours} hours after you activate it.`,
      };
    case 'PLATFORM_WIDE_PASS':
      return {
        title: `${hoursLabel(def.hours)} Platform Pass`,
        description: `Read eligible locked chapters across Novel Centre free for ${def.hours} hours after you activate it.`,
      };
    default:
      return { title: def.type, description: '' };
  }
}

/** Status as it stands right now (expiry is evaluated lazily on read). */
function liveStatus(row) {
  const status = row.status;
  const now = Number(row.now_ts);
  if (status === 'issued' && row.valid_until_ts != null && Number(row.valid_until_ts) < now) return 'expired';
  if (status === 'active' && row.expires_ts != null && Number(row.expires_ts) <= now) return 'expired';
  return status;
}

function serialize(row) {
  if (!row) return null;
  const status = liveStatus(row);
  const meta = parseJson(row.meta, {});
  const isPass = PASS_TYPES.has(row.reward_type);
  const isVoucher = VOUCHER_TYPES.has(row.reward_type);
  return {
    id: row.id,
    type: row.reward_type,
    source: row.source,
    sourceRef: row.source_ref || null,
    title: row.title,
    description: row.description || '',
    amount: Number(row.amount) || 0,
    percent: isVoucher ? Number(row.amount) || 0 : null,
    maxDiscountCoins: row.max_discount_coins == null ? null : Number(row.max_discount_coins),
    bundleSize: meta.bundleSize || null,
    durationMinutes: row.duration_minutes == null ? null : Number(row.duration_minutes),
    hours: row.duration_minutes == null ? null : Math.round(Number(row.duration_minutes) / 60),
    scope: row.scope,
    status,
    isPass,
    isVoucher,
    bookId: row.book_id || null,
    book: row.book_title
      ? { id: row.book_id, title: row.book_title, slug: row.book_slug, coverUrl: row.book_cover_url }
      : null,
    validUntil: isoFromTs(row.valid_until_ts),
    activatedAt: isoFromTs(row.activated_ts),
    expiresAt: isoFromTs(row.expires_ts),
    remainingSeconds: status === 'active' && row.expires_ts != null
      ? Math.max(0, Number(row.expires_ts) - Number(row.now_ts))
      : null,
    usedAt: isoFromTs(row.used_ts),
    lucky: !!meta.lucky,
    meta,
    createdAt: isoFromTs(row.created_ts),
  };
}

const SELECT_REWARD = `
  SELECT r.*, b.title AS book_title, b.slug AS book_slug, b.cover_url AS book_cover_url,
         UNIX_TIMESTAMP(r.valid_until) AS valid_until_ts,
         UNIX_TIMESTAMP(r.activated_at) AS activated_ts,
         UNIX_TIMESTAMP(r.expires_at) AS expires_ts,
         UNIX_TIMESTAMP(r.used_at) AS used_ts,
         UNIX_TIMESTAMP(r.created_at) AS created_ts,
         UNIX_TIMESTAMP() AS now_ts
    FROM user_rewards r
    LEFT JOIN books b ON b.id = r.book_id`;

async function getRow(conn, id, userId) {
  const [rows] = await conn.execute(`${SELECT_REWARD} WHERE r.id = ? AND r.user_id = ? LIMIT 1`, [id, userId]);
  return rows[0] || null;
}

/**
 * Issue a reward inside the caller's transaction. `def` is a normalized option
 * from the check-in config (or any object with the same shape).
 */
async function issueReward(conn, userId, def, { source = 'checkin_milestone', sourceRef = null, meta = null } = {}) {
  const text = describe(def);
  const extra = { ...(meta || {}) };
  let amount = 0;
  let maxDiscount = null;
  let durationMinutes = null;
  let scope = 'none';
  let status = 'issued';
  let validDays = null;

  if (def.type === 'COINS') {
    amount = Number(def.amount) || 0;
    status = 'used';
  } else if (VOUCHER_TYPES.has(def.type)) {
    amount = Number(def.percent) || 0;
    maxDiscount = Number(def.maxDiscountCoins) || null;
    validDays = Number(def.validDays) || 30;
    if (def.type === 'BUNDLE_DISCOUNT') extra.bundleSize = Number(def.bundleSize) || 5;
  } else if (PASS_TYPES.has(def.type)) {
    durationMinutes = Math.round((Number(def.hours) || 12) * 60);
    scope = def.type === 'NOVEL_PASS' ? 'novel' : 'platform';
  } else {
    throw errors.badRequest('Unknown reward type');
  }

  const [ins] = await conn.execute(
    `INSERT INTO user_rewards
       (user_id, reward_type, source, source_ref, title, description, amount, max_discount_coins,
        duration_minutes, scope, status, valid_until, used_at, meta)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
             IF(? IS NULL, NULL, DATE_ADD(NOW(), INTERVAL ? DAY)),
             IF(? = 'used', NOW(), NULL), ?)`,
    [
      userId, def.type, source, sourceRef, def.label || text.title, text.description, amount, maxDiscount,
      durationMinutes, scope, status, validDays, validDays, status,
      Object.keys(extra).length ? JSON.stringify(extra) : null,
    ],
  );
  const rewardId = ins.insertId;

  if (def.type === 'COINS' && amount > 0) {
    await finance.creditWalletBuckets(conn, userId, { bonus: amount });
    await conn.execute(
      `INSERT INTO transactions (user_id, type, tokens_delta, meta)
       VALUES (?, 'reward', ?, JSON_OBJECT('rewardId', ?, 'source', ?, 'sourceRef', ?, 'title', ?))`,
      [userId, amount, rewardId, source, sourceRef, text.title],
    );
  }

  return serialize(await getRow(conn, rewardId, userId));
}

async function listInventory(userId) {
  const [rows] = await pool.execute(
    `${SELECT_REWARD} WHERE r.user_id = ? ORDER BY r.created_at DESC, r.id DESC LIMIT 200`,
    [userId],
  );
  const items = rows.map((r) => serialize(r));
  return {
    items,
    available: items.filter((r) => r.status === 'issued' && r.type !== 'COINS'),
    activePasses: items.filter((r) => r.isPass && r.status === 'active'),
  };
}

/** Passes currently running for a user (rows, not serialized). */
async function activePassRows(userId, conn = pool) {
  if (!userId) return [];
  const [rows] = await conn.execute(
    `${SELECT_REWARD}
      WHERE r.user_id = ? AND r.status = 'active' AND r.expires_at > NOW()
      ORDER BY r.expires_at ASC`,
    [userId],
  );
  return rows;
}

async function bookIsExcluded(bookId, config, conn = pool) {
  if (config.passRules.excludedBookIds.includes(Number(bookId))) return true;
  if (config.passRules.excludeOriginals) {
    const [rows] = await conn.execute(
      "SELECT 1 FROM book_tags WHERE book_id = ? AND tag = 'originals' LIMIT 1",
      [bookId],
    );
    if (rows.length) return true;
  }
  return false;
}

/**
 * The pass that lets `userId` read `bookId` for free right now, or null.
 * Novel passes only cover their own novel; the platform pass covers every
 * eligible novel.
 */
async function passCovering(userId, bookId, { conn = pool, passes = null } = {}) {
  if (!userId || !bookId) return null;
  const rows = passes || await activePassRows(userId, conn);
  if (!rows.length) return null;
  const config = await checkinConfig.getConfig();
  if (await bookIsExcluded(bookId, config, conn)) return null;
  const match = rows.find((r) => (
    (r.reward_type === 'NOVEL_PASS' && Number(r.book_id) === Number(bookId))
    || r.reward_type === 'PLATFORM_WIDE_PASS'
  ));
  return match ? serialize(match) : null;
}

/** Best unused voucher of a type (highest percent, soonest expiry first). */
async function bestVoucher(userId, type, conn = pool) {
  if (!userId) return null;
  const [rows] = await conn.execute(
    `${SELECT_REWARD}
      WHERE r.user_id = ? AND r.reward_type = ? AND r.status = 'issued'
        AND (r.valid_until IS NULL OR r.valid_until > NOW())
      ORDER BY r.amount DESC, r.valid_until ASC, r.id ASC
      LIMIT 1`,
    [userId, type],
  );
  return rows[0] ? serialize(rows[0]) : null;
}

/** Coins taken off `price` by a voucher: percent, rounded, capped, never free. */
function computeDiscount(price, voucher) {
  const base = Math.max(0, Number(price) || 0);
  if (!voucher || base <= 0) return 0;
  let discount = Math.round((base * (Number(voucher.percent) || 0)) / 100);
  if (discount < 1) discount = 1;
  if (voucher.maxDiscountCoins != null) discount = Math.min(discount, Number(voucher.maxDiscountCoins));
  return Math.max(0, Math.min(discount, base - 1));
}

async function consumeVoucher(conn, userId, voucherId, meta = {}) {
  const [r] = await conn.execute(
    `UPDATE user_rewards
        SET status = 'used', used_at = NOW(), meta = JSON_MERGE_PATCH(COALESCE(meta, JSON_OBJECT()), ?)
      WHERE id = ? AND user_id = ? AND status = 'issued'
        AND (valid_until IS NULL OR valid_until > NOW())`,
    [JSON.stringify(meta || {}), voucherId, userId],
  );
  if (!r.affectedRows) throw errors.conflict('This voucher is no longer available');
}

/**
 * Activate a stored pass. Novel passes need the novel they will cover; the
 * timer starts now. Overlapping free-reading passes do not stack.
 */
async function activatePass(userId, rewardId, { bookId = null } = {}) {
  return withTransaction(async (conn) => {
    const [rows] = await conn.execute(
      `${SELECT_REWARD} WHERE r.id = ? AND r.user_id = ? FOR UPDATE`,
      [rewardId, userId],
    );
    const row = rows[0];
    if (!row) throw errors.notFound('Reward not found');
    if (!PASS_TYPES.has(row.reward_type)) throw errors.badRequest('Only Novel Passes can be activated');
    if (liveStatus(row) !== 'issued') throw errors.conflict('This pass has already been used');

    const config = await checkinConfig.getConfig();
    let book = null;
    if (row.reward_type === 'NOVEL_PASS') {
      if (!bookId) throw errors.badRequest('Choose the novel this pass will unlock');
      const [books] = await conn.execute(
        `SELECT id, title, slug, cover_url, status FROM books
          WHERE id = ? AND recycled_at IS NULL LIMIT 1`,
        [bookId],
      );
      book = books[0];
      if (!book || book.status !== 'published') throw errors.notFound('Novel not found');
      if (await bookIsExcluded(book.id, config, conn)) {
        throw errors.badRequest('This novel is not eligible for Novel Passes');
      }
    }

    const running = await activePassRows(userId, conn);
    const platformRunning = running.find((r) => r.reward_type === 'PLATFORM_WIDE_PASS');
    if (platformRunning) {
      throw errors.conflict('A platform-wide pass is already active — passes do not stack');
    }
    if (row.reward_type === 'PLATFORM_WIDE_PASS' && running.length) {
      throw errors.conflict('Finish your active Novel Pass before activating a platform-wide pass');
    }
    if (book && running.some((r) => Number(r.book_id) === Number(book.id))) {
      throw errors.conflict('A pass is already active for this novel');
    }

    const minutes = Number(row.duration_minutes) || 720;
    await conn.execute(
      `UPDATE user_rewards
          SET status = 'active', book_id = ?, activated_at = NOW(),
              expires_at = DATE_ADD(NOW(), INTERVAL ? MINUTE)
        WHERE id = ?`,
      [book ? book.id : null, minutes, row.id],
    );
    return serialize(await getRow(conn, row.id, userId));
  }).then(async (reward) => {
    try {
      const notifications = require('./notifications.service');
      const hoursLeft = Math.max(1, Math.round((Number(reward.durationMinutes) || minutesFromReward(reward)) / 60));
      await notifications.notifyEngagement(userId, {
        type: 'reward',
        category: 'rewards',
        level: 'toast',
        eventType: 'pass_activated',
        dedupeKey: `pass:activate:${reward.id}`,
        title: `${reward.title} activated`,
        body: reward.book
          ? `Reading ${reward.book.title} free — about ${hoursLeft}h remaining.`
          : `Eligible locked chapters are free — about ${hoursLeft}h remaining.`,
        linkUrl: '/check-in',
        metadata: { rewardId: reward.id, hours: hoursLeft, bookId: reward.book?.id || null },
      });
    } catch (_e) { /* best-effort */ }
    return reward;
  });
}

function minutesFromReward(reward) {
  if (reward.expiresAt && reward.activatedAt) {
    const ms = new Date(reward.expiresAt).getTime() - new Date(reward.activatedAt).getTime();
    if (Number.isFinite(ms) && ms > 0) return Math.round(ms / 60000);
  }
  return 720;
}

/** Housekeeping: persist lazily-computed expiries so inventories stay tidy. */
async function expireStale() {
  const [a] = await pool.execute(
    "UPDATE user_rewards SET status = 'expired' WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at <= NOW()",
  );
  const [b] = await pool.execute(
    "UPDATE user_rewards SET status = 'expired' WHERE status = 'issued' AND valid_until IS NOT NULL AND valid_until <= NOW()",
  );
  return (a.affectedRows || 0) + (b.affectedRows || 0);
}

module.exports = {
  PASS_TYPES,
  VOUCHER_TYPES,
  describe,
  serialize,
  issueReward,
  listInventory,
  activePassRows,
  passCovering,
  bestVoucher,
  computeDiscount,
  consumeVoucher,
  activatePass,
  expireStale,
};
