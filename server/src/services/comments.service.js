'use strict';

const pool = require('../db/pool');
const { errors } = require('../utils/HttpError');
const { sanitizeCommentBody } = require('../utils/htmlSanitize');
const { clampPagination } = require('../utils/pagination');

function rowToComment(row) {
  return {
    id: row.id,
    bookId: row.book_id,
    chapterId: row.chapter_id,
    userId: row.user_id,
    parentId: row.parent_id,
    body: row.status === 'visible' ? row.body : (row.status === 'deleted' ? null : row.body),
    status: row.status,
    author: row.display_name ? { id: row.user_id, displayName: row.display_name, avatarUrl: row.avatar_url } : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function list({ bookId, chapterId, page, pageSize }, viewer) {
  const where = [];
  const params = [];
  if (chapterId) { where.push('c.chapter_id = ?'); params.push(chapterId); }
  else if (bookId) { where.push('c.book_id = ?'); params.push(bookId); where.push('c.chapter_id IS NULL'); }

  if (!viewer || viewer.role !== 'admin') {
    where.push("c.status <> 'hidden'");
  }

  const { page: safePage, pageSize: safePageSize, offset } = clampPagination(page, pageSize);
  const [rows] = await pool.execute(
    `SELECT c.*, u.display_name, u.avatar_url
     FROM comments c JOIN users u ON u.id = c.user_id
     WHERE ${where.join(' AND ')}
     ORDER BY c.created_at ASC
     LIMIT ${safePageSize} OFFSET ${offset}`,
    params,
  );
  return { items: rows.map(rowToComment), page: safePage, pageSize: safePageSize };
}

async function getById(id) {
  const [rows] = await pool.execute(
    `SELECT c.*, u.display_name, u.avatar_url
     FROM comments c JOIN users u ON u.id = c.user_id
     WHERE c.id = ? LIMIT 1`,
    [id],
  );
  return rows[0] ? rowToComment(rows[0]) : null;
}

async function create({ bookId, chapterId, parentId, body }, userId) {
  const clean = sanitizeCommentBody(body);
  if (!clean) throw errors.badRequest('Comment body is empty after sanitization');

  // If chapterId is provided, derive bookId from the chapter for FK consistency.
  if (chapterId) {
    const [r] = await pool.execute('SELECT book_id FROM chapters WHERE id = ? LIMIT 1', [chapterId]);
    if (!r[0]) throw errors.notFound('Chapter not found');
    bookId = r[0].book_id;
  } else if (bookId) {
    const [r] = await pool.execute('SELECT id FROM books WHERE id = ? LIMIT 1', [bookId]);
    if (!r[0]) throw errors.notFound('Book not found');
  }

  if (parentId) {
    const [r] = await pool.execute(
      'SELECT id, book_id, chapter_id FROM comments WHERE id = ? LIMIT 1',
      [parentId],
    );
    if (!r[0]) throw errors.notFound('Parent comment not found');
    if (r[0].book_id !== bookId || (chapterId || null) !== (r[0].chapter_id || null)) {
      throw errors.badRequest('Parent comment is on a different target');
    }
  }

  const [ins] = await pool.execute(
    `INSERT INTO comments (book_id, chapter_id, user_id, parent_id, body, status)
     VALUES (?, ?, ?, ?, ?, 'visible')`,
    [bookId, chapterId || null, userId, parentId || null, clean],
  );
  return getById(ins.insertId);
}

async function update(id, body, user) {
  const c = await getById(id);
  if (!c) throw errors.notFound('Comment not found');
  if (user.role !== 'admin' && c.userId !== user.id) throw errors.forbidden();
  const clean = sanitizeCommentBody(body);
  if (!clean) throw errors.badRequest('Comment body is empty after sanitization');
  await pool.execute('UPDATE comments SET body = ? WHERE id = ?', [clean, id]);
  return getById(id);
}

async function remove(id, user) {
  const c = await getById(id);
  if (!c) throw errors.notFound('Comment not found');
  if (user.role !== 'admin' && c.userId !== user.id) throw errors.forbidden();
  // Soft-delete keeps thread structure intact.
  await pool.execute("UPDATE comments SET status = 'deleted', body = '' WHERE id = ?", [id]);
  return { ok: true };
}

async function moderate(id, status) {
  if (!['visible', 'hidden', 'deleted'].includes(status)) throw errors.badRequest('Invalid status');
  const c = await getById(id);
  if (!c) throw errors.notFound('Comment not found');
  await pool.execute('UPDATE comments SET status = ? WHERE id = ?', [status, id]);
  return getById(id);
}

module.exports = { list, getById, create, update, remove, moderate };
