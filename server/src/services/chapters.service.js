'use strict';

const pool = require('../db/pool');
const { errors } = require('../utils/HttpError');
const { sanitizeChapterHtml, sanitizeAuthorThought } = require('../utils/htmlSanitize');
const booksService = require('./books.service');
const { htmlToWordCount, minutesFromWords } = require('./reading.service');
const { pricingFromContent, getSplitWarning } = require('./chapterPricing.service');
const { resolveUserRow, hasRestriction, assertRestriction } = require('./suspension.service');

function isPaidChapter(row) {
  return !!row.is_paid && Number(row.token_price) > 0;
}

function canReadChapter(row, { viewer, bookAuthorId, unlocked, viewerRow }) {
  if (viewer?.role === 'admin') return true;
  if (viewerRow && hasRestriction(viewerRow, 'reading')) return false;
  if (viewer && bookAuthorId && viewer.id === bookAuthorId) return true;
  if (!isPaidChapter(row)) return true;
  return !!unlocked;
}

function rowToChapter(row, { includeContent = false, isUnlocked = false, canRead = false } = {}) {
  if (!row) return null;
  const wordCount = htmlToWordCount(row.content_html);
  const out = {
    id: row.id,
    bookId: row.book_id,
    idx: row.idx,
    title: row.title,
    isPaid: isPaidChapter(row),
    tokenPrice: Number(row.token_price),
    status: row.status,
    scheduledPublishAt: row.scheduled_publish_at
      ? new Date(row.scheduled_publish_at).toISOString()
      : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isUnlocked,
    canRead,
    wordCount,
    readingMinutes: minutesFromWords(wordCount, 100),
    authorThought: row.author_thought || '',
    pricingNote: getSplitWarning(wordCount),
  };
  if (includeContent && canRead) out.contentHtml = row.content_html || '';
  return out;
}

