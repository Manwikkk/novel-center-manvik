'use strict';

const pool = require('../db/pool');
const { errors } = require('../utils/HttpError');
const { sanitizeChapterHtml } = require('../utils/htmlSanitize');
const booksService = require('./books.service');
const { htmlToWordCount, minutesFromWords } = require('./reading.service');

function rowToChapter(row, { includeContent = false, isUnlocked = false } = {}) {
  if (!row) return null;
  const wordCount = htmlToWordCount(row.content_html);
  const out = {
    id: row.id,
    bookId: row.book_id,
    idx: row.idx,
    title: row.title,
    isPaid: !!row.is_paid,
    tokenPrice: Number(row.token_price),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isUnlocked,
    wordCount,
    readingMinutes: minutesFromWords(wordCount, 100),
  };
  if (includeContent) out.contentHtml = row.content_html || '';
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

  const showDrafts = viewer && (viewer.role === 'admin' || viewer.id === book.author_id);

  const where = ['book_id = ?'];
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

  return rows.map((r) => rowToChapter(r, {
    includeContent: false,
    isUnlocked: unlockedSet.has(r.id),
  }));
}

async function getById(id, viewer) {
  const row = await getRawById(id);
  if (!row) throw errors.notFound('Chapter not found');

  const book = await booksService.getById(row.book_id);
  const isAuthor = viewer && (viewer.role === 'admin' || viewer.id === book.author_id);
  if (row.status !== 'published' && !isAuthor) throw errors.notFound('Chapter not found');
  if (book.status !== 'published' && !isAuthor) throw errors.notFound('Chapter not found');

  let unlocked = isAuthor;
  if (!unlocked && viewer) unlocked = await isUnlockedFor(viewer.id, id);

  const free = !row.is_paid || row.token_price === 0;
  const canRead = isAuthor || free || unlocked;

  return rowToChapter(row, { includeContent: canRead, isUnlocked: !!unlocked });
}

async function createInBook(bookId, body, user) {
  const book = await booksService.getById(bookId);
  booksService.assertOwnerOrAdmin(book, user);

  const idx = body.idx != null ? body.idx : await nextIdx(bookId);
  const html = sanitizeChapterHtml(body.contentHtml || '');

  const [r] = await pool.execute(
    `INSERT INTO chapters (book_id, idx, title, content_html, is_paid, token_price, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [bookId, idx, body.title, html, body.isPaid ? 1 : 0, body.tokenPrice || 0, body.status || 'draft'],
  );
  const created = await getRawById(r.insertId);
  return rowToChapter(created, { includeContent: true, isUnlocked: true });
}

async function update(id, patch, user) {
  const row = await getRawById(id);
  if (!row) throw errors.notFound('Chapter not found');
  const book = await booksService.getById(row.book_id);
  booksService.assertOwnerOrAdmin(book, user);

  const fields = [];
  const params = [];
  if (patch.title != null)         { fields.push('title = ?');         params.push(patch.title); }
  if (patch.contentHtml != null)   { fields.push('content_html = ?');  params.push(sanitizeChapterHtml(patch.contentHtml)); }
  if (patch.isPaid != null)        { fields.push('is_paid = ?');       params.push(patch.isPaid ? 1 : 0); }
  if (patch.tokenPrice != null)    { fields.push('token_price = ?');   params.push(patch.tokenPrice); }
  if (patch.status != null)        { fields.push('status = ?');        params.push(patch.status); }
  if (patch.idx != null)           { fields.push('idx = ?');           params.push(patch.idx); }
  if (fields.length === 0) return rowToChapter(row, { includeContent: true, isUnlocked: true });
  params.push(id);
  await pool.execute(`UPDATE chapters SET ${fields.join(', ')} WHERE id = ?`, params);
  const fresh = await getRawById(id);
  return rowToChapter(fresh, { includeContent: true, isUnlocked: true });
}

async function remove(id, user) {
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
