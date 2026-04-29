'use strict';

const pool = require('../db/pool');
const { errors } = require('../utils/HttpError');
const { clampPagination } = require('../utils/pagination');

function rowToEntry(row) {
  return {
    bookId: row.book_id,
    addedAt: row.added_at,
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

async function list({ userId, page, pageSize }) {
  const { page: safePage, pageSize: safePageSize, offset } = clampPagination(page, pageSize, {
    defaultSize: 20,
    max: 60,
  });

  const [rows] = await pool.execute(
    `SELECT l.book_id, l.added_at,
            b.slug, b.title, b.synopsis, b.cover_url, b.category, b.language, b.status,
            b.author_id, b.created_at AS book_created_at, b.updated_at AS book_updated_at,
            u.display_name AS author_name,
            (SELECT COUNT(*) FROM chapters c WHERE c.book_id = b.id AND c.status = 'published') AS chapter_count
       FROM library l
       JOIN books b ON b.id = l.book_id
       JOIN users u ON u.id = b.author_id
      WHERE l.user_id = ?
      ORDER BY l.added_at DESC
      LIMIT ${safePageSize} OFFSET ${offset}`,
    [userId],
  );

  const [c] = await pool.execute(
    'SELECT COUNT(*) AS total FROM library WHERE user_id = ?',
    [userId],
  );

  return {
    items: rows.map(rowToEntry),
    page: safePage,
    pageSize: safePageSize,
    total: Number(c[0].total),
  };
}

async function add(userId, bookId) {
  const [books] = await pool.execute(
    "SELECT id, status FROM books WHERE id = ? LIMIT 1",
    [bookId],
  );
  const book = books[0];
  if (!book) throw errors.notFound('Book not found');
  if (book.status !== 'published') throw errors.badRequest('Cannot add an unpublished book to your library');

  await pool.execute(
    'INSERT IGNORE INTO library (user_id, book_id) VALUES (?, ?)',
    [userId, bookId],
  );

  const [rows] = await pool.execute(
    'SELECT user_id, book_id, added_at FROM library WHERE user_id = ? AND book_id = ? LIMIT 1',
    [userId, bookId],
  );
  const r = rows[0];
  return { bookId: r.book_id, addedAt: r.added_at, inLibrary: true };
}

async function remove(userId, bookId) {
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

module.exports = { list, add, remove, containsMany };
