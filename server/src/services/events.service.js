'use strict';

const pool = require('../db/pool');
const { withTransaction } = require('../db/tx');
const { errors } = require('../utils/HttpError');
const rules = require('./taskRules');
const {
  EVENT_CONDITIONS,
  EVENT_REWARD_TYPES,
  publicEventCatalog,
} = require('../constants/taskCatalog');
const notifications = require('./notifications.service');
const auditSvc = require('./audit.service');
const rewards = require('./rewards.service');

const CLAIM_GRACE_MS = 7 * 24 * 60 * 60 * 1000;

function parseJson(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch (_e) { return fallback; }
}

function slugify(raw) {
  const slug = String(raw || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  if (!slug) throw errors.badRequest('Event slug is required');
  return slug;
}

function activityCode(raw) {
  const code = String(raw || '')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
  if (!code) throw errors.badRequest('Activity code is required');
  return code;
}

function presentEvent(row, extra = {}) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    summary: row.summary || '',
    description: row.description || '',
    startsAt: new Date(row.starts_at).toISOString(),
    endsAt: new Date(row.ends_at).toISOString(),
    enabled: Number(row.enabled) === 1,
    promoted: Number(row.promoted) === 1,
    registered: !!extra.registered,
    registeredAt: extra.registeredAt || null,
    dismissed: !!extra.dismissed,
    ...extra.rest,
  };
}

function activityTarget(activity) {
  const params = parseJson(activity.params, {});
  if (activity.condition_key === 'read_minutes') return (Number(params.minutes) || 0) * 60;
  return Number(params.target) || 1;
}

function presentActivity(activity, progressRow) {
  const params = parseJson(activity.params, {});
  const rawTarget = activityTarget(activity);
  const rawProgress = Number(progressRow?.progress || 0);
  const completed = !!(progressRow && (progressRow.completed_at || rawProgress >= rawTarget));
  const minutes = activity.condition_key === 'read_minutes';
  const target = minutes ? (Number(params.minutes) || 0) : rawTarget;
  const current = completed
    ? target
    : (minutes ? Math.min(target, Math.floor(rawProgress / 60)) : Math.min(target, rawProgress));
  return {
    id: activity.id,
    code: activity.code,
    conditionKey: activity.condition_key,
    title: activity.title,
    description: activity.description || '',
    params,
    progress: current,
    target,
    progressLabel: `${current}/${target}`,
    completed,
    completedAt: progressRow?.completed_at || null,
    sortOrder: Number(activity.sort_order) || 0,
  };
}

function presentReward(reward, { claimable, claimed, claim }) {
  return {
    id: reward.id,
    code: reward.code,
    title: reward.title,
    description: reward.description || '',
    rewardType: reward.reward_type,
    payload: parseJson(reward.payload, {}),
    requires: parseJson(reward.requires_json, {}),
    claimable,
    claimed,
    claimedAt: claim?.claimed_at || null,
    sortOrder: Number(reward.sort_order) || 0,
  };
}

async function loadEvent(idOrSlug) {
  const numeric = Number(idOrSlug);
  const [rows] = Number.isInteger(numeric) && numeric > 0 && String(idOrSlug) === String(numeric)
    ? await pool.execute('SELECT * FROM platform_events WHERE id = ? LIMIT 1', [numeric])
    : await pool.execute('SELECT * FROM platform_events WHERE slug = ? LIMIT 1', [String(idOrSlug)]);
  return rows[0] || null;
}

async function childRows(eventId) {
  const [activities] = await pool.execute(
    'SELECT * FROM event_activities WHERE event_id = ? ORDER BY sort_order ASC, id ASC',
    [eventId],
  );
  const [rewards] = await pool.execute(
    'SELECT * FROM event_rewards WHERE event_id = ? ORDER BY sort_order ASC, id ASC',
    [eventId],
  );
  return { activities, rewardRows: rewards };
}

function windowFor(event, registeredAt) {
  const start = new Date(Math.max(new Date(event.starts_at).getTime(), new Date(registeredAt).getTime()));
  const end = new Date(event.ends_at);
  return { start, end };
}