async function getRawById(id) {
  const [rows] = await pool.execute('SELECT * FROM chapters WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

async function nextIdx(bookId) {
  const [rows] = await pool.execute('SELECT COALESCE(MAX(idx), 0) AS m FROM chapters WHERE book_id = ?', [bookId]);
  return Number(rows[0].m) + 1;
}

function parseScheduledPublishAt(value, { existing = null } = {}) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw errors.badRequest('Invalid scheduled publish time');
  const existingMs = existing ? new Date(existing).getTime() : null;
  const isUnchanged = existingMs != null && existingMs === d.getTime();
  if (!isUnchanged && d.getTime() <= Date.now()) {
    throw errors.badRequest('Scheduled publish time must be in the future');
  }
  return d;
}

function applyScheduleFields(body, { forceDraft = false, existingScheduledAt = null } = {}) {
  const patch = {};
  const hasScheduleField = Object.prototype.hasOwnProperty.call(body, 'scheduledPublishAt');

  if (body.status === 'published') {
    patch.status = 'published';
    patch.scheduled_publish_at = null;
    return patch;
  }

  if (hasScheduleField) {
    const scheduled = parseScheduledPublishAt(body.scheduledPublishAt, { existing: existingScheduledAt });
    patch.scheduled_publish_at = scheduled;
    if (scheduled) {
      patch.status = 'draft';
      return patch;
    }
  }

  if (forceDraft || body.status === 'draft') {
    patch.status = 'draft';
    if (hasScheduleField && body.scheduledPublishAt == null) {
      patch.scheduled_publish_at = null;
    }
  } else if (body.status != null) {
    patch.status = body.status;
  }

  return patch;
}

async function isUnlockedFor(userId, chapterId) {
  if (!userId) return false;
  const [rows] = await pool.execute(
    'SELECT 1 FROM chapter_unlocks WHERE user_id = ? AND chapter_id = ? LIMIT 1',
    [userId, chapterId],
  );
  return rows.length > 0;
}

async function listForBook(bookId, viewer) {
  const book = await booksService.getById(bookId);
  if (!book) throw errors.notFound('Book not found');

  const viewerRow = viewer ? await resolveUserRow(viewer.id) : null;
  const showDrafts = viewer && (viewer.role === 'admin' || viewer.id === book.author_id);

  const where = ['book_id = ?', 'recycled_at IS NULL'];
  const params = [bookId];
  if (!showDrafts) {
    where.push("status = 'published'");
  }

  const [rows] = await pool.execute(
    `SELECT * FROM chapters WHERE ${where.join(' AND ')} ORDER BY idx ASC`,
    params,
  );

  let unlockedSet = new Set();
  if (viewer && rows.length) {
    const ids = rows.map((r) => r.id);
    const placeholders = ids.map(() => '?').join(',');
    const [u] = await pool.execute(
      `SELECT chapter_id FROM chapter_unlocks WHERE user_id = ? AND chapter_id IN (${placeholders})`,
      [viewer.id, ...ids],
    );
    unlockedSet = new Set(u.map((x) => x.chapter_id));
  }

  return rows.map((r) => {
    const unlocked = unlockedSet.has(r.id);
    const canRead = canReadChapter(r, {
      viewer, bookAuthorId: book.author_id, unlocked, viewerRow,
    });
    return rowToChapter(r, {
      includeContent: false,
      isUnlocked: unlocked,
      canRead,
    });
  });
}

async function getById(id, viewer) {
  const row = await getRawById(id);
  if (!row || row.recycled_at) throw errors.notFound('Chapter not found');

  const book = await booksService.getById(row.book_id);
  if (!book || book.recycled_at) throw errors.notFound('Chapter not found');
  const viewerRow = viewer ? await resolveUserRow(viewer.id) : null;
  const isAuthor = viewer && (viewer.role === 'admin' || viewer.id === book.author_id);

  if (viewerRow && !isAuthor) {
    assertRestriction(viewerRow, 'reading', 'Reading is restricted on your account');
  }
  if (row.status !== 'published' && !isAuthor) throw errors.notFound('Chapter not found');
  if (book.status !== 'published' && !isAuthor) throw errors.notFound('Chapter not found');

  let unlocked = false;
  if (viewer) unlocked = await isUnlockedFor(viewer.id, id);

  const canRead = canReadChapter(row, {
    viewer, bookAuthorId: book.author_id, unlocked, viewerRow,
  });

  return rowToChapter(row, { includeContent: canRead, isUnlocked: unlocked, canRead });
}

async function createInBook(bookId, body, user) {
  const userRow = await resolveUserRow(user.id);
  assertRestriction(userRow, 'publishing', 'Publishing is restricted on your account');

  const book = await booksService.getById(bookId);
  booksService.assertOwnerOrAdmin(book, user);

  const idx = body.idx != null ? body.idx : await nextIdx(bookId);
  const html = sanitizeChapterHtml(body.contentHtml || '');

  const thought = sanitizeAuthorThought(body.authorThought || '');
  const schedulePatch = applyScheduleFields(body, { existingScheduledAt: null });
  const chapterStatus = schedulePatch.status || body.status || 'draft';
  const scheduledAt = schedulePatch.scheduled_publish_at !== undefined
    ? schedulePatch.scheduled_publish_at
    : null;

  const isPaid = !!body.isPaid;
  const { tokenPrice } = pricingFromContent(isPaid, html);

  const [r] = await pool.execute(
    `INSERT INTO chapters (book_id, idx, title, content_html, author_thought, is_paid, token_price, status, scheduled_publish_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [bookId, idx, body.title, html, thought || null, isPaid ? 1 : 0, tokenPrice, chapterStatus, scheduledAt],
  );
  const created = await getRawById(r.insertId);
  return rowToChapter(created, { includeContent: true, isUnlocked: true, canRead: true });
}

async function update(id, patch, user) {
  const userRow = await resolveUserRow(user.id);
  assertRestriction(userRow, 'publishing', 'Publishing is restricted on your account');

  const row = await getRawById(id);
  if (!row) throw errors.notFound('Chapter not found');
  const book = await booksService.getById(row.book_id);
  booksService.assertOwnerOrAdmin(book, user);

  const fields = [];
  const params = [];
  if (patch.title != null) {
    const t = String(patch.title).trim() || 'Untitled chapter';
    fields.push('title = ?');
    params.push(t);
  }
  if (patch.contentHtml != null)   { fields.push('content_html = ?');  params.push(sanitizeChapterHtml(patch.contentHtml)); }
  if (patch.authorThought != null) {
    const t = sanitizeAuthorThought(patch.authorThought);
    fields.push('author_thought = ?');
    params.push(t || null);
  }
  if (patch.isPaid != null)        { fields.push('is_paid = ?');       params.push(patch.isPaid ? 1 : 0); }
  if (patch.idx != null)           { fields.push('idx = ?');           params.push(patch.idx); }

  const schedulePatch = applyScheduleFields(patch, { existingScheduledAt: row.scheduled_publish_at });
  if (schedulePatch.status != null) {
    fields.push('status = ?');
    params.push(schedulePatch.status);
  } else if (patch.status != null) {
    fields.push('status = ?');
    params.push(patch.status);
  }
  if (schedulePatch.scheduled_publish_at !== undefined) {
    fields.push('scheduled_publish_at = ?');
    params.push(schedulePatch.scheduled_publish_at);
  }

  const nextIsPaid = patch.isPaid != null ? !!patch.isPaid : !!row.is_paid;
  const nextHtml = patch.contentHtml != null ? sanitizeChapterHtml(patch.contentHtml) : row.content_html;
  if (patch.isPaid != null || patch.contentHtml != null) {
    const { tokenPrice } = pricingFromContent(nextIsPaid, nextHtml);
    fields.push('token_price = ?');
    params.push(tokenPrice);
  }

  if (fields.length === 0) return rowToChapter(row, { includeContent: true, isUnlocked: true, canRead: true });
  params.push(id);
  await pool.execute(`UPDATE chapters SET ${fields.join(', ')} WHERE id = ?`, params);
  const fresh = await getRawById(id);
  return rowToChapter(fresh, { includeContent: true, isUnlocked: true, canRead: true });
}

async function remove(id, user) {
  const userRow = await resolveUserRow(user.id);
  assertRestriction(userRow, 'publishing', 'Publishing is restricted on your account');

  const row = await getRawById(id);
  if (!row) throw errors.notFound('Chapter not found');
  const book = await booksService.getById(row.book_id);
  booksService.assertOwnerOrAdmin(book, user);
  await pool.execute('DELETE FROM chapters WHERE id = ?', [id]);
  return { ok: true };
}

module.exports = {
  listForBook, getById, createInBook, update, remove,
  rowToChapter, getRawById,
};
