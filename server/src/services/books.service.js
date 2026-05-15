'use strict';

const slugify = require('slugify');
const pool = require('../db/pool');
const { errors } = require('../utils/HttpError');
const storage = require('../storage');
const { clampPagination } = require('../utils/pagination');
const catalog = require('./catalog.service');

function rowToBook(row, opts = {}) {
  if (!row) return null;
  const out = {
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
  if (row.category_id !== undefined && row.category_id !== null) {
    out.categoryId = Number(row.category_id);
  } else {
    out.categoryId = null;
  }
  if (row.language_id !== undefined && row.language_id !== null) {
    out.languageId = Number(row.language_id);
  } else {
    out.languageId = null;
  }
  if (opts.contentTags) out.contentTags = opts.contentTags;
  return out;
}

async function defaultLanguageId() {
  const [rows] = await pool.execute(
    "SELECT id FROM catalog_languages WHERE code = 'en' LIMIT 1",
  );
  return rows[0] ? Number(rows[0].id) : null;
}

async function assertCategoryAllowed(categoryId, user) {
  if (categoryId == null) return;
  const admin = user && user.role === 'admin';
  const [rows] = await pool.execute(
    admin
      ? 'SELECT id FROM catalog_categories WHERE id = ? LIMIT 1'
      : 'SELECT id FROM catalog_categories WHERE id = ? AND is_active = 1 LIMIT 1',
    [categoryId],
  );
  if (!rows[0]) throw errors.badRequest('Invalid or inactive category');
}

async function assertLanguageAllowed(languageId, user) {
  if (languageId == null) return;
  const admin = user && user.role === 'admin';
  const [rows] = await pool.execute(
    admin
      ? 'SELECT id FROM catalog_languages WHERE id = ? LIMIT 1'
      : 'SELECT id FROM catalog_languages WHERE id = ? AND is_active = 1 LIMIT 1',
    [languageId],
  );
  if (!rows[0]) throw errors.badRequest('Invalid or inactive language');
}

async function uniqueSlug(base) {
  const root = slugify(base, { lower: true, strict: true }).slice(0, 200) || 'book';
  let candidate = root;
  let i = 0;
  while (i < 50) {
    const [rows] = await pool.execute('SELECT id FROM books WHERE slug = ? LIMIT 1', [candidate]);
    if (rows.length === 0) return candidate;
    i += 1;
    candidate = `${root}-${Math.random().toString(36).slice(2, 6)}`;
  }
  throw errors.internal('Unable to generate unique slug');
}

const RANKING_HOME_TAGS = ['potential_starlet', 'rising_fictions', 'new_arrivals', 'completed_novel'];

async function list({ q, author, category, status, tag, page, pageSize }, viewer) {
  const where = [];
  const params = [];

  const viewingOwn =
    author && viewer && Number(author) === Number(viewer.id);
  if (status) {
    where.push('b.status = ?');
    params.push(status);
  } else {
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

  if (tag === 'ranking') {
    const ph = RANKING_HOME_TAGS.map(() => '?').join(', ');
    where.push(
      `EXISTS (SELECT 1 FROM book_tags btx WHERE btx.book_id = b.id AND btx.tag IN (${ph}))`,
    );
    params.push(...RANKING_HOME_TAGS);
  } else if (tag) {
    where.push(
      'EXISTS (SELECT 1 FROM book_tags btx WHERE btx.book_id = b.id AND btx.tag = ?)',
    );
    params.push(tag);
  }

  const { page: safePage, pageSize: safePageSize, offset } = clampPagination(page, pageSize);
  const orderBy =
    tag === 'ranking'
      ? '(b.score IS NULL) ASC, b.score DESC, b.updated_at DESC'
      : 'b.updated_at DESC';
  const sql =
    'SELECT b.*, u.display_name AS author_name, ' +
    '  (SELECT COUNT(*) FROM chapters c WHERE c.book_id = b.id AND c.status = "published") AS chapter_count ' +
    'FROM books b JOIN users u ON u.id = b.author_id ' +
    (where.length ? `WHERE ${where.join(' AND ')} ` : '') +
    `ORDER BY ${orderBy} LIMIT ${safePageSize} OFFSET ${offset}`;
  const [rows] = await pool.execute(sql, params);

  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM books b ${where.length ? `WHERE ${where.join(' AND ')}` : ''}`,
    params,
  );

  return {
    items: rows.map((r) => rowToBook(r)),
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
  const tags = await catalog.getContentTagsForBook(row.id);
  return rowToBook(row, { contentTags: tags });
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
  const tags = await catalog.getContentTagsForBook(row.id);
  return rowToBook(row, { contentTags: tags });
}

async function create(body, authorId, user) {
  const {
    title,
    synopsis,
    coverUrl,
    status,
    categoryId,
    languageId,
    contentTagIds,
    category,
    language,
  } = body;

  let langId = languageId != null ? Number(languageId) : null;
  if (langId == null) langId = await defaultLanguageId();
  await assertLanguageAllowed(langId, user);

  let catId = categoryId != null ? Number(categoryId) : null;
  if (catId != null) await assertCategoryAllowed(catId, user);

  const slug = await uniqueSlug(title);
  const [r] = await pool.execute(
    `INSERT INTO books (slug, author_id, title, synopsis, cover_url, category, language, category_id, language_id, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      slug,
      authorId,
      title,
      synopsis || null,
      coverUrl || null,
      category || null,
      language || 'en',
      catId,
      langId,
      status || 'draft',
    ],
  );
  const newId = r.insertId;
  await catalog.syncBookCategoryLanguageColumns(newId);
  if (Array.isArray(contentTagIds) && contentTagIds.length) {
    await catalog.setBookContentTags(newId, contentTagIds, { allowInactive: user.role === 'admin' });
  }
  const [b] = await pool.execute('SELECT slug FROM books WHERE id = ?', [newId]);
  return getBySlug(b[0].slug, user);
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
    coverUrl: 'cover_url',
    status: 'status',
  };
  for (const [k, col] of Object.entries(map)) {
    if (Object.prototype.hasOwnProperty.call(patch, k)) {
      fields.push(`${col} = ?`);
      params.push(patch[k]);
    }
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'category')) {
    fields.push('category = ?');
    params.push(patch.category);
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'language')) {
    fields.push('language = ?');
    params.push(patch.language);
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'categoryId')) {
    const cid = patch.categoryId === null ? null : Number(patch.categoryId);
    if (cid != null) await assertCategoryAllowed(cid, user);
    fields.push('category_id = ?');
    params.push(cid);
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'languageId')) {
    const lid = patch.languageId === null ? null : Number(patch.languageId);
    if (lid != null) await assertLanguageAllowed(lid, user);
    fields.push('language_id = ?');
    params.push(lid);
  }

  if (fields.length) {
    params.push(id);
    await pool.execute(`UPDATE books SET ${fields.join(', ')} WHERE id = ?`, params);
  }

  await catalog.syncBookCategoryLanguageColumns(id);

  if (Object.prototype.hasOwnProperty.call(patch, 'contentTagIds')) {
    await catalog.setBookContentTags(id, patch.contentTagIds || [], { allowInactive: user.role === 'admin' });
  }

  const row = await getById(id);
  return getBySlug(row.slug, user);
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
  if (book.cover_storage_key && book.cover_storage_key !== key) {
    try { await storage.remove(book.cover_storage_key); } catch (_) { /* ignore */ }
  }
  await pool.execute(
    'UPDATE books SET cover_url = ?, cover_storage_key = ? WHERE id = ?',
    [url, key, id],
  );
  const row = await getById(id);
  return getBySlug(row.slug, user);
}

module.exports = {
  list, getBySlug, getById, getByIdForViewer, create, update, remove, setCover,
  rowToBook, assertOwnerOrAdmin,
};
