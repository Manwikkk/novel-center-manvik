'use strict';

const pool = require('../db/pool');
const { withTransaction } = require('../db/tx');
const { errors } = require('../utils/HttpError');
const { calendarDate, isValidTimeZone } = require('../utils/calendarDay');
const { periodBounds } = require('./taskCalendar');
const rules = require('./taskRules');
const { publicCatalog, conditionDef } = require('../constants/taskCatalog');
const checkinConfig = require('./checkinConfig.service');
const notifications = require('./notifications.service');
const auditSvc = require('./audit.service');

const GROUPS = [
  {
    key: 'getting_started',
    frequency: 'once',
    label: 'Getting Started',
    description: 'One-time introductions to Novel Centre. They never reset.',
  },
  {
    key: 'daily',
    frequency: 'daily',
    label: 'Daily Tasks',
    description: 'Goals for today. They reset at midnight, platform time.',
  },
  {
    key: 'weekly',
    frequency: 'weekly',
    label: 'Weekly Tasks',
    description: 'Goals for this week, Monday through Sunday. Completed tasks stay checked until the week resets.',
  },
  {
    key: 'monthly',
    frequency: 'monthly',
    label: 'Monthly Tasks',
    description: 'Goals for this month. Completed tasks stay checked until the month resets.',
  },
];

function parseJson(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch (_e) { return fallback; }
}

let zoneCache = { at: 0, zone: 'Asia/Kolkata' };

async function platformZone() {
  if (Date.now() - zoneCache.at < 60_000) return zoneCache.zone;
  try {
    const cfg = await checkinConfig.getConfig();
    const zone = cfg?.timezone && isValidTimeZone(cfg.timezone) ? cfg.timezone : 'Asia/Kolkata';
    zoneCache = { at: Date.now(), zone };
    return zone;
  } catch (_e) {
    return zoneCache.zone;
  }
}

let defCache = { at: 0, rows: null };

function invalidateDefinitions() {
  defCache = { at: 0, rows: null };
}

function hydrateDef(row) {
  return {
    ...row,
    enabled: Number(row.enabled) === 1,
    system_task: Number(row.system_task) === 1,
    exp_reward: Number(row.exp_reward) || 0,
    sort_order: Number(row.sort_order) || 0,
    params: parseJson(row.params, {}),
  };
}

async function loadDefinitions({ fresh = false } = {}) {
  if (!fresh && defCache.rows && Date.now() - defCache.at < 15_000) return defCache.rows;
  const [rows] = await pool.execute(
    'SELECT * FROM task_definitions ORDER BY sort_order ASC, id ASC',
  );
  const hydrated = rows.map(hydrateDef);
  defCache = { at: Date.now(), rows: hydrated };
  return hydrated;
}

function isLive(def, now = new Date()) {
  if (!def.enabled) return false;
  if (def.starts_at && new Date(def.starts_at).getTime() > now.getTime()) return false;
  if (def.ends_at && new Date(def.ends_at).getTime() < now.getTime()) return false;
  return true;
}

async function countOf(sql, params) {
  const [rows] = await pool.execute(sql, params);
  return Number(rows[0]?.c || 0);
}

async function isNewArrival(bookId) {
  if (!bookId) return false;
  const [rows] = await pool.execute(
    "SELECT 1 FROM book_tags WHERE book_id = ? AND tag = 'new_arrivals' LIMIT 1",
    [bookId],
  );
  return !!rows[0];
}