async function metricsFor(userId, event, registeredAt) {
  const { start, end } = windowFor(event, registeredAt);
  const [chapters] = await pool.execute(
    `SELECT COUNT(*) AS c FROM reader_progress
      WHERE user_id = ? AND qualified_at IS NOT NULL AND qualified_at >= ? AND qualified_at <= ?`,
    [userId, start, end],
  );
  const [completions] = await pool.execute(
    `SELECT COUNT(*) AS c FROM novel_completions
      WHERE user_id = ? AND completed_at >= ? AND completed_at <= ?`,
    [userId, start, end],
  );
  const [seconds] = await pool.execute(
    `SELECT COALESCE(SUM(amount), 0) AS s FROM task_facts
      WHERE user_id = ? AND fact_type = 'reading_seconds' AND occurred_at >= ? AND occurred_at <= ?`,
    [userId, start, end],
  );
  const [arrivals] = await pool.execute(
    `SELECT book_id, SUM(amount) AS seconds FROM task_facts
      WHERE user_id = ? AND fact_type = 'reading_seconds' AND new_arrival = 1
        AND occurred_at >= ? AND occurred_at <= ?
      GROUP BY book_id`,
    [userId, start, end],
  );
  const [ratings] = await pool.execute(
    `SELECT COUNT(*) AS c FROM book_ratings
      WHERE user_id = ? AND new_arrival = 1 AND created_at >= ? AND created_at <= ?`,
    [userId, start, end],
  );
  const [reviewsNa] = await pool.execute(
    `SELECT COUNT(*) AS c FROM task_facts
      WHERE user_id = ? AND fact_type = 'review' AND new_arrival = 1
        AND occurred_at >= ? AND occurred_at <= ?`,
    [userId, start, end],
  );
  const [checkins] = await pool.execute(
    `SELECT COUNT(*) AS c FROM daily_checkins
      WHERE user_id = ? AND created_at >= ? AND created_at <= ?`,
    [userId, start, end],
  );
  const [comments] = await pool.execute(
    `SELECT COUNT(*) AS c FROM comments
      WHERE user_id = ? AND status = 'visible' AND created_at >= ? AND created_at <= ?
        AND CHAR_LENGTH(TRIM(body)) >= ?
        AND NOT (review_ratings IS NOT NULL AND parent_id IS NULL AND chapter_id IS NULL)`,
    [userId, start, end, rules.ELIGIBLE_COMMENT_CHARS],
  );
  const [reviews] = await pool.execute(
    `SELECT COUNT(*) AS c FROM comments
      WHERE user_id = ? AND status = 'visible' AND parent_id IS NULL AND chapter_id IS NULL
        AND review_ratings IS NOT NULL AND CHAR_LENGTH(TRIM(body)) >= ?
        AND created_at >= ? AND created_at <= ?`,
    [userId, rules.ELIGIBLE_REVIEW_CHARS, start, end],
  );
  return {
    chapters: Number(chapters[0].c || 0),
    completions: Number(completions[0].c || 0),
    readSeconds: Number(seconds[0].s || 0),
    newArrivalSeconds: arrivals.map((row) => Number(row.seconds) || 0),
    newArrivalRatings: Number(ratings[0].c || 0),
    newArrivalReviews: Number(reviewsNa[0].c || 0),
    checkins: Number(checkins[0].c || 0),
    comments: Number(comments[0].c || 0),
    reviews: Number(reviews[0].c || 0),
  };
}

function metricForActivity(activity, metrics) {
  const params = parseJson(activity.params, {});
  const target = activityTarget(activity);
  let raw = 0;
  switch (activity.condition_key) {
    case 'read_minutes':
      raw = metrics.readSeconds;
      break;
    case 'read_chapters':
      raw = metrics.chapters;
      break;
    case 'read_new_arrivals': {
      const need = (Number(params.minMinutes) || 5) * 60;
      raw = metrics.newArrivalSeconds.filter((seconds) => seconds >= need).length;
      break;
    }
    case 'review_new_arrivals':
      raw = metrics.newArrivalReviews;
      break;
    case 'rate_new_arrivals':
      raw = metrics.newArrivalRatings;
      break;
    case 'complete_novels':
      raw = metrics.completions;
      break;
    case 'checkins':
      raw = metrics.checkins;
      break;
    case 'comments':
      raw = metrics.comments;
      break;
    case 'reviews':
      raw = metrics.reviews;
      break;
    default:
      return null;
  }
  return { progress: Math.min(raw, target), target };
}

