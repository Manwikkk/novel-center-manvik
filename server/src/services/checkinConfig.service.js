'use strict';

const pool = require('../db/pool');
const { errors } = require('../utils/HttpError');
const { isValidTimeZone } = require('../utils/calendarDay');
const {
  DEFAULT_CONFIG,
  DISPLAY_CYCLE_DAYS,
  REWARD_TYPES,
} = require('../constants/checkin');

const CACHE_MS = 30 * 1000;
let cache = null;
let cacheAt = 0;

function parseJson(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch (_e) { return fallback; }
}

function clampInt(value, { min = 0, max = Number.MAX_SAFE_INTEGER, fallback = 0 } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function clampNumber(value, { min = 0, max = 100, fallback = 0 } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function normalizeOption(raw, fallback) {
  const base = fallback || {};
  const type = REWARD_TYPES.includes(raw?.type) ? raw.type : base.type;
  if (!type) return null;
  const out = {
    key: String(raw?.key || base.key || type.toLowerCase()).slice(0, 40),
    type,
    enabled: raw?.enabled === undefined ? base.enabled !== false : !!raw.enabled,
    label: raw?.label ? String(raw.label).slice(0, 80) : undefined,
  };
  if (type === 'COINS') {
    out.amount = clampInt(raw?.amount ?? base.amount, { min: 0, max: 100000, fallback: 0 });
  } else if (type === 'CHAPTER_DISCOUNT' || type === 'BUNDLE_DISCOUNT') {
    out.percent = clampInt(raw?.percent ?? base.percent, { min: 1, max: 100, fallback: 10 });
    out.maxDiscountCoins = clampInt(raw?.maxDiscountCoins ?? base.maxDiscountCoins, { min: 1, max: 100000, fallback: 5 });
    out.validDays = clampInt(raw?.validDays ?? base.validDays, { min: 1, max: 365, fallback: 30 });
    if (type === 'BUNDLE_DISCOUNT') {
      out.bundleSize = clampInt(raw?.bundleSize ?? base.bundleSize, { min: 2, max: 20, fallback: 5 });
    }
  } else if (type === 'NOVEL_PASS' || type === 'PLATFORM_WIDE_PASS') {
    out.hours = clampInt(raw?.hours ?? base.hours, { min: 1, max: 24 * 30, fallback: 12 });
  }
  if (!out.label) delete out.label;
  return out;
}

function normalizeMilestone(raw, fallback) {
  const options = Array.isArray(raw?.options) && raw.options.length
    ? raw.options
    : fallback.options;
  const normalized = options
    .map((opt) => normalizeOption(opt, fallback.options.find((o) => o.key === opt?.key) || null))
    .filter(Boolean);
  // Option keys must be unique inside a milestone.
  const seen = new Set();
  const unique = normalized.filter((o) => {
    if (seen.has(o.key)) return false;
    seen.add(o.key);
    return true;
  });
  return {
    title: String(raw?.title || fallback.title).slice(0, 120),
    options: unique.length ? unique : fallback.options,
  };
}

/** Merge an arbitrary document over the defaults, clamping every value. */
function normalizeConfig(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const dailyExp = Array.isArray(src.dailyExp) && src.dailyExp.length === DISPLAY_CYCLE_DAYS
    ? src.dailyExp.map((v, i) => clampInt(v, { min: 0, max: 10000, fallback: DEFAULT_CONFIG.dailyExp[i] }))
    : [...DEFAULT_CONFIG.dailyExp];

  const lucky = src.luckyPass || {};
  const rules = src.passRules || {};
  return {
    enabled: src.enabled === undefined ? DEFAULT_CONFIG.enabled : !!src.enabled,
    timezone: isValidTimeZone(src.timezone) ? src.timezone : DEFAULT_CONFIG.timezone,
    dailyExp,
    milestones: {
      day7: normalizeMilestone(src.milestones?.day7, DEFAULT_CONFIG.milestones.day7),
      day14: normalizeMilestone(src.milestones?.day14, DEFAULT_CONFIG.milestones.day14),
    },
    luckyPass: {
      enabled: lucky.enabled === undefined ? DEFAULT_CONFIG.luckyPass.enabled : !!lucky.enabled,
      hours: clampInt(lucky.hours, { min: 1, max: 24 * 30, fallback: DEFAULT_CONFIG.luckyPass.hours }),
      dropProbabilityPercent: clampNumber(lucky.dropProbabilityPercent, {
        min: 0, max: 100, fallback: DEFAULT_CONFIG.luckyPass.dropProbabilityPercent,
      }),
      upgradeProbabilityPercent: clampNumber(lucky.upgradeProbabilityPercent, {
        min: 0, max: 100, fallback: DEFAULT_CONFIG.luckyPass.upgradeProbabilityPercent,
      }),
      minStreak: clampInt(lucky.minStreak, { min: 1, max: 100000, fallback: DEFAULT_CONFIG.luckyPass.minStreak }),
    },
    passRules: {
      excludeOriginals: !!rules.excludeOriginals,
      excludedBookIds: Array.isArray(rules.excludedBookIds)
        ? [...new Set(rules.excludedBookIds.map((n) => clampInt(n, { min: 1, max: Number.MAX_SAFE_INTEGER, fallback: 0 })).filter(Boolean))]
        : [],
    },
  };
}

async function getConfig({ fresh = false } = {}) {
  const now = Date.now();
  if (!fresh && cache && now - cacheAt < CACHE_MS) return cache;
  let stored = null;
  try {
    const [rows] = await pool.execute('SELECT config FROM checkin_config WHERE id = 1 LIMIT 1');
    stored = rows[0] ? parseJson(rows[0].config, null) : null;
  } catch (e) {
    if (!e || e.code !== 'ER_NO_SUCH_TABLE') throw e;
  }
  cache = normalizeConfig(stored);
  cacheAt = now;
  return cache;
}

async function updateConfig(patch, actor) {
  if (patch?.timezone !== undefined && !isValidTimeZone(patch.timezone)) {
    throw errors.badRequest(`Unknown timezone "${patch.timezone}" — use an IANA name such as Asia/Kolkata`);
  }
  const current = await getConfig({ fresh: true });
  const merged = normalizeConfig({
    ...current,
    ...(patch || {}),
    milestones: {
      day7: patch?.milestones?.day7 || current.milestones.day7,
      day14: patch?.milestones?.day14 || current.milestones.day14,
    },
    luckyPass: { ...current.luckyPass, ...(patch?.luckyPass || {}) },
    passRules: { ...current.passRules, ...(patch?.passRules || {}) },
  });
  await pool.execute(
    `INSERT INTO checkin_config (id, config, updated_by) VALUES (1, ?, ?)
     ON DUPLICATE KEY UPDATE config = VALUES(config), updated_by = VALUES(updated_by)`,
    [JSON.stringify(merged), actor?.id || null],
  );
  cache = merged;
  cacheAt = Date.now();
  return merged;
}

function invalidateCache() {
  cache = null;
  cacheAt = 0;
}

// ── campaigns ────────────────────────────────────────────────────────────────

// Campaign windows are compared with the database clock (NOW(), UTC); every
// instant is read back as epoch seconds so the API process timezone is irrelevant.
const SELECT_CAMPAIGN = `
  SELECT c.*, UNIX_TIMESTAMP(c.starts_at) AS starts_ts, UNIX_TIMESTAMP(c.ends_at) AS ends_ts,
         UNIX_TIMESTAMP(c.created_at) AS created_ts, UNIX_TIMESTAMP(c.updated_at) AS updated_ts,
         UNIX_TIMESTAMP() AS now_ts
    FROM checkin_campaigns c`;

function rowToCampaign(r) {
  const now = Number(r.now_ts);
  const starts = Number(r.starts_ts);
  const ends = Number(r.ends_ts);
  let state = 'scheduled';
  if (!Number(r.enabled)) state = 'disabled';
  else if (now > ends) state = 'ended';
  else if (now >= starts) state = 'active';
  return {
    id: r.id,
    name: r.name,
    description: r.description || '',
    startsAt: new Date(starts * 1000).toISOString(),
    endsAt: new Date(ends * 1000).toISOString(),
    enabled: Number(r.enabled) === 1,
    expMultiplier: Number(r.exp_multiplier) || 1,
    bonusCoins: Number(r.bonus_coins) || 0,
    novelPassHours: r.novel_pass_hours == null ? null : Number(r.novel_pass_hours),
    state,
    createdAt: new Date(Number(r.created_ts) * 1000).toISOString(),
    updatedAt: new Date(Number(r.updated_ts) * 1000).toISOString(),
  };
}

async function listCampaigns() {
  const [rows] = await pool.execute(`${SELECT_CAMPAIGN} ORDER BY c.starts_at DESC, c.id DESC LIMIT 200`);
  return rows.map((r) => rowToCampaign(r));
}

/** The campaign in effect right now (newest wins when windows overlap). */
async function activeCampaign(conn = pool) {
  try {
    const [rows] = await conn.execute(
      `${SELECT_CAMPAIGN}
        WHERE c.enabled = 1 AND c.starts_at <= NOW() AND c.ends_at >= NOW()
        ORDER BY c.created_at DESC, c.id DESC LIMIT 1`,
    );
    return rows[0] ? rowToCampaign(rows[0]) : null;
  } catch (e) {
    if (e && e.code === 'ER_NO_SUCH_TABLE') return null;
    throw e;
  }
}

// DATETIME columns hold UTC wall-clock time (the database runs on UTC).
function toMysqlDateTime(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw errors.badRequest('Invalid date');
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

async function createCampaign(body, actor) {
  const startsAt = toMysqlDateTime(body.startsAt);
  const endsAt = toMysqlDateTime(body.endsAt);
  if (new Date(body.endsAt) <= new Date(body.startsAt)) {
    throw errors.badRequest('Campaign must end after it starts');
  }
  const [r] = await pool.execute(
    `INSERT INTO checkin_campaigns
       (name, description, starts_at, ends_at, enabled, exp_multiplier, bonus_coins, novel_pass_hours, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      String(body.name).trim().slice(0, 160),
      body.description ? String(body.description).slice(0, 300) : null,
      startsAt,
      endsAt,
      body.enabled === false ? 0 : 1,
      clampNumber(body.expMultiplier, { min: 0.1, max: 10, fallback: 1 }),
      clampInt(body.bonusCoins, { min: 0, max: 100000, fallback: 0 }),
      body.novelPassHours == null ? null : clampInt(body.novelPassHours, { min: 1, max: 24 * 30, fallback: 12 }),
      actor?.id || null,
    ],
  );
  const [rows] = await pool.execute(`${SELECT_CAMPAIGN} WHERE c.id = ?`, [r.insertId]);
  return rowToCampaign(rows[0]);
}

async function updateCampaign(id, patch) {
  const [rows] = await pool.execute(`${SELECT_CAMPAIGN} WHERE c.id = ? LIMIT 1`, [id]);
  const row = rows[0];
  if (!row) throw errors.notFound('Campaign not found');

  const next = {
    name: patch.name !== undefined ? String(patch.name).trim().slice(0, 160) : row.name,
    description: patch.description !== undefined
      ? (patch.description ? String(patch.description).slice(0, 300) : null)
      : row.description,
    startsAt: patch.startsAt !== undefined ? patch.startsAt : new Date(Number(row.starts_ts) * 1000),
    endsAt: patch.endsAt !== undefined ? patch.endsAt : new Date(Number(row.ends_ts) * 1000),
    enabled: patch.enabled !== undefined ? (patch.enabled ? 1 : 0) : Number(row.enabled),
    expMultiplier: patch.expMultiplier !== undefined
      ? clampNumber(patch.expMultiplier, { min: 0.1, max: 10, fallback: 1 })
      : Number(row.exp_multiplier),
    bonusCoins: patch.bonusCoins !== undefined
      ? clampInt(patch.bonusCoins, { min: 0, max: 100000, fallback: 0 })
      : Number(row.bonus_coins),
    novelPassHours: patch.novelPassHours !== undefined
      ? (patch.novelPassHours == null ? null : clampInt(patch.novelPassHours, { min: 1, max: 24 * 30, fallback: 12 }))
      : row.novel_pass_hours,
  };
  if (new Date(next.endsAt) <= new Date(next.startsAt)) {
    throw errors.badRequest('Campaign must end after it starts');
  }
  await pool.execute(
    `UPDATE checkin_campaigns
        SET name = ?, description = ?, starts_at = ?, ends_at = ?, enabled = ?,
            exp_multiplier = ?, bonus_coins = ?, novel_pass_hours = ?
      WHERE id = ?`,
    [
      next.name, next.description, toMysqlDateTime(next.startsAt), toMysqlDateTime(next.endsAt),
      next.enabled, next.expMultiplier, next.bonusCoins, next.novelPassHours, id,
    ],
  );
  const [fresh] = await pool.execute(`${SELECT_CAMPAIGN} WHERE c.id = ?`, [id]);
  return rowToCampaign(fresh[0]);
}

async function deleteCampaign(id) {
  const [r] = await pool.execute('DELETE FROM checkin_campaigns WHERE id = ?', [id]);
  if (!r.affectedRows) throw errors.notFound('Campaign not found');
  return { ok: true };
}

module.exports = {
  DEFAULT_CONFIG,
  normalizeConfig,
  getConfig,
  updateConfig,
  invalidateCache,
  listCampaigns,
  activeCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
};