async function chapterIsReadable(userId, chapterId) {
  const [rows] = await pool.execute(
    `SELECT c.id, c.book_id, c.status, c.is_paid, c.token_price, c.recycled_at,
            b.author_id, b.status AS book_status, b.recycled_at AS book_recycled,
            u.role, u.status AS user_status, u.suspension_restrictions
       FROM chapters c
       JOIN books b ON b.id = c.book_id
       JOIN users u ON u.id = ?
      WHERE c.id = ?
      LIMIT 1`,
    [userId, chapterId],
  );
  const row = rows[0];
  if (!row) return null;
  if (row.status !== 'published' || row.book_status !== 'published') return null;
  if (row.recycled_at || row.book_recycled) return null;
  const viewer = {
    id: Number(userId),
    role: row.role,
    status: row.user_status,
    suspension_restrictions: row.suspension_restrictions,
  };
  const { hasRestriction } = require('./suspension.service');
  if (hasRestriction(viewer, 'reading')) return null;
  if (viewer.role === 'admin' || viewer.role === 'staff') return row;
  if (Number(row.author_id) === Number(userId)) return row;
  const paid = !!row.is_paid && Number(row.token_price) > 0;
  if (!paid) return row;
  const [unlock] = await pool.execute(
    'SELECT 1 FROM chapter_unlocks WHERE user_id = ? AND chapter_id = ? LIMIT 1',
    [userId, chapterId],
  );
  if (unlock[0]) return row;
  const rewards = require('./rewards.service');
  const pass = await rewards.passCovering(userId, row.book_id);
  return pass ? row : null;
}

