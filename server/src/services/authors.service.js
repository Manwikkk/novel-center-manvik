'use strict';

const pool = require('../db/pool');
const { errors } = require('../utils/HttpError');
const { clampPagination } = require('../utils/pagination');
const booksSvc = require('./books.service');

function rowToAuthor(row) {
  return {
    id: row.id,
    displayName: row.display_name,
    role: row.role,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    bookCount: Number(row.book_count || 0),
    latestPublishedAt: row.latest_published_at || null,
    createdAt: row.created_at,
  };
}

async function list({ page, pageSize, q }) {
  const { page: safePage, pageSize: safePageSize, offset } = clampPagination(page, pageSize, {
    defaultSize: 12,
    max: 60,
  });

  const where = ["u.role IN ('author','admin')", "u.status = 'active'"];
  const params = [];
  if (q) {
    where.push('(u.display_name LIKE ? OR u.bio LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like);
  }
  const whereSql = `WHERE ${where.join(' AND ')}`;

  const havingSql = 'HAVING book_count > 0';

  const [rows] = await pool.execute(
    `SELECT u.id, u.display_name, u.role, u.avatar_url, u.bio, u.created_at,
            (SELECT COUNT(*) FROM books b WHERE b.author_id = u.id AND b.status = 'published') AS book_count,
            (SELECT MAX(b.updated_at) FROM books b WHERE b.author_id = u.id AND b.status = 'published') AS latest_published_at
       FROM users u
       ${whereSql}
       ${havingSql}
       ORDER BY book_count DESC, latest_published_at DESC, u.display_name ASC
       LIMIT ${safePageSize} OFFSET ${offset}`,
    params,
  );

  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM (
       SELECT u.id
         FROM users u
         ${whereSql}
        AND (SELECT COUNT(*) FROM books b WHERE b.author_id = u.id AND b.status = 'published') > 0
     ) sub`,
    params,
  );

  return {
    items: rows.map(rowToAuthor),
    page: safePage,
    pageSize: safePageSize,
    total: Number(countRows[0].total),
  };
}

async function getById(id, { booksPage, booksPageSize } = {}) {
  const [rows] = await pool.execute(
    `SELECT u.id, u.display_name, u.role, u.avatar_url, u.bio, u.created_at,
            (SELECT COUNT(*) FROM books b WHERE b.author_id = u.id AND b.status = 'published') AS book_count,
            (SELECT MAX(b.updated_at) FROM books b WHERE b.author_id = u.id AND b.status = 'published') AS latest_published_at
       FROM users u
      WHERE u.id = ? AND u.role IN ('author','admin') AND u.status = 'active'
      LIMIT 1`,
    [id],
  );
  const row = rows[0];
  if (!row) throw errors.notFound('Author not found');

  const author = rowToAuthor(row);
  const books = await booksSvc.list({
    author: id,
    status: 'published',
    page: booksPage,
    pageSize: booksPageSize,
  }, null);

  return { author, books };
}

module.exports = { list, getById };
