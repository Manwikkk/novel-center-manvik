'use strict';

const { errors } = require('../utils/HttpError');
const { TASK_CONDITIONS, EVENT_CONDITIONS } = require('../constants/taskCatalog');

/** A chapter counts as read once the reader has moved this far through it. */
const MEANINGFUL_PERCENT = 80;
/** Share of published chapters that must be read before a novel is complete. */
const COMPLETION_COVERAGE = 0.8;
/**
 * A one-chapter novel has no earlier chapter to skip. Opening the only
 * chapter is not enough — the reader must actually spend time in it.
 */
const SINGLE_CHAPTER_MIN_SECONDS = 180;
/** "Read a novel" is more than a single chapter, short of full completion. */
const FIRST_NOVEL_MIN_CHAPTERS = 2;
const FIRST_NOVEL_SINGLE_CHAPTER_SECONDS = 600;
const ELIGIBLE_COMMENT_CHARS = 10;
const ELIGIBLE_REVIEW_CHARS = 40;

function isEnabledFlag(value) {
  return value === true || value === 1 || value === '1';
}

function availabilityWindow(task) {
  const start = task.startsAt || task.starts_at || null;
  const end = task.endsAt || task.ends_at || null;
  const startMs = start ? new Date(start).getTime() : Number.NEGATIVE_INFINITY;
  const endMs = end ? new Date(end).getTime() : Number.POSITIVE_INFINITY;
  return {
    start: Number.isFinite(startMs) ? startMs : Number.NEGATIVE_INFINITY,
    end: Number.isFinite(endMs) ? endMs : Number.POSITIVE_INFINITY,
  };
}

function windowsOverlap(a, b) {
  const wa = availabilityWindow(a);
  const wb = availabilityWindow(b);
  return wa.start <= wb.end && wb.start <= wa.end;
}

function conditionKeyOf(task) {
  return task.conditionKey || task.condition_key || null;
}

/**
 * Daily 10 / 20 / 30 / 60 minute goals are alternative difficulties.
 * Two enabled ones whose schedules overlap cannot both be shown.
 */
function findReadMinutesConflict(existing, candidate) {
  if (conditionKeyOf(candidate) !== 'read_minutes') return null;
  if ((candidate.frequency || 'daily') !== 'daily') return null;
  if (!isEnabledFlag(candidate.enabled)) return null;
  const candidateId = candidate.id == null ? null : Number(candidate.id);
  return (existing || []).find((task) => {
    if (candidateId != null && Number(task.id) === candidateId) return false;
    if (conditionKeyOf(task) !== 'read_minutes') return false;
    if (task.frequency !== 'daily') return false;
    if (!isEnabledFlag(task.enabled)) return false;
    return windowsOverlap(task, candidate);
  }) || null;
}

function assertNoReadMinutesConflict(existing, candidate) {
  const clash = findReadMinutesConflict(existing, candidate);
  if (!clash) return;
  const err = errors.badRequest(
    'Only one daily reading-duration task can be active at a time. '
    + 'The 10, 20, 30, and 60 minute goals are alternative difficulties, not a stack. '
    + `Disable “${clash.title || clash.code || 'the other reading task'}” or separate their schedules.`,
  );
  err.code = 'READ_MINUTES_CONFLICT';
  throw err;
}

/**
 * Task rewards are EXP only. Coins are a purchased currency and must never
 * be issued from Getting Started, Daily, Weekly, or Monthly tasks.
 */
function assertTaskRewardExpOnly(reward) {
  if (reward == null) return;
  const type = String(reward.type || reward.rewardType || reward.reward_type || '').toUpperCase();
  const coins = Number(reward.coins ?? reward.coinAmount ?? reward.coin_amount ?? 0);
  const params = reward.params && typeof reward.params === 'object' ? reward.params : null;
  const paramCoins = params
    ? Number(params.coins ?? params.coinAmount ?? params.coin_amount ?? 0)
    : 0;
  if (type === 'COINS' || coins > 0 || paramCoins > 0) {
    throw errors.badRequest('Task rewards cannot include coins');
  }
}