async function evaluateBookCompletion(userId, bookId) {
  const [chapters] = await pool.execute(
    `SELECT id, idx FROM chapters
      WHERE book_id = ? AND status = 'published' AND recycled_at IS NULL
      ORDER BY idx ASC, id ASC`,
    [bookId],
  );
  if (!chapters.length) return { ok: false, reason: 'no_chapters' };

  const [progress] = await pool.execute(
    `SELECT chapter_id, percent, qualified_at,
            DATE_FORMAT(qualified_day, '%Y-%m-%d') AS qualified_day
       FROM reader_progress
      WHERE user_id = ? AND book_id = ?`,
    [userId, bookId],
  );
  const progressById = {};
  const last = chapters[chapters.length - 1];
  let finalDay = null;
  for (const row of progress) {
    if (!row.qualified_at) continue;
    progressById[row.chapter_id] = Number(row.percent);
    if (Number(row.chapter_id) === Number(last.id)) finalDay = row.qualified_day || null;
  }
  const [secondsRows] = await pool.execute(
    `SELECT chapter_id, COALESCE(SUM(amount), 0) AS seconds
       FROM task_facts
      WHERE user_id = ? AND book_id = ? AND fact_type = 'reading_seconds'
      GROUP BY chapter_id`,
    [userId, bookId],
  );
  const secondsById = {};
  for (const row of secondsRows) secondsById[row.chapter_id] = Number(row.seconds) || 0;

  const verdict = rules.genuineCompletion(chapters, progressById, secondsById);
  if (!verdict.ok) return verdict;

  const zone = await platformZone();
  const completedDay = finalDay || calendarDate(zone);
  await pool.execute(
    `INSERT IGNORE INTO novel_completions
       (user_id, book_id, published_count, read_count, completed_day)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, bookId, verdict.publishedCount, verdict.readCount, completedDay],
  );
  return { ...verdict, completedDay };
}

async function reconcileCompletions(userId) {
  const [books] = await pool.execute(
    `SELECT DISTINCT rp.book_id
       FROM reader_progress rp
       JOIN chapters fin ON fin.book_id = rp.book_id
        AND fin.status = 'published' AND fin.recycled_at IS NULL
        AND fin.idx = (
          SELECT MAX(c.idx) FROM chapters c
           WHERE c.book_id = rp.book_id AND c.status = 'published' AND c.recycled_at IS NULL
        )
       JOIN reader_progress done
         ON done.user_id = rp.user_id AND done.chapter_id = fin.id AND done.qualified_at IS NOT NULL
       LEFT JOIN novel_completions nc ON nc.user_id = rp.user_id AND nc.book_id = rp.book_id
      WHERE rp.user_id = ? AND nc.book_id IS NULL
      LIMIT 20`,
    [userId],
  );
  for (const book of books) {
    // eslint-disable-next-line no-await-in-loop
    await evaluateBookCompletion(userId, book.book_id);
  }
}

async function loadSignals(userId, bounds) {
  const commentMin = rules.ELIGIBLE_COMMENT_CHARS;
  const reviewMin = rules.ELIGIBLE_REVIEW_CHARS;
  const [[life]] = await pool.execute(
    `SELECT
       (SELECT COUNT(*) FROM reader_progress WHERE user_id = ? AND qualified_at IS NOT NULL) AS chapters,
       (SELECT COUNT(*) FROM library WHERE user_id = ?) AS library_adds,
       (SELECT COUNT(*) FROM user_collections WHERE user_id = ?) AS collections,
       (SELECT COUNT(*) FROM daily_checkins WHERE user_id = ?) AS checkins,
       (SELECT COUNT(*) FROM user_achievements WHERE user_id = ?) AS achievements,
       (SELECT COUNT(*) FROM book_ratings WHERE user_id = ?) AS ratings,
       (SELECT COUNT(*) FROM novel_completions WHERE user_id = ?) AS completions,
       (SELECT COUNT(*) FROM comments
         WHERE user_id = ? AND status = 'visible' AND parent_id IS NULL AND chapter_id IS NULL
           AND review_ratings IS NOT NULL AND CHAR_LENGTH(TRIM(body)) >= ?) AS reviews,
       (SELECT COUNT(*) FROM comments
         WHERE user_id = ? AND status = 'visible'
           AND CHAR_LENGTH(TRIM(body)) >= ?
           AND NOT (review_ratings IS NOT NULL AND parent_id IS NULL AND chapter_id IS NULL)) AS comments`,
    [userId, userId, userId, userId, userId, userId, userId, userId, reviewMin, userId, commentMin],
  );
  const authorFollows = await countOf(
    `SELECT COUNT(*) AS c
       FROM user_follows f
       JOIN users u ON u.id = f.followee_id
      WHERE f.follower_id = ?
        AND (
          u.role = 'author'
          OR EXISTS (
            SELECT 1 FROM books b
             WHERE b.author_id = u.id AND b.status = 'published' AND b.recycled_at IS NULL
          )
        )`,
    [userId],
  );
  const [novelRows] = await pool.execute(
    `SELECT rp.book_id,
            COUNT(*) AS read_count,
            (SELECT COUNT(*) FROM chapters c
              WHERE c.book_id = rp.book_id AND c.status = 'published' AND c.recycled_at IS NULL) AS published_count,
            (SELECT COALESCE(SUM(tf.amount), 0) FROM task_facts tf
              WHERE tf.user_id = rp.user_id AND tf.book_id = rp.book_id AND tf.fact_type = 'reading_seconds') AS seconds
       FROM reader_progress rp
      WHERE rp.user_id = ? AND rp.qualified_at IS NOT NULL
      GROUP BY rp.book_id, rp.user_id`,
    [userId],
  );

  const periods = {};
  for (const frequency of ['daily', 'weekly', 'monthly']) {
    const window = bounds[frequency];
    // eslint-disable-next-line no-await-in-loop
    const chapters = await countOf(
      `SELECT COUNT(*) AS c FROM reader_progress
        WHERE user_id = ? AND qualified_day BETWEEN ? AND ?`,
      [userId, window.start, window.end],
    );
    // eslint-disable-next-line no-await-in-loop
    const completions = await countOf(
      `SELECT COUNT(*) AS c FROM novel_completions
        WHERE user_id = ? AND completed_day BETWEEN ? AND ?`,
      [userId, window.start, window.end],
    );
    // eslint-disable-next-line no-await-in-loop
    const [secRows] = await pool.execute(
      `SELECT COALESCE(SUM(amount), 0) AS s FROM task_facts
        WHERE user_id = ? AND fact_type = 'reading_seconds' AND day_key BETWEEN ? AND ?`,
      [userId, window.start, window.end],
    );
    // eslint-disable-next-line no-await-in-loop
    const [arrivalRows] = await pool.execute(
      `SELECT book_id, SUM(amount) AS seconds
         FROM task_facts
        WHERE user_id = ? AND fact_type = 'reading_seconds' AND new_arrival = 1
          AND day_key BETWEEN ? AND ?
        GROUP BY book_id`,
      [userId, window.start, window.end],
    );
    // eslint-disable-next-line no-await-in-loop
    const ratings = await countOf(
      `SELECT COUNT(*) AS c FROM book_ratings
        WHERE user_id = ? AND new_arrival = 1 AND rated_day BETWEEN ? AND ?`,
      [userId, window.start, window.end],
    );
    // eslint-disable-next-line no-await-in-loop
    const reviews = await countOf(
      `SELECT COUNT(*) AS c FROM task_facts
        WHERE user_id = ? AND fact_type = 'review' AND new_arrival = 1
          AND day_key BETWEEN ? AND ?`,
      [userId, window.start, window.end],
    );
    periods[frequency] = {
      chapters,
      completions,
      readSeconds: Number(secRows[0]?.s || 0),
      newArrivalSeconds: arrivalRows.map((row) => Number(row.seconds) || 0),
      newArrivalRatings: ratings,
      newArrivalReviews: reviews,
    };
  }

  return {
    life: {
      chapters: Number(life.chapters || 0),
      library: Number(life.library_adds || 0),
      collections: Number(life.collections || 0),
      checkins: Number(life.checkins || 0),
      achievements: Number(life.achievements || 0),
      ratings: Number(life.ratings || 0),
      completions: Number(life.completions || 0),
      reviews: Number(life.reviews || 0),
      comments: Number(life.comments || 0),
      authorFollows,
      firstNovel: rules.hasReadFirstNovel(novelRows.map((row) => ({
        readCount: Number(row.read_count || 0),
        publishedCount: Number(row.published_count || 0),
        seconds: Number(row.seconds || 0),
      }))),
    },
    periods,
  };
}

function metricFor(def, signals) {
  const params = def.params || {};
  const bucket = signals.periods[def.frequency] || null;
  const flag = (on) => ({ progress: on ? 1 : 0, target: 1, displayCurrent: on ? 1 : 0, displayTarget: 1 });
  switch (def.condition_key) {
    case 'gs_first_chapter': return flag(signals.life.chapters > 0);
    case 'gs_first_novel': return flag(signals.life.firstNovel);
    case 'gs_first_completion': return flag(signals.life.completions > 0);
    case 'gs_first_library': return flag(signals.life.library > 0);
    case 'gs_first_collection': return flag(signals.life.collections > 0);
    case 'gs_first_follow': return flag(signals.life.authorFollows > 0);
    case 'gs_first_rating': return flag(signals.life.ratings > 0);
    case 'gs_first_comment': return flag(signals.life.comments > 0);
    case 'gs_first_review': return flag(signals.life.reviews > 0);
    case 'gs_first_checkin': return flag(signals.life.checkins > 0);
    case 'gs_first_achievement': return flag(signals.life.achievements > 0);
    case 'read_minutes': {
      const minutes = Number(params.minutes) || 0;
      const target = minutes * 60;
      const progress = Math.min(bucket.readSeconds, target);
      return {
        progress,
        target,
        displayCurrent: Math.min(minutes, Math.floor(bucket.readSeconds / 60)),
        displayTarget: minutes,
      };
    }
    case 'read_new_arrival': {
      const need = (Number(params.minMinutes) || 5) * 60;
      const hit = bucket.newArrivalSeconds.some((seconds) => seconds >= need);
      return flag(hit);
    }
    case 'read_new_arrivals': {
      const need = (Number(params.minMinutes) || 5) * 60;
      const count = bucket.newArrivalSeconds.filter((seconds) => seconds >= need).length;
      const target = Number(params.target) || 1;
      return {
        progress: Math.min(count, target),
        target,
        displayCurrent: Math.min(count, target),
        displayTarget: target,
      };
    }
    case 'read_chapters':
    case 'review_new_arrival':
    case 'review_new_arrivals':
    case 'rate_new_arrivals':
    case 'complete_novels': {
      const target = Number(params.target) || 1;
      const raw = {
        read_chapters: bucket.chapters,
        review_new_arrival: bucket.newArrivalReviews,
        review_new_arrivals: bucket.newArrivalReviews,
        rate_new_arrivals: bucket.newArrivalRatings,
        complete_novels: bucket.completions,
      }[def.condition_key] || 0;
      const progress = Math.min(raw, target);
      return { progress, target, displayCurrent: progress, displayTarget: target };
    }
    default:
      return null;
  }
}

async function persistAll(userId, items) {
  if (!items.length) return [];
  const awarded = [];
  await withTransaction(async (conn) => {
    for (const item of items) {
      rules.assertTaskRewardExpOnly({
        exp: item.def.exp_reward,
        params: item.def.params,
      });
      const exp = rules.assertExpAmount(item.def.exp_reward);
      // eslint-disable-next-line no-await-in-loop
      await conn.execute(
        `INSERT INTO user_task_progress
           (user_id, task_id, period_key, progress, target, completed_at, exp_awarded, rewarded)
         VALUES (?, ?, ?, ?, ?, IF(? >= ? AND ? > 0, NOW(), NULL), 0, 0)
         ON DUPLICATE KEY UPDATE
           progress = IF(rewarded = 0, VALUES(progress), GREATEST(progress, VALUES(progress))),
           target = VALUES(target),
           completed_at = IF(completed_at IS NULL AND VALUES(progress) >= VALUES(target) AND VALUES(target) > 0, NOW(), completed_at)`,
        [
          userId, item.def.id, item.periodKey, item.progress, item.target,
          item.progress, item.target, item.target,
        ],
      );
      // eslint-disable-next-line no-await-in-loop
      const [rows] = await conn.execute(
        `SELECT completed_at, rewarded FROM user_task_progress
          WHERE user_id = ? AND task_id = ? AND period_key = ?
          FOR UPDATE`,
        [userId, item.def.id, item.periodKey],
      );
      const row = rows[0];
      if (!row || !row.completed_at || Number(row.rewarded) === 1) continue;
      // eslint-disable-next-line no-await-in-loop
      const [upd] = await conn.execute(
        `UPDATE user_task_progress
            SET rewarded = 1, exp_awarded = ?
          WHERE user_id = ? AND task_id = ? AND period_key = ? AND rewarded = 0`,
        [exp, userId, item.def.id, item.periodKey],
      );
      if (upd.affectedRows !== 1) continue;
      if (exp > 0) {
        const profile = require('./profile.service');
        // eslint-disable-next-line no-await-in-loop
        await profile.awardXp(userId, 'tasks', exp, {
          taskId: item.def.id,
          code: item.def.code,
          periodKey: item.periodKey,
          title: item.def.title,
        }, conn);
      }
      awarded.push({
        taskId: item.def.id,
        code: item.def.code,
        title: item.def.title,
        exp,
        periodKey: item.periodKey,
      });
    }
  });
  return awarded;
}

async function ingest(userId, { reconcile = false } = {}) {
  if (!userId) return [];
  if (reconcile) await reconcileCompletions(userId);
  const zone = await platformZone();
  const now = new Date();
  const bounds = {
    once: periodBounds('once', zone, now),
    daily: periodBounds('daily', zone, now),
    weekly: periodBounds('weekly', zone, now),
    monthly: periodBounds('monthly', zone, now),
  };
  const defs = (await loadDefinitions()).filter((def) => isLive(def, now));
  const signals = await loadSignals(userId, bounds);
  const items = [];
  for (const def of defs) {
    const metric = metricFor(def, signals);
    if (!metric) continue;
    items.push({ def, periodKey: bounds[def.frequency].key, ...metric });
  }
  const awarded = await persistAll(userId, items);
  try {
    const events = require('./events.service');
    await events.syncUser(userId);
  } catch (err) {
    console.error('[events] sync', err && err.message ? err.message : err);
  }
  for (const item of awarded) {
    // eslint-disable-next-line no-await-in-loop
    await notifications.notify(userId, {
      type: 'task',
      title: `${item.title} complete`,
      body: item.exp > 0 ? `+${item.exp} EXP added to your reader level.` : 'Marked complete.',
      linkUrl: '/tasks',
    });
  }
  return awarded;
}

async function safeIngest(userId, options) {
  try {
    return await ingest(userId, options);
  } catch (err) {
    console.error('[tasks]', err && err.message ? err.message : err);
    return [];
  }
}

function presentTask(def, stored) {
  const metricTarget = def.condition_key === 'read_minutes'
    ? Number(def.params.minutes) || 0
    : (def.condition_key.startsWith('gs_') || def.condition_key === 'read_new_arrival'
      ? 1
      : Number(def.params.target) || Number(stored?.target) || 1);
  const completed = !!(stored && stored.completed_at);
  let current;
  if (completed) current = metricTarget;
  else if (def.condition_key === 'read_minutes') {
    current = Math.min(metricTarget, Math.floor((Number(stored?.progress) || 0) / 60));
  } else {
    current = Math.min(metricTarget, Number(stored?.progress) || 0);
  }
  return {
    id: def.id,
    code: def.code,
    title: def.title,
    description: def.description,
    frequency: def.frequency,
    conditionKey: def.condition_key,
    expReward: def.exp_reward,
    progress: current,
    target: metricTarget,
    progressLabel: `${current}/${metricTarget}`,
    completed,
    completedAt: stored?.completed_at || null,
    sortOrder: def.sort_order,
  };
}

async function getBoard(userId) {
  await ingest(userId, { reconcile: true });
  const zone = await platformZone();
  const now = new Date();
  const bounds = {
    once: periodBounds('once', zone, now),
    daily: periodBounds('daily', zone, now),
    weekly: periodBounds('weekly', zone, now),
    monthly: periodBounds('monthly', zone, now),
  };
  const defs = (await loadDefinitions()).filter((def) => isLive(def, now));
  const progressByTask = new Map();
  if (defs.length) {
    const clause = defs.map(() => '(task_id = ? AND period_key = ?)').join(' OR ');
    const params = [userId];
    for (const def of defs) params.push(def.id, bounds[def.frequency].key);
    const [rows] = await pool.execute(
      `SELECT task_id, period_key, progress, target, completed_at, exp_awarded, rewarded
         FROM user_task_progress
        WHERE user_id = ? AND (${clause})`,
      params,
    );
    for (const row of rows) progressByTask.set(Number(row.task_id), row);
  }

  const groups = GROUPS.map((group) => {
    const tasks = rules.sortTasksForDisplay(
      defs
        .filter((def) => def.frequency === group.frequency)
        .map((def) => presentTask(def, progressByTask.get(Number(def.id)))),
    );
    const window = bounds[group.frequency];
    return {
      key: group.key,
      label: group.label,
      description: group.description,
      periodKey: window.key,
      resetsAt: window.resetsAt ? window.resetsAt.toISOString() : null,
      tasks,
    };
  });

  return {
    timezone: zone,
    note: 'Daily Check-In and Achievements are separate. Check-In is claimed on its own page. Achievements stay on your profile.',
    groups,
  };
}

async function markChapterQualified(userId, chapterId) {
  const readable = await chapterIsReadable(userId, chapterId);
  if (!readable) return false;
  const zone = await platformZone();
  const day = calendarDate(zone);
  const [result] = await pool.execute(
    `UPDATE reader_progress
        SET qualified_at = NOW(), qualified_day = ?
      WHERE user_id = ? AND chapter_id = ? AND percent >= ? AND qualified_at IS NULL`,
    [day, userId, chapterId, rules.MEANINGFUL_PERCENT],
  );
  if (!result.affectedRows) return false;
  await evaluateBookCompletion(userId, readable.book_id);
  await ingest(userId);
  return true;
}

async function recordReadingSeconds(userId, chapterId, seconds) {
  const amount = Math.max(0, Math.floor(Number(seconds) || 0));
  if (!amount) return { creditedSeconds: 0 };
  const readable = await chapterIsReadable(userId, chapterId);
  if (!readable) return { creditedSeconds: 0 };
  const zone = await platformZone();
  const day = calendarDate(zone);
  const arrival = await isNewArrival(readable.book_id);
  // One row per credit. A daily aggregate would move occurred_at forward and
  // pull pre-registration seconds into an event the reader joined later.
  await pool.execute(
    `INSERT INTO task_facts
       (user_id, fact_type, fact_key, book_id, chapter_id, amount, new_arrival, occurred_at, day_key)
     VALUES (?, 'reading_seconds', ?, ?, ?, ?, ?, NOW(), ?)`,
    [
      userId,
      `sec:${chapterId}:${day}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
      readable.book_id,
      chapterId,
      amount,
      arrival ? 1 : 0,
      day,
    ],
  );
  await evaluateBookCompletion(userId, readable.book_id);
  await ingest(userId);
  return { creditedSeconds: amount };
}