async function syncUser(userId) {
  if (!userId) return;
  const [events] = await pool.execute(
    `SELECT e.*, r.registered_at
       FROM platform_events e
       JOIN event_registrations r ON r.event_id = e.id AND r.user_id = ?
      WHERE e.enabled = 1 AND e.ends_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`,
    [userId],
  );
  for (const event of events) {
    if (new Date(event.starts_at).getTime() > Date.now()) continue;
    // eslint-disable-next-line no-await-in-loop
    const { activities } = await childRows(event.id);
    // eslint-disable-next-line no-await-in-loop
    const metrics = await metricsFor(userId, event, event.registered_at);
    // eslint-disable-next-line no-await-in-loop
    await withTransaction(async (conn) => {
      for (const activity of activities) {
        const metric = metricForActivity(activity, metrics);
        if (!metric) continue;
        // eslint-disable-next-line no-await-in-loop
        await conn.execute(
          `INSERT INTO event_activity_progress
             (event_id, activity_id, user_id, progress, target, completed_at)
           VALUES (?, ?, ?, ?, ?, IF(? >= ? AND ? > 0, NOW(), NULL))
           ON DUPLICATE KEY UPDATE
             progress = IF(completed_at IS NULL, VALUES(progress), GREATEST(progress, VALUES(progress))),
             target = VALUES(target),
             completed_at = IF(completed_at IS NULL AND VALUES(progress) >= VALUES(target) AND VALUES(target) > 0, NOW(), completed_at)`,
          [
            event.id, activity.id, userId, metric.progress, metric.target,
            metric.progress, metric.target, metric.target,
          ],
        );
      }
    });
  }
}

function requirementMet(reward, activities, progressRows) {
  const req = parseJson(reward.requires_json, {});
  const byId = new Map(progressRows.map((row) => [Number(row.activity_id), row]));
  const done = (activity) => {
    const row = byId.get(Number(activity.id));
    if (!row) return false;
    return !!row.completed_at || Number(row.progress) >= Number(row.target);
  };
  if (req.type === 'activity') {
    const activity = activities.find((row) => row.code === req.code);
    return !!(activity && done(activity));
  }
  if (req.type === 'all_activities') {
    return activities.length > 0 && activities.every(done);
  }
  return false;
}

async function detailFor(userId, idOrSlug) {
  const event = await loadEvent(idOrSlug);
  if (!event || (Number(event.enabled) !== 1 && !userId)) throw errors.notFound('Event not found');
  if (Number(event.enabled) !== 1) {
    const [regOnly] = await pool.execute(
      'SELECT 1 FROM event_registrations WHERE event_id = ? AND user_id = ? LIMIT 1',
      [event.id, userId],
    );
    if (!regOnly[0]) throw errors.notFound('Event not found');
  }
  await syncUser(userId);
  const { activities, rewardRows } = await childRows(event.id);
  const [reg] = await pool.execute(
    'SELECT registered_at FROM event_registrations WHERE event_id = ? AND user_id = ? LIMIT 1',
    [event.id, userId],
  );
  const [progress] = await pool.execute(
    'SELECT * FROM event_activity_progress WHERE event_id = ? AND user_id = ?',
    [event.id, userId],
  );
  const [claims] = await pool.execute(
    `SELECT c.* FROM event_reward_claims c
       JOIN event_rewards r ON r.id = c.reward_id
      WHERE r.event_id = ? AND c.user_id = ?`,
    [event.id, userId],
  );
  const claimByReward = new Map(claims.map((row) => [Number(row.reward_id), row]));
  const registered = !!reg[0];
  return {
    event: presentEvent(event, {
      registered,
      registeredAt: reg[0] ? new Date(reg[0].registered_at).toISOString() : null,
    }),
    activities: activities.map((activity) => presentActivity(
      activity,
      registered ? progress.find((row) => Number(row.activity_id) === Number(activity.id)) : null,
    )),
    rewards: rewardRows.map((reward) => {
      const claim = claimByReward.get(Number(reward.id)) || null;
      const claimable = registered && !claim && requirementMet(reward, activities, progress);
      return presentReward(reward, { claimable, claimed: !!claim, claim });
    }),
    tracking: 'Event progress is tracked separately from Daily, Weekly, and Monthly tasks, and only after you register.',
  };
}

async function listForUser(userId) {
  await syncUser(userId);
  const [rows] = await pool.execute(
    `SELECT e.*,
            (SELECT registered_at FROM event_registrations r WHERE r.event_id = e.id AND r.user_id = ?) AS registered_at,
            (SELECT 1 FROM event_dismissals d WHERE d.event_id = e.id AND d.user_id = ?) AS dismissed
       FROM platform_events e
      WHERE e.enabled = 1 AND e.ends_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      ORDER BY e.starts_at DESC`,
    [userId, userId],
  );
  const items = [];
  for (const row of rows) {
    // eslint-disable-next-line no-await-in-loop
    const [acts] = await pool.execute(
      'SELECT id FROM event_activities WHERE event_id = ?',
      [row.id],
    );
    // eslint-disable-next-line no-await-in-loop
    const [done] = await pool.execute(
      `SELECT COUNT(*) AS c FROM event_activity_progress
        WHERE event_id = ? AND user_id = ? AND completed_at IS NOT NULL`,
      [row.id, userId],
    );
    items.push(presentEvent(row, {
      registered: !!row.registered_at,
      registeredAt: row.registered_at ? new Date(row.registered_at).toISOString() : null,
      dismissed: !!row.dismissed,
      rest: {
        activityCount: acts.length,
        completedActivities: Number(done[0].c || 0),
      },
    }));
  }
  return { items };
}

