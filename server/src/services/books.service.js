'use strict';

const slugify = require('slugify');
const pool = require('../db/pool');
const { errors } = require('../utils/HttpError');
const storage = require('../storage');
const { clampPagination } = require('../utils/pagination');

function rowToBook(row) {
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    authorId: row.author_id,
    authorName: row.author_name || null,
    title: row.title,
    synopsis: row.synopsis,
    coverUrl: row.cover_url,
    coverStorageKey: row.cover_storage_key,
    category: row.category,
    language: row.language,
    status: row.status,
    score: row.score == null ? null : Number(row.score),
    chapterNum: row.chapter_num != null ? Number(row.chapter_num) : 0,
    externalLink: row.external_link || null,
    chapterCount: row.chapter_count != null ? Number(row.chapter_count) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function uniqueSlug(base) {
  const root = slugify(base, { lower: true, strict: true }).slice(0, 200) || 'book';
  let candidate = root;
  let i = 0;
  // Best-effort uniqueness; the UNIQUE index is the source of truth.
  // Loop bounded to avoid infinite contention.
  while (i < 50) {
    const [rows] = await pool.execute('SELECT id FROM books WHERE slug = ? LIMIT 1', [candidate]);
    if (rows.length === 0) return candidate;
    i += 1;
    candidate = `${root}-${Math.random().toString(36).slice(2, 6)}`;
  }
  throw errors.internal('Unable to generate unique slug');
}

async function list({ q, author, category, status, page, pageSize }, viewer) {
  const where = [];
  const params = [];

  const viewingOwn =
    author && viewer && Number(author) === Number(viewer.id);
  if (status) {
    where.push('b.status = ?');
    params.push(status);
  } else {
    // Public listing default: only show published unless the viewer is an admin
    // or is requesting their own books (drafts + archived included).
    if (!viewer || (viewer.role !== 'admin' && !viewingOwn)) {
      where.push("b.status = 'published'");
    }
  }
  if (author) { where.push('b.author_id = ?'); params.push(author); }
  if (category) { where.push('b.category = ?'); params.push(category); }
  if (q) {
    where.push('(b.title LIKE ? OR b.synopsis LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like);
  }

  const { page: safePage, pageSize: safePageSize, offset } = clampPagination(page, pageSize);
  const sql =
    'SELECT b.*, u.display_name AS author_name, ' +
    '  (SELECT COUNT(*) FROM chapters c WHERE c.book_id = b.id AND c.status = "published") AS chapter_count ' +
    'FROM books b JOIN users u ON u.id = b.author_id ' +
    (where.length ? `WHERE ${where.join(' AND ')} ` : '') +
    `ORDER BY b.updated_at DESC LIMIT ${safePageSize} OFFSET ${offset}`;
  const [rows] = await pool.execute(sql, params);

  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM books b ${where.length ? `WHERE ${where.join(' AND ')}` : ''}`,
    params,
  );

  return {
    items: rows.map(rowToBook),
    page: safePage,
    pageSize: safePageSize,
    total: Number(countRows[0].total),
  };
}

async function getBySlug(slug, viewer) {
  const [rows] = await pool.execute(
    `SELECT b.*, u.display_name AS author_name,
       (SELECT COUNT(*) FROM chapters c WHERE c.book_id = b.id AND c.status = 'published') AS chapter_count
     FROM books b JOIN users u ON u.id = b.author_id
     WHERE b.slug = ? LIMIT 1`,
    [slug],
  );
  const row = rows[0];
  if (!row) throw errors.notFound('Book not found');
  if (row.status !== 'published' && !(viewer && (viewer.role === 'admin' || viewer.id === row.author_id))) {
    throw errors.notFound('Book not found');
  }
  return rowToBook(row);
}

async function getById(id) {
  const [rows] = await pool.execute('SELECT * FROM books WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

async function getByIdForViewer(id, viewer) {
  const [rows] = await pool.execute(
    `SELECT b.*, u.display_name AS author_name,
       (SELECT COUNT(*) FROM chapters c WHERE c.book_id = b.id AND c.status = 'published') AS chapter_count
     FROM books b JOIN users u ON u.id = b.author_id
     WHERE b.id = ? LIMIT 1`,
    [id],
  );
  const row = rows[0];
  if (!row) throw errors.notFound('Book not found');
  if (row.status !== 'published' && !(viewer && (viewer.role === 'admin' || viewer.id === row.author_id))) {
    throw errors.notFound('Book not found');
  }
  return rowToBook(row);
}

async function create({ title, synopsis, category, language, coverUrl, status }, authorId) {
  const slug = await uniqueSlug(title);
  const [r] = await pool.execute(
    `INSERT INTO books (slug, author_id, title, synopsis, cover_url, category, language, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [slug, authorId, title, synopsis || null, coverUrl || null, category || null, language || 'en', status || 'draft'],
  );
  return getBySlug(slug);
}

function assertOwnerOrAdmin(book, user) {
  if (!book) throw errors.notFound('Book not found');
  if (user.role !== 'admin' && book.author_id !== user.id) throw errors.forbidden();
}

async function update(id, patch, user) {
  const book = await getById(id);
  assertOwnerOrAdmin(book, user);

  const fields = [];
  const params = [];
  const map = {
    title: 'title',
    synopsis: 'synopsis',
    category: 'category',
    language: 'language',
    coverUrl: 'cover_url',
    status: 'status',
  };
  for (const [k, col] of Object.entries(map)) {
    if (Object.prototype.hasOwnProperty.call(patch, k)) {
      fields.push(`${col} = ?`);
      params.push(patch[k]);
    }
  }
  if (fields.length === 0) return rowToBook(book);

  params.push(id);
  await pool.execute(`UPDATE books SET ${fields.join(', ')} WHERE id = ?`, params);
  return getBySlug((await getById(id)).slug, user);
}

async function remove(id, user) {
  const book = await getById(id);
  assertOwnerOrAdmin(book, user);
  if (book.cover_storage_key) {
    try { await storage.remove(book.cover_storage_key); } catch (_) { /* ignore */ }
  }
  await pool.execute('DELETE FROM books WHERE id = ?', [id]);
  return { ok: true };
}

async function setCover(id, file, user) {
  const book = await getById(id);
  assertOwnerOrAdmin(book, user);
  if (!file) throw errors.badRequest('No file provided');

  const { url, key } = await storage.persist(file);
  // Replace previous file if it was managed by us
  if (book.cover_storage_key && book.cover_storage_key !== key) {
    try { await storage.remove(book.cover_storage_key); } catch (_) { /* ignore */ }
  }
  await pool.execute(
    'UPDATE books SET cover_url = ?, cover_storage_key = ? WHERE id = ?',
    [url, key, id],
  );
  return getBySlug((await getById(id)).slug, user);
}

module.exports = {
  list, getBySlug, getById, getByIdForViewer, create, update, remove, setCover,
  rowToBook, assertOwnerOrAdmin,
};