async function recordReview(userId, { commentId, bookId }) {
  const zone = await platformZone();
  const day = calendarDate(zone);
  const arrival = await isNewArrival(bookId);
  await pool.execute(
    `INSERT IGNORE INTO task_facts
       (user_id, fact_type, fact_key, book_id, amount, new_arrival, occurred_at, day_key)
     VALUES (?, 'review', ?, ?, 1, ?, NOW(), ?)`,
    [userId, `review:${commentId}`, bookId, arrival ? 1 : 0, day],
  );
  await ingest(userId);
}

function slugCode(raw) {
  const code = String(raw || '')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
  if (!code) throw errors.badRequest('Task code is required');
  return code;
}

function serializeAdmin(def) {
  return {
    id: def.id,
    code: def.code,
    title: def.title,
    description: def.description,
    frequency: def.frequency,
    conditionKey: def.condition_key,
    params: def.params,
    expReward: def.exp_reward,
    enabled: def.enabled,
    system: def.system_task,
    sortOrder: def.sort_order,
    startsAt: def.starts_at ? new Date(def.starts_at).toISOString() : null,
    endsAt: def.ends_at ? new Date(def.ends_at).toISOString() : null,
    updatedAt: def.updated_at || null,
  };
}

async function listAdmin() {
  const rows = await loadDefinitions({ fresh: true });
  return {
    timezone: await platformZone(),
    conditions: publicCatalog(),
    tasks: rows.map(serializeAdmin),
  };
}

