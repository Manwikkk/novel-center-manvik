'use strict';

const pool = require('../db/pool');
const { errors } = require('../utils/HttpError');
const { clampPagination } = require('../utils/pagination');
const librarySvc = require('./library.service');

const VISIBILITIES = new Set(['public', 'private']);

function rowToCollection(row) {
  return {
    id: row.id,
    name: row.name,
    visibility: row.visibility,
    bookCount: row.book_count != null ? Number(row.book_count) : 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToBook(row) {
  return {
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
    addedAt: row.added_at,
  };
}

async function getOwnedCollection(userId, collectionId) {
  const [rows] = await pool.execute(
    'SELECT * FROM user_collections WHERE id = ? AND user_id = ? LIMIT 1',
    [collectionId, userId],
  );
  const row = rows[0];
  if (!row) throw errors.notFound('Collection not found');
  return row;
}

async function list({ userId, page, pageSize }) {
  const { page: safePage, pageSize: safePageSize, offset } = clampPagination(page, pageSize, {
    defaultSize: 20,
    max: 60,
  });

  const [rows] = await pool.execute(
    `SELECT uc.*,
            (SELECT COUNT(*) FROM collection_books cb
              JOIN books b ON b.id = cb.book_id
             WHERE cb.collection_id = uc.id AND b.recycled_at IS NULL) AS book_count
       FROM user_collections uc
      WHERE uc.user_id = ?
      ORDER BY uc.updated_at DESC
      LIMIT ${safePageSize} OFFSET ${offset}`,
    [userId],
  );

  const [c] = await pool.execute(
    'SELECT COUNT(*) AS total FROM user_collections WHERE user_id = ?',
    [userId],
  );

  return {
    items: rows.map(rowToCollection),
    page: safePage,
    pageSize: safePageSize,
    total: Number(c[0].total),
  };
}

async function create(userId, { name, visibility = 'private' }) {
  const trimmed = String(name || '').trim();
  if (!trimmed) throw errors.badRequest('Collection name is required');
  if (trimmed.length > 120) throw errors.badRequest('Collection name is too long');
  const vis = VISIBILITIES.has(visibility) ? visibility : 'private';

  try {
    const [result] = await pool.execute(
      'INSERT INTO user_collections (user_id, name, visibility) VALUES (?, ?, ?)',
      [userId, trimmed, vis],
    );
    const [rows] = await pool.execute(
      'SELECT * FROM user_collections WHERE id = ? LIMIT 1',
      [result.insertId],
    );
    return rowToCollection({ ...rows[0], book_count: 0 });
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') {
      throw errors.badRequest('You already have a collection with that name');
    }
    throw err;
  }
}

async function update(userId, collectionId, { name, visibility }) {
  await getOwnedCollection(userId, collectionId);

  const updates = [];
  const params = [];

  if (name !== undefined) {
    const trimmed = String(name).trim();
    if (!trimmed) throw errors.badRequest('Collection name is required');
    if (trimmed.length > 120) throw errors.badRequest('Collection name is too long');
    updates.push('name = ?');
    params.push(trimmed);
  }

  if (visibility !== undefined) {
    if (!VISIBILITIES.has(visibility)) throw errors.badRequest('Invalid visibility');
    updates.push('visibility = ?');
    params.push(visibility);
  }

  if (updates.length === 0) throw errors.badRequest('Nothing to update');

  params.push(collectionId, userId);
  try {
    await pool.execute(
      `UPDATE user_collections SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      params,
    );
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') {
      throw errors.badRequest('You already have a collection with that name');
    }
    throw err;
  }

  const [rows] = await pool.execute(
    `SELECT uc.*,
            (SELECT COUNT(*) FROM collection_books cb
              JOIN books b ON b.id = cb.book_id
             WHERE cb.collection_id = uc.id AND b.recycled_at IS NULL) AS book_count
       FROM user_collections uc WHERE uc.id = ? LIMIT 1`,
    [collectionId],
  );
  return rowToCollection(rows[0]);
}

async function remove(userId, collectionId) {
  await getOwnedCollection(userId, collectionId);
  await pool.execute('DELETE FROM user_collections WHERE id = ? AND user_id = ?', [collectionId, userId]);
  return { id: Number(collectionId), deleted: true };
}

async function listBooks(userId, collectionId, { page, pageSize, q }) {
  await getOwnedCollection(userId, collectionId);
  const { page: safePage, pageSize: safePageSize, offset } = clampPagination(page, pageSize, {
    defaultSize: 20,
    max: 60,
  });

  const where = ['cb.collection_id = ?', 'b.recycled_at IS NULL'];
  const params = [collectionId];

  const query = typeof q === 'string' ? q.trim() : '';
  if (query) {
    where.push('(b.title LIKE ? OR b.category LIKE ? OR u.display_name LIKE ?)');
    const like = `%${query}%`;
    params.push(like, like, like);
  }

  const whereSql = `WHERE ${where.join(' AND ')}`;

  const [rows] = await pool.execute(
    `SELECT cb.book_id, cb.added_at,
            b.slug, b.title, b.synopsis, b.cover_url, b.category, b.language, b.status,
            b.author_id, u.display_name AS author_name,
            (SELECT COUNT(*) FROM chapters c WHERE c.book_id = b.id AND c.status = 'published' AND c.recycled_at IS NULL) AS chapter_count
       FROM collection_books cb
       JOIN books b ON b.id = cb.book_id
       JOIN users u ON u.id = b.author_id
      ${whereSql}
      ORDER BY cb.added_at DESC
      LIMIT ${safePageSize} OFFSET ${offset}`,
    params,
  );

  const [c] = await pool.execute(
    `SELECT COUNT(*) AS total
       FROM collection_books cb
       JOIN books b ON b.id = cb.book_id
       JOIN users u ON u.id = b.author_id
      ${whereSql}`,
    params,
  );

  return {
    items: rows.map(rowToBook),
    page: safePage,
    pageSize: safePageSize,
    total: Number(c[0].total),
  };
}

async function addBook(userId, collectionId, bookId) {
  await getOwnedCollection(userId, collectionId);
  await librarySvc.ensureInLibrary(userId, bookId);

  await pool.execute(
    'INSERT IGNORE INTO collection_books (collection_id, book_id) VALUES (?, ?)',
    [collectionId, bookId],
  );

  return { collectionId: Number(collectionId), bookId: Number(bookId), inCollection: true };
}

async function removeBook(userId, collectionId, bookId) {
  await getOwnedCollection(userId, collectionId);
  await pool.execute(
    'DELETE FROM collection_books WHERE collection_id = ? AND book_id = ?',
    [collectionId, bookId],
  );
  return { collectionId: Number(collectionId), bookId: Number(bookId), inCollection: false };
}

async function containsMany(userId, bookIds) {
  if (!Array.isArray(bookIds) || bookIds.length === 0) return { items: {} };
  const ids = bookIds.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0);
  if (ids.length === 0) return { items: {} };

  const placeholders = ids.map(() => '?').join(',');
  const [rows] = await pool.execute(
    `SELECT cb.book_id, cb.collection_id
       FROM collection_books cb
       JOIN user_collections uc ON uc.id = cb.collection_id
      WHERE uc.user_id = ? AND cb.book_id IN (${placeholders})`,
    [userId, ...ids],
  );

  const items = {};
  for (const id of ids) items[id] = [];
  for (const row of rows) {
    const bookId = Number(row.book_id);
    if (!items[bookId]) items[bookId] = [];
    items[bookId].push(Number(row.collection_id));
  }
  return { items };
}

module.exports = {
  list,
  create,
  update,
  remove,
  listBooks,
  addBook,
  removeBook,
  containsMany,
};