async function promoted(userId) {
  const [rows] = await pool.execute(
    `SELECT e.*
       FROM platform_events e
      WHERE e.enabled = 1 AND e.promoted = 1
        AND e.starts_at <= NOW() AND e.ends_at >= NOW()
        AND NOT EXISTS (
          SELECT 1 FROM event_registrations r WHERE r.event_id = e.id AND r.user_id = ?
        )
        AND NOT EXISTS (
          SELECT 1 FROM event_dismissals d WHERE d.event_id = e.id AND d.user_id = ?
        )
      ORDER BY e.starts_at ASC
      LIMIT 3`,
    [userId, userId],
  );
  const items = [];
  for (const row of rows) {
    // eslint-disable-next-line no-await-in-loop
    const { activities, rewardRows } = await childRows(row.id);
    items.push({
      ...presentEvent(row, { registered: false }),
      activities: activities.map((activity) => presentActivity(activity, null)),
      rewards: rewardRows.map((reward) => presentReward(reward, { claimable: false, claimed: false, claim: null })),
    });
  }
  return { items };
}

async function register(userId, eventId) {
  const event = await loadEvent(eventId);
  if (!event || Number(event.enabled) !== 1) throw errors.notFound('Event not found');
  const now = Date.now();
  if (new Date(event.ends_at).getTime() < now) throw errors.badRequest('This event has ended');
  if (new Date(event.starts_at).getTime() > now) throw errors.badRequest('This event has not started');
  await pool.execute(
    'INSERT IGNORE INTO event_registrations (event_id, user_id) VALUES (?, ?)',
    [event.id, userId],
  );
  await pool.execute('DELETE FROM event_dismissals WHERE event_id = ? AND user_id = ?', [event.id, userId]);
  await syncUser(userId);
  await notifications.notifyEngagement(userId, {
    type: 'event',
    category: 'events',
    level: 'toast',
    eventType: 'event_registered',
    dedupeKey: `event:register:${event.id}:${userId}`,
    title: `You're in: ${event.name}`,
    body: 'Event progress starts now and is tracked separately from your usual tasks.',
    linkUrl: `/events/${event.id}`,
    metadata: { eventId: event.id },
  });
  return detailFor(userId, event.id);
}

async function dismiss(userId, eventId) {
  const event = await loadEvent(eventId);
  if (!event) throw errors.notFound('Event not found');
  await pool.execute(
    `INSERT INTO event_dismissals (event_id, user_id) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE dismissed_at = CURRENT_TIMESTAMP`,
    [event.id, userId],
  );
  return { id: event.id, dismissed: true };
}

async function ensureBadge(conn, payload) {
  const code = String(payload.code || '');
  if (!/^event_[a-z0-9_]{1,56}$/.test(code)) {
    throw errors.badRequest('Event badges must use a code starting with event_');
  }
  const [existing] = await conn.execute('SELECT code FROM achievements WHERE code = ? LIMIT 1', [code]);
  if (!existing[0]) {
    await conn.execute(
      `INSERT INTO achievements (code, title, description, icon, category, xp_reward)
       VALUES (?, ?, ?, ?, 'events', 0)`,
      [
        code,
        String(payload.title || 'Event badge').slice(0, 120),
        String(payload.description || 'Earned during a Novel Centre event.').slice(0, 500),
        payload.icon || 'emoji_events',
      ],
    );
  }
  return code;
}