function scheduleOf(body, current) {
  const startsAt = body.startsAt === undefined ? (current?.starts_at || null) : (body.startsAt || null);
  const endsAt = body.endsAt === undefined ? (current?.ends_at || null) : (body.endsAt || null);
  if (startsAt && endsAt && new Date(startsAt).getTime() >= new Date(endsAt).getTime()) {
    throw errors.badRequest('The schedule end must be after the start');
  }
  return { startsAt, endsAt };
}

async function createTask(body, actor) {
  const conditionKey = body.conditionKey;
  const frequency = body.frequency;
  rules.assertTaskConfigurable(conditionKey, frequency);
  const params = rules.normalizeTaskParams(conditionKey, body.params || {});
  const exp = rules.assertExpAmount(body.expReward);
  rules.assertTaskRewardExpOnly({ exp, params, coins: body.coins, rewardType: body.rewardType });
  const title = String(body.title || '').trim();
  if (!title) throw errors.badRequest('Title is required');
  const description = String(body.description || conditionDef(conditionKey)?.label || title).trim();
  const enabled = body.enabled !== false;
  const { startsAt, endsAt } = scheduleOf(body, null);
  const code = slugCode(body.code || `${frequency}_${conditionKey}`);
  const existing = await loadDefinitions({ fresh: true });
  if (existing.some((row) => row.code === code)) throw errors.conflict('A task with that code already exists');
  rules.assertNoReadMinutesConflict(existing, {
    conditionKey, frequency, enabled, startsAt, endsAt, title,
  });
  const [ins] = await pool.execute(
    `INSERT INTO task_definitions
       (code, title, description, frequency, condition_key, params, exp_reward, enabled, system_task, sort_order, starts_at, ends_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
    [
      code, title.slice(0, 160), description.slice(0, 400), frequency, conditionKey,
      JSON.stringify(params), exp, enabled ? 1 : 0, Number(body.sortOrder) || 0, startsAt, endsAt,
    ],
  );
  invalidateDefinitions();
  if (actor) {
    await auditSvc.logAction({
      actor,
      action: 'task.create',
      targetType: 'task',
      targetId: ins.insertId,
      summary: `Created ${frequency} task ${title} (${exp} EXP)`,
      meta: { code, conditionKey, exp },
    });
  }
  const created = (await loadDefinitions({ fresh: true })).find((row) => Number(row.id) === Number(ins.insertId));
  return serializeAdmin(created);
}

async function updateTask(id, body, actor) {
  const rows = await loadDefinitions({ fresh: true });
  const current = rows.find((row) => Number(row.id) === Number(id));
  if (!current) throw errors.notFound('Task not found');
  if (body.conditionKey && body.conditionKey !== current.condition_key) {
    throw errors.badRequest('The task condition cannot be changed. Create a new task instead.');
  }
  if (body.frequency && body.frequency !== current.frequency) {
    throw errors.badRequest('The task frequency cannot be changed. Create a new task instead.');
  }
  if (body.coins != null || body.rewardType === 'COINS') {
    rules.assertTaskRewardExpOnly(body);
  }
  const exp = body.expReward === undefined ? current.exp_reward : rules.assertExpAmount(body.expReward);
  let params = current.params;
  if (!current.system_task && body.params) {
    params = rules.normalizeTaskParams(current.condition_key, body.params);
  } else if (current.system_task && body.params && Object.keys(body.params).length) {
    throw errors.badRequest('Getting Started tasks have no configurable requirement');
  }
  rules.assertTaskRewardExpOnly({ exp, params });
  const title = body.title === undefined ? current.title : String(body.title || '').trim();
  if (!title) throw errors.badRequest('Title is required');
  const description = body.description === undefined ? current.description : String(body.description || '').trim();
  const enabled = body.enabled === undefined ? current.enabled : !!body.enabled;
  const sortOrder = body.sortOrder === undefined ? current.sort_order : Number(body.sortOrder) || 0;
  const { startsAt, endsAt } = scheduleOf(body, current);
  rules.assertNoReadMinutesConflict(rows, {
    id: current.id,
    conditionKey: current.condition_key,
    frequency: current.frequency,
    enabled,
    startsAt,
    endsAt,
    title,
  });
  await pool.execute(
    `UPDATE task_definitions
        SET title = ?, description = ?, params = ?, exp_reward = ?, enabled = ?, sort_order = ?, starts_at = ?, ends_at = ?
      WHERE id = ?`,
    [
      title.slice(0, 160), description.slice(0, 400), JSON.stringify(params), exp,
      enabled ? 1 : 0, sortOrder, startsAt, endsAt, current.id,
    ],
  );
  invalidateDefinitions();
  if (actor) {
    await auditSvc.logAction({
      actor,
      action: 'task.update',
      targetType: 'task',
      targetId: current.id,
      summary: `Updated task ${title} (${exp} EXP, ${enabled ? 'enabled' : 'disabled'})`,
      meta: { code: current.code, exp, enabled },
    });
  }
  const updated = (await loadDefinitions({ fresh: true })).find((row) => Number(row.id) === Number(current.id));
  return serializeAdmin(updated);
}

async function removeTask(id, actor) {
  const rows = await loadDefinitions({ fresh: true });
  const current = rows.find((row) => Number(row.id) === Number(id));
  if (!current) throw errors.notFound('Task not found');
  if (current.system_task) throw errors.badRequest('Getting Started tasks can be disabled, not deleted');
  await pool.execute('DELETE FROM task_definitions WHERE id = ?', [current.id]);
  invalidateDefinitions();
  if (actor) {
    await auditSvc.logAction({
      actor,
      action: 'task.delete',
      targetType: 'task',
      targetId: current.id,
      summary: `Removed task ${current.title}`,
      meta: { code: current.code },
    });
  }
  return { id: current.id, deleted: true };
}

module.exports = {
  GROUPS,
  platformZone,
  chapterIsReadable,
  invalidateDefinitions,
  getBoard,
  ingest,
  safeIngest,
  markChapterQualified,
  recordReadingSeconds,
  recordReview,
  listAdmin,
  createTask,
  updateTask,
  removeTask,
  publicCatalog,
};
