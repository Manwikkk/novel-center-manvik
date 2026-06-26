'use strict';

const pool = require('../db/pool');
const { errors } = require('../utils/HttpError');
const { clampPagination } = require('../utils/pagination');

const READING_STATUSES = new Set(['active', 'on_hold', 'archive', 'dropped']);

function rowToEntry(row) {
  return {
    bookId: row.book_id,
    addedAt: row.added_at,
    readingStatus: row.reading_status || 'active',
    book: {
      id: row.book_id,
      slug: row.slug,
      title: row.title,
      synopsis: row.synopsis,
      coverUrl: row.cover_url,
      category: row.category,
      language: row.language,
      status: row.status,
      authorId: row.author_id,
      authorName: row.author_name,
      chapterCount: row.chapter_count != null ? Number(row.chapter_count) : 0,
      createdAt: row.book_created_at,
      updatedAt: row.book_updated_at,
    },
  };
}

async function assertPublishableBook(bookId) {
  const [books] = await pool.execute(
    "SELECT id, status FROM books WHERE id = ? AND recycled_at IS NULL LIMIT 1",
    [bookId],
  );
  const book = books[0];
  if (!book) throw errors.notFound('Book not found');
  if (book.status !== 'published') {
    throw errors.badRequest('Cannot add an unpublished book to your library');
  }
  return book;
}

async function list({ userId, page, pageSize, q, readingStatus }) {
  const { page: safePage, pageSize: safePageSize, offset } = clampPagination(page, pageSize, {
    defaultSize: 20,
    max: 60,
  });

  const status = readingStatus && READING_STATUSES.has(readingStatus) ? readingStatus : 'active';

  const where = ['l.user_id = ?', 'b.recycled_at IS NULL', 'l.reading_status = ?'];
  const params = [userId, status];

  const query = typeof q === 'string' ? q.trim() : '';
  if (query) {
    where.push('(b.title LIKE ? OR b.category LIKE ? OR u.display_name LIKE ?)');
    const like = `%${query}%`;
    params.push(like, like, like);
  }

  const whereSql = `WHERE ${where.join(' AND ')}`;

  const [rows] = await pool.execute(
    `SELECT l.book_id, l.added_at, l.reading_status,
            b.slug, b.title, b.synopsis, b.cover_url, b.category, b.language, b.status,
            b.author_id, b.created_at AS book_created_at, b.updated_at AS book_updated_at,
            u.display_name AS author_name,
            (SELECT COUNT(*) FROM chapters c WHERE c.book_id = b.id AND c.status = 'published' AND c.recycled_at IS NULL) AS chapter_count
       FROM library l
       JOIN books b ON b.id = l.book_id
       JOIN users u ON u.id = b.author_id
      ${whereSql}
      ORDER BY l.added_at DESC
      LIMIT ${safePageSize} OFFSET ${offset}`,
    params,
  );

  const [c] = await pool.execute(
    `SELECT COUNT(*) AS total
       FROM library l
       JOIN books b ON b.id = l.book_id
       JOIN users u ON u.id = b.author_id
      ${whereSql}`,
    params,
  );

  return {
    items: rows.map(rowToEntry),
    page: safePage,
    pageSize: safePageSize,
    total: Number(c[0].total),
    readingStatus: status,
  };
}

async function add(userId, bookId, readingStatus = 'active') {
  await assertPublishableBook(bookId);
  const status = READING_STATUSES.has(readingStatus) ? readingStatus : 'active';

  await pool.execute(
    'INSERT IGNORE INTO library (user_id, book_id, reading_status) VALUES (?, ?, ?)',
    [userId, bookId, status],
  );

  const [rows] = await pool.execute(
    'SELECT user_id, book_id, added_at, reading_status FROM library WHERE user_id = ? AND book_id = ? LIMIT 1',
    [userId, bookId],
  );
  const r = rows[0];
  return {
    bookId: r.book_id,
    addedAt: r.added_at,
    readingStatus: r.reading_status,
    inLibrary: true,
  };
}

async function setStatus(userId, bookId, readingStatus) {
  if (!READING_STATUSES.has(readingStatus)) {
    throw errors.badRequest('Invalid reading status');
  }

  await assertPublishableBook(bookId);

  const [existing] = await pool.execute(
    'SELECT book_id, reading_status FROM library WHERE user_id = ? AND book_id = ? LIMIT 1',
    [userId, bookId],
  );

  if (!existing[0]) {
    await pool.execute(
      'INSERT INTO library (user_id, book_id, reading_status) VALUES (?, ?, ?)',
      [userId, bookId, readingStatus],
    );
  } else {
    await pool.execute(
      'UPDATE library SET reading_status = ? WHERE user_id = ? AND book_id = ?',
      [readingStatus, userId, bookId],
    );
  }

  return { bookId: Number(bookId), readingStatus, inLibrary: true };
}

async function remove(userId, bookId) {
  await pool.execute(
    `DELETE cb FROM collection_books cb
       JOIN user_collections uc ON uc.id = cb.collection_id
      WHERE uc.user_id = ? AND cb.book_id = ?`,
    [userId, bookId],
  );
  await pool.execute(
    'DELETE FROM library WHERE user_id = ? AND book_id = ?',
    [userId, bookId],
  );
  return { bookId: Number(bookId), inLibrary: false };
}

async function containsMany(userId, bookIds) {
  if (!Array.isArray(bookIds) || bookIds.length === 0) return { items: {} };
  const ids = bookIds.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0);
  if (ids.length === 0) return { items: {} };

  const placeholders = ids.map(() => '?').join(',');
  const [rows] = await pool.execute(
    `SELECT book_id FROM library WHERE user_id = ? AND book_id IN (${placeholders})`,
    [userId, ...ids],
  );

  const owned = new Set(rows.map((r) => Number(r.book_id)));
  const items = {};
  for (const id of ids) items[id] = owned.has(id);
  return { items };
}

async function statusMany(userId, bookIds) {
  if (!Array.isArray(bookIds) || bookIds.length === 0) return { items: {} };
  const ids = bookIds.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0);
  if (ids.length === 0) return { items: {} };

  const placeholders = ids.map(() => '?').join(',');
  const [rows] = await pool.execute(
    `SELECT book_id, reading_status FROM library WHERE user_id = ? AND book_id IN (${placeholders})`,
    [userId, ...ids],
  );

  const items = {};
  for (const id of ids) items[id] = null;
  for (const row of rows) {
    items[Number(row.book_id)] = row.reading_status;
  }
  return { items };
}

/** Ensures a book is in the user's library (for collection membership). */
async function ensureInLibrary(userId, bookId) {
  const [existing] = await pool.execute(
    'SELECT book_id FROM library WHERE user_id = ? AND book_id = ? LIMIT 1',
    [userId, bookId],
  );
  if (existing[0]) return;
  await add(userId, bookId, 'active');
}

module.exports = {
  list,
  add,
  setStatus,
  remove,
  containsMany,
  statusMany,
  ensureInLibrary,
  READING_STATUSES,
};