function assertExpAmount(exp) {
  assertTaskRewardExpOnly({ exp });
  const n = Number(exp);
  if (!Number.isInteger(n) || n < 0 || n > 100000) {
    throw errors.badRequest('EXP reward must be a whole number from 0 to 100000');
  }
  return n;
}

function normalizeParams(catalog, conditionKey, raw, { allowEmpty = false } = {}) {
  const spec = catalog[conditionKey];
  if (!spec) throw errors.badRequest(`Unsupported task condition: ${conditionKey || '(none)'}`);
  const input = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  if (allowEmpty && Object.keys(input).length === 0 && Object.keys(spec.params || {}).length === 0) {
    return {};
  }
  const unknown = Object.keys(input).filter((key) => !spec.params || !spec.params[key]);
  if (unknown.length) {
    throw errors.badRequest(`Unsupported parameter for ${conditionKey}: ${unknown.join(', ')}`);
  }
  const out = {};
  for (const [key, rule] of Object.entries(spec.params || {})) {
    let value = input[key];
    if (value == null || value === '') value = rule.default;
    if (rule.type === 'enum') {
      value = Number(value);
      if (!rule.values.includes(value)) {
        throw errors.badRequest(`${key} must be one of ${rule.values.join(', ')}`);
      }
    } else if (rule.type === 'int') {
      value = Number(value);
      if (!Number.isInteger(value) || value < rule.min || value > rule.max) {
        throw errors.badRequest(`${key} must be an integer from ${rule.min} to ${rule.max}`);
      }
    } else {
      throw errors.badRequest(`Unknown parameter rule for ${key}`);
    }
    out[key] = value;
  }
  assertTaskRewardExpOnly({ params: input });
  return out;
}

function normalizeTaskParams(conditionKey, raw) {
  return normalizeParams(TASK_CONDITIONS, conditionKey, raw);
}

function normalizeEventParams(conditionKey, raw) {
  return normalizeParams(EVENT_CONDITIONS, conditionKey, raw);
}

function assertTaskConfigurable(conditionKey, frequency) {
  const spec = TASK_CONDITIONS[conditionKey];
  if (!spec) throw errors.badRequest(`Unsupported task condition: ${conditionKey || '(none)'}`);
  if (spec.system) {
    throw errors.badRequest('Getting Started tasks are fixed. Edit the EXP reward instead of creating a new one.');
  }
  if (!spec.frequencies.includes(frequency)) {
    throw errors.badRequest(
      `${spec.label} cannot be a ${frequency} task. Allowed: ${spec.frequencies.join(', ')}.`,
    );
  }
}

function textLength(body) {
  return String(body || '').trim().length;
}

function isEligibleReview({ body, reviewRatings, chapterId = null, parentId = null, status = 'visible' } = {}) {
  if (status && status !== 'visible') return false;
  if (!reviewRatings) return false;
  if (chapterId) return false;
  if (parentId) return false;
  return textLength(body) >= ELIGIBLE_REVIEW_CHARS;
}

function isEligibleComment({ body, reviewRatings, chapterId = null, parentId = null, status = 'visible' } = {}) {
  if (status && status !== 'visible') return false;
  if (isEligibleReview({ body, reviewRatings, chapterId, parentId, status })) return false;
  if (reviewRatings && !chapterId && !parentId) return false;
  return textLength(body) >= ELIGIBLE_COMMENT_CHARS;
}

function isChapterRead(percent) {
  return Number(percent) >= MEANINGFUL_PERCENT;
}

/**
 * Genuine novel completion.
 *
 * published: [{ id, idx }]
 * progressById: { [chapterId]: percent } — only chapters the reader was allowed to read
 * secondsById: { [chapterId]: seconds }
 *
 * A reader cannot finish a multi-chapter novel by opening only the last chapter.
 * The first published chapter must be read, the last must be read, and at least
 * 80% of published chapters must be read. A single-chapter novel requires three
 * minutes in that chapter so a tap on the only (and therefore final) chapter
 * does not count.
 */