async function grantReward(conn, userId, event, reward) {
  const payload = parseJson(reward.payload, {});
  const sourceRef = `event:${event.id}:reward:${reward.id}`;
  const type = reward.reward_type;
  if (type === 'EXP') {
    const exp = Number(payload.exp) || 0;
    if (exp > 0) {
      const profile = require('./profile.service');
      await profile.awardXp(userId, 'events', exp, { eventId: event.id, rewardId: reward.id }, conn);
    }
    return { type, exp };
  }
  if (type === 'COINS') {
    const issued = await rewards.issueReward(
      conn, userId,
      { type: 'COINS', amount: Number(payload.amount) || 0, label: reward.title },
      { source: 'event', sourceRef },
    );
    return { type, reward: issued };
  }
  if (type === 'CHAPTER_DISCOUNT' || type === 'BUNDLE_DISCOUNT' || type === 'NOVEL_PASS' || type === 'PLATFORM_WIDE_PASS') {
    const issued = await rewards.issueReward(
      conn, userId,
      { ...payload, type, label: reward.title },
      { source: 'event', sourceRef },
    );
    return { type, reward: issued };
  }
  if (type === 'BADGE') {
    const code = await ensureBadge(conn, payload);
    await conn.execute(
      `INSERT IGNORE INTO user_profile_unlocks (user_id, kind, unlock_key, label, source, source_ref)
       VALUES (?, 'badge', ?, ?, 'event', ?)`,
      [userId, code, payload.title || code, sourceRef],
    );
    return { type, badgeCode: code };
  }
  if (type === 'TITLE' || type === 'COSMETIC') {
    const kind = type === 'TITLE' ? 'title' : 'cosmetic';
    const column = type === 'TITLE' ? 'profile_title' : 'profile_cosmetic';
    await conn.execute(
      `INSERT IGNORE INTO user_profile_unlocks (user_id, kind, unlock_key, label, source, source_ref)
       VALUES (?, ?, ?, ?, 'event', ?)`,
      [userId, kind, payload.key, payload.label, sourceRef],
    );
    await conn.execute(`UPDATE users SET ${column} = ? WHERE id = ?`, [payload.label, userId]);
    return { type, label: payload.label };
  }
  throw errors.badRequest('Unsupported event reward');
}

async function claim(userId, eventId, rewardId) {
  await syncUser(userId);
  const outcome = await withTransaction(async (conn) => {
    const [reg] = await conn.execute(
      'SELECT registered_at FROM event_registrations WHERE event_id = ? AND user_id = ? LIMIT 1 FOR UPDATE',
      [eventId, userId],
    );
    if (!reg[0]) throw errors.forbidden('Register for this event before claiming rewards');
    const [ev] = await conn.execute('SELECT * FROM platform_events WHERE id = ? LIMIT 1', [eventId]);
    const event = ev[0];
    if (!event || Number(event.enabled) !== 1) throw errors.notFound('Event not found');
    if (Date.now() > new Date(event.ends_at).getTime() + CLAIM_GRACE_MS) {
      throw errors.badRequest('The claim window for this event has closed');
    }
    const [rewardRows] = await conn.execute(
      'SELECT * FROM event_rewards WHERE id = ? AND event_id = ? LIMIT 1',
      [rewardId, eventId],
    );
    const reward = rewardRows[0];
    if (!reward) throw errors.notFound('Reward not found');
    const [existing] = await conn.execute(
      'SELECT 1 FROM event_reward_claims WHERE reward_id = ? AND user_id = ? LIMIT 1',
      [reward.id, userId],
    );
    if (existing[0]) throw errors.conflict('This reward has already been claimed');
    const [activities] = await conn.execute('SELECT * FROM event_activities WHERE event_id = ?', [eventId]);
    const [progress] = await conn.execute(
      'SELECT * FROM event_activity_progress WHERE event_id = ? AND user_id = ?',
      [eventId, userId],
    );
    if (!requirementMet(reward, activities, progress)) {
      throw errors.badRequest('This reward is not ready to claim yet');
    }
    await conn.execute(
      'INSERT INTO event_reward_claims (reward_id, user_id, grant_ref) VALUES (?, ?, ?)',
      [reward.id, userId, `event:${event.id}:reward:${reward.id}`],
    );
    const granted = await grantReward(conn, userId, event, reward);
    return { event, reward, granted };
  });

  if (outcome.granted.badgeCode) {
    const profile = require('./profile.service');
    await profile.tryGrantAchievement(userId, outcome.granted.badgeCode, { silent: true });
  }
  const isMajor = ['PLATFORM_WIDE_PASS', 'BADGE', 'TITLE', 'COSMETIC', 'COINS'].includes(outcome.reward.reward_type)
    || outcome.reward.reward_type === 'EXP';
  const majorPass = outcome.reward.reward_type === 'PLATFORM_WIDE_PASS';
  await notifications.notifyEngagement(userId, {
    type: 'event',
    category: 'events',
    level: majorPass || outcome.granted.badgeCode ? 'celebration' : (isMajor ? 'toast' : 'center'),
    eventType: majorPass ? 'event_major_reward' : 'event_reward_claimed',
    dedupeKey: `event:claim:${outcome.reward.id}:${userId}`,
    title: `Reward claimed: ${outcome.reward.title}`,
    body: outcome.event.name,
    linkUrl: `/events/${outcome.event.id}`,
    metadata: {
      eventId: outcome.event.id,
      rewardId: outcome.reward.id,
      rewardType: outcome.reward.reward_type,
    },
  });
  if (outcome.granted.badgeCode) {
    await notifications.notifyEngagement(userId, {
      type: 'badge',
      category: 'achievements',
      level: 'center',
      eventType: 'achievement_unlocked',
      dedupeKey: `achievement:${outcome.granted.badgeCode}`,
      title: `Achievement unlocked`,
      body: outcome.granted.badgeCode.replace(/_/g, ' '),
      linkUrl: '/account?tab=achievements',
      metadata: { code: outcome.granted.badgeCode },
    });
  }
  const detail = await detailFor(userId, outcome.event.id);
  return { claim: outcome.granted, ...detail };
}