function genuineCompletion(published, progressById = {}, secondsById = {}) {
  const chapters = (published || [])
    .filter((ch) => ch && ch.id != null)
    .map((ch) => ({ id: Number(ch.id), idx: Number(ch.idx) }))
    .sort((a, b) => a.idx - b.idx || a.id - b.id);
  if (!chapters.length) {
    return { ok: false, reason: 'no_chapters', readCount: 0, publishedCount: 0, need: 0 };
  }
  const progress = progressById || {};
  const seconds = secondsById || {};
  const read = chapters.filter((ch) => isChapterRead(progress[ch.id]));
  const first = chapters[0];
  const last = chapters[chapters.length - 1];
  const publishedCount = chapters.length;
  const need = Math.max(1, Math.ceil(publishedCount * COMPLETION_COVERAGE));
  const base = { readCount: read.length, publishedCount, need };

  if (!isChapterRead(progress[last.id])) {
    return { ok: false, reason: 'final_unread', ...base };
  }
  if (publishedCount === 1) {
    const spent = Number(seconds[first.id] || 0);
    if (spent < SINGLE_CHAPTER_MIN_SECONDS) {
      return { ok: false, reason: 'single_chapter_too_brief', ...base, seconds: spent };
    }
    return { ok: true, reason: 'single_chapter', ...base, seconds: spent };
  }
  if (!isChapterRead(progress[first.id])) {
    return { ok: false, reason: 'opening_unread', ...base };
  }
  if (read.length < 2) {
    return { ok: false, reason: 'only_final', ...base };
  }
  if (read.length < need) {
    return { ok: false, reason: 'coverage', ...base };
  }
  return { ok: true, reason: 'coverage', ...base };
}

function hasReadFirstNovel(books) {
  return (books || []).some((book) => {
    const readCount = Number(book.readCount || 0);
    const publishedCount = Number(book.publishedCount || 0);
    const seconds = Number(book.seconds || 0);
    if (readCount >= FIRST_NOVEL_MIN_CHAPTERS) return true;
    if (publishedCount === 1 && readCount >= 1 && seconds >= FIRST_NOVEL_SINGLE_CHAPTER_SECONDS) return true;
    return false;
  });
}

/** Active goals stay above completed ones inside a group. */
function sortTasksForDisplay(tasks) {
  return [...(tasks || [])].sort((a, b) => (
    Number(!!a.completed) - Number(!!b.completed)
    || (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0)
    || (Number(a.id) || 0) - (Number(b.id) || 0)
  ));
}

function displayProgress(progress, target) {
  const t = Math.max(0, Number(target) || 0);
  const p = Math.max(0, Number(progress) || 0);
  const current = t > 0 ? Math.min(p, t) : p;
  return {
    current,
    target: t,
    label: `${current}/${t}`,
  };
}

module.exports = {
  MEANINGFUL_PERCENT,
  COMPLETION_COVERAGE,
  SINGLE_CHAPTER_MIN_SECONDS,
  FIRST_NOVEL_MIN_CHAPTERS,
  FIRST_NOVEL_SINGLE_CHAPTER_SECONDS,
  ELIGIBLE_COMMENT_CHARS,
  ELIGIBLE_REVIEW_CHARS,
  isEnabledFlag,
  windowsOverlap,
  findReadMinutesConflict,
  assertNoReadMinutesConflict,
  assertTaskRewardExpOnly,
  assertExpAmount,
  normalizeTaskParams,
  normalizeEventParams,
  assertTaskConfigurable,
  isEligibleReview,
  isEligibleComment,
  isChapterRead,
  genuineCompletion,
  hasReadFirstNovel,
  sortTasksForDisplay,
  displayProgress,
};