function validateRewardDraft(reward, index) {
  const type = reward.rewardType;
  if (!EVENT_REWARD_TYPES.includes(type)) {
    throw errors.badRequest(`Unsupported event reward type at reward ${index + 1}`);
  }
  const payload = reward.payload || {};
  const requires = reward.requires || { type: 'all_activities' };
  if (requires.type !== 'all_activities' && requires.type !== 'activity') {
    throw errors.badRequest('Reward requirement must be all activities or one activity');
  }
  if (requires.type === 'activity' && !requires.code) {
    throw errors.badRequest('Name the activity this reward requires');
  }
  let clean = {};
  if (type === 'COINS') {
    const amount = Number(payload.amount);
    if (!Number.isInteger(amount) || amount < 1 || amount > 100000) throw errors.badRequest('Coin rewards need an amount from 1 to 100000');
    clean = { amount };
  } else if (type === 'EXP') {
    const exp = Number(payload.exp);
    if (!Number.isInteger(exp) || exp < 1 || exp > 100000) throw errors.badRequest('EXP rewards need an amount from 1 to 100000');
    clean = { exp };
  } else if (type === 'CHAPTER_DISCOUNT' || type === 'BUNDLE_DISCOUNT') {
    const percent = Number(payload.percent);
    const maxDiscountCoins = Number(payload.maxDiscountCoins);
    const validDays = Number(payload.validDays || 30);
    if (!Number.isInteger(percent) || percent < 1 || percent > 100) throw errors.badRequest('Discount percent must be 1–100');
    if (!Number.isInteger(maxDiscountCoins) || maxDiscountCoins < 1) throw errors.badRequest('Discount cap is required');
    clean = { percent, maxDiscountCoins, validDays };
    if (type === 'BUNDLE_DISCOUNT') clean.bundleSize = Number(payload.bundleSize) || 5;
  } else if (type === 'NOVEL_PASS' || type === 'PLATFORM_WIDE_PASS') {
    const hours = Number(payload.hours);
    if (!Number.isInteger(hours) || hours < 1 || hours > 24 * 30) throw errors.badRequest('Pass length must be 1–720 hours');
    clean = { hours };
  } else if (type === 'BADGE') {
    const code = String(payload.code || '');
    if (!/^event_[a-z0-9_]{1,56}$/.test(code)) throw errors.badRequest('Badge code must start with event_');
    if (!payload.title) throw errors.badRequest('Badge title is required');
    clean = {
      code,
      title: String(payload.title).slice(0, 120),
      description: String(payload.description || '').slice(0, 500),
      icon: payload.icon || 'emoji_events',
    };
  } else if (type === 'TITLE' || type === 'COSMETIC') {
    const key = String(payload.key || '');
    if (!/^[a-z0-9_]{2,40}$/.test(key)) throw errors.badRequest('Title and cosmetic keys use lowercase letters, numbers, and underscores');
    if (!payload.label) throw errors.badRequest('A display label is required');
    clean = { key, label: String(payload.label).slice(0, 80) };
  }
  return {
    code: activityCode(reward.code || `${type.toLowerCase()}_${index + 1}`),
    title: String(reward.title || type).slice(0, 160),
    description: String(reward.description || '').slice(0, 300),
    rewardType: type,
    payload: clean,
    requires: requires.type === 'activity'
      ? { type: 'activity', code: activityCode(requires.code) }
      : { type: 'all_activities' },
    sortOrder: Number(reward.sortOrder) || (index + 1) * 10,
  };
}

function validateActivityDraft(activity, index) {
  const conditionKey = activity.conditionKey;
  if (!EVENT_CONDITIONS[conditionKey]) {
    throw errors.badRequest(`Unsupported event activity: ${conditionKey || '(none)'}`);
  }
  const params = rules.normalizeEventParams(conditionKey, activity.params || {});
  const title = String(activity.title || '').trim();
  if (!title) throw errors.badRequest('Activity title is required');
  return {
    code: activityCode(activity.code || conditionKey),
    conditionKey,
    params,
    title: title.slice(0, 160),
    description: String(activity.description || '').slice(0, 300),
    sortOrder: Number(activity.sortOrder) || (index + 1) * 10,
  };
}

function validateStructure(activities, rewards) {
  if (!Array.isArray(activities) || activities.length < 1 || activities.length > 12) {
    throw errors.badRequest('An event needs between 1 and 12 activities');
  }
  if (!Array.isArray(rewards) || rewards.length < 1 || rewards.length > 12) {
    throw errors.badRequest('An event needs between 1 and 12 rewards');
  }
  const cleanActivities = activities.map(validateActivityDraft);
  const codes = new Set(cleanActivities.map((row) => row.code));
  if (codes.size !== cleanActivities.length) throw errors.badRequest('Activity codes must be unique');
  const cleanRewards = rewards.map(validateRewardDraft);
  const rewardCodes = new Set(cleanRewards.map((row) => row.code));
  if (rewardCodes.size !== cleanRewards.length) throw errors.badRequest('Reward codes must be unique');
  for (const reward of cleanRewards) {
    if (reward.requires.type === 'activity' && !codes.has(reward.requires.code)) {
      throw errors.badRequest(`Reward “${reward.title}” refers to an unknown activity`);
    }
  }
  return { activities: cleanActivities, rewards: cleanRewards };
}

async function writeChildren(conn, eventId, activities, rewards) {
  await conn.execute('DELETE FROM event_rewards WHERE event_id = ?', [eventId]);
  await conn.execute('DELETE FROM event_activities WHERE event_id = ?', [eventId]);
  for (const activity of activities) {
    // eslint-disable-next-line no-await-in-loop
    await conn.execute(
      `INSERT INTO event_activities (event_id, code, condition_key, params, title, description, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [eventId, activity.code, activity.conditionKey, JSON.stringify(activity.params), activity.title, activity.description, activity.sortOrder],
    );
  }
  for (const reward of rewards) {
    // eslint-disable-next-line no-await-in-loop
    await conn.execute(
      `INSERT INTO event_rewards (event_id, code, title, description, reward_type, payload, requires_json, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [eventId, reward.code, reward.title, reward.description, reward.rewardType, JSON.stringify(reward.payload), JSON.stringify(reward.requires), reward.sortOrder],
    );
  }
}

async function adminList() {
  const [rows] = await pool.execute(
    `SELECT e.*,
            (SELECT COUNT(*) FROM event_registrations r WHERE r.event_id = e.id) AS registrations,
            (SELECT COUNT(*) FROM event_reward_claims c
               JOIN event_rewards rw ON rw.id = c.reward_id
              WHERE rw.event_id = e.id) AS claims
       FROM platform_events e
      ORDER BY e.starts_at DESC`,
  );
  const items = [];
  for (const row of rows) {
    // eslint-disable-next-line no-await-in-loop
    const children = await childRows(row.id);
    items.push({
      ...presentEvent(row),
      registrations: Number(row.registrations || 0),
      claims: Number(row.claims || 0),
      activities: children.activities.map((activity) => ({
        id: activity.id,
        code: activity.code,
        conditionKey: activity.condition_key,
        title: activity.title,
        description: activity.description || '',
        params: parseJson(activity.params, {}),
        sortOrder: Number(activity.sort_order) || 0,
      })),
      rewards: children.rewardRows.map((reward) => ({
        id: reward.id,
        code: reward.code,
        title: reward.title,
        description: reward.description || '',
        rewardType: reward.reward_type,
        payload: parseJson(reward.payload, {}),
        requires: parseJson(reward.requires_json, {}),
        sortOrder: Number(reward.sort_order) || 0,
      })),
    });
  }
  return { catalog: publicEventCatalog(), events: items };
}

async function createEvent(body, actor) {
  const name = String(body.name || '').trim();
  if (!name) throw errors.badRequest('Event name is required');
  if (!body.startsAt || !body.endsAt) throw errors.badRequest('Event start and end are required');
  if (new Date(body.startsAt).getTime() >= new Date(body.endsAt).getTime()) {
    throw errors.badRequest('The event end must be after the start');
  }
  const structure = validateStructure(body.activities, body.rewards);
  const slug = slugify(body.slug || name);
  const [dupe] = await pool.execute('SELECT id FROM platform_events WHERE slug = ? LIMIT 1', [slug]);
  if (dupe[0]) throw errors.conflict('An event with that slug already exists');
  const id = await withTransaction(async (conn) => {
    const [ins] = await conn.execute(
      `INSERT INTO platform_events (slug, name, summary, description, starts_at, ends_at, enabled, promoted, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        slug, name.slice(0, 160), String(body.summary || '').slice(0, 300), String(body.description || ''),
        new Date(body.startsAt), new Date(body.endsAt), body.enabled === false ? 0 : 1, body.promoted === false ? 0 : 1,
        actor?.id || null,
      ],
    );
    await writeChildren(conn, ins.insertId, structure.activities, structure.rewards);
    return ins.insertId;
  });
  if (actor) {
    await auditSvc.logAction({
      actor,
      action: 'event.create',
      targetType: 'event',
      targetId: id,
      summary: `Created event ${name}`,
      meta: { slug },
    });
  }
  const listed = await adminList();
  return listed.events.find((row) => Number(row.id) === Number(id));
}

async function updateEvent(id, body, actor) {
  const event = await loadEvent(id);
  if (!event) throw errors.notFound('Event not found');
  const [claims] = await pool.execute(
    `SELECT COUNT(*) AS c FROM event_reward_claims c
       JOIN event_rewards r ON r.id = c.reward_id
      WHERE r.event_id = ?`,
    [event.id],
  );
  const locked = Number(claims[0].c || 0) > 0;
  if (locked && (body.activities || body.rewards)) {
    throw errors.conflict('Activities and rewards stay put after someone has claimed a reward');
  }
  const name = body.name === undefined ? event.name : String(body.name || '').trim();
  if (!name) throw errors.badRequest('Event name is required');
  const startsAt = body.startsAt === undefined ? event.starts_at : new Date(body.startsAt);
  const endsAt = body.endsAt === undefined ? event.ends_at : new Date(body.endsAt);
  if (new Date(startsAt).getTime() >= new Date(endsAt).getTime()) {
    throw errors.badRequest('The event end must be after the start');
  }
  const structure = (body.activities || body.rewards)
    ? validateStructure(
      body.activities || (await childRows(event.id)).activities.map((row) => ({
        code: row.code,
        conditionKey: row.condition_key,
        params: parseJson(row.params, {}),
        title: row.title,
        description: row.description,
        sortOrder: row.sort_order,
      })),
      body.rewards || (await childRows(event.id)).rewardRows.map((row) => ({
        code: row.code,
        title: row.title,
        description: row.description,
        rewardType: row.reward_type,
        payload: parseJson(row.payload, {}),
        requires: parseJson(row.requires_json, {}),
        sortOrder: row.sort_order,
      })),
    )
    : null;
  await withTransaction(async (conn) => {
    await conn.execute(
      `UPDATE platform_events
          SET name = ?, summary = ?, description = ?, starts_at = ?, ends_at = ?, enabled = ?, promoted = ?
        WHERE id = ?`,
      [
        name.slice(0, 160),
        body.summary === undefined ? event.summary : String(body.summary || '').slice(0, 300),
        body.description === undefined ? event.description : String(body.description || ''),
        new Date(startsAt),
        new Date(endsAt),
        body.enabled === undefined ? event.enabled : (body.enabled ? 1 : 0),
        body.promoted === undefined ? event.promoted : (body.promoted ? 1 : 0),
        event.id,
      ],
    );
    if (structure) await writeChildren(conn, event.id, structure.activities, structure.rewards);
  });
  if (actor) {
    await auditSvc.logAction({
      actor,
      action: 'event.update',
      targetType: 'event',
      targetId: event.id,
      summary: `Updated event ${name}`,
    });
  }
  const listed = await adminList();
  return listed.events.find((row) => Number(row.id) === Number(event.id));
}

async function removeEvent(id, actor) {
  const event = await loadEvent(id);
  if (!event) throw errors.notFound('Event not found');
  const [regs] = await pool.execute(
    'SELECT COUNT(*) AS c FROM event_registrations WHERE event_id = ?',
    [event.id],
  );
  if (Number(regs[0].c || 0) > 0) {
    throw errors.conflict('Disable an event that already has participants instead of deleting it');
  }
  await pool.execute('DELETE FROM platform_events WHERE id = ?', [event.id]);
  if (actor) {
    await auditSvc.logAction({
      actor,
      action: 'event.delete',
      targetType: 'event',
      targetId: event.id,
      summary: `Deleted event ${event.name}`,
    });
  }
  return { id: event.id, deleted: true };
}

module.exports = {
  syncUser,
  listForUser,
  detailFor,
  promoted,
  register,
  dismiss,
  claim,
  adminList,
  createEvent,
  updateEvent,
  removeEvent,
  publicEventCatalog,
};
