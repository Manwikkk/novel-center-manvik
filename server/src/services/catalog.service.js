'use strict';

const slugify = require('slugify');
const pool = require('../db/pool');
const { errors } = require('../utils/HttpError');

function toSlug(base) {
  const s = slugify(String(base || 'item'), { lower: true, strict: true }).slice(0, 64) || 'item';
  return s;
}

async function uniqueSlugIn(table, base, excludeId = null) {
  let candidate = toSlug(base);
  let i = 0;
  while (i < 40) {
    const params = [candidate];
    let sql = `SELECT id FROM ${table} WHERE slug = ? LIMIT 1`;
    if (excludeId) {
      sql = `SELECT id FROM ${table} WHERE slug = ? AND id <> ? LIMIT 1`;
      params.push(excludeId);
    }
    const [rows] = await pool.execute(sql, params);
    if (!rows.length) return candidate;
    i += 1;
    candidate = `${toSlug(base)}-${Math.random().toString(36).slice(2, 5)}`;
  }
  throw errors.internal('Unable to allocate slug');
}

// ---------------------------------------------------------------------------
// Public lists (active only)
// ---------------------------------------------------------------------------

async function listCategoriesPublic() {
  const [rows] = await pool.execute(
    `SELECT id, slug, label, sort_order
       FROM catalog_categories
      WHERE is_active = 1
      ORDER BY sort_order ASC, label ASC`,
  );
  return rows.map((r) => ({
    id: Number(r.id),
    slug: r.slug,
    label: r.label,
    sortOrder: Number(r.sort_order),
  }));
}

async function listLanguagesPublic() {
  const [rows] = await pool.execute(
    `SELECT id, code, label, sort_order
       FROM catalog_languages
      WHERE is_active = 1
      ORDER BY sort_order ASC, label ASC`,
  );
  return rows.map((r) => ({
    id: Number(r.id),
    code: r.code,
    label: r.label,
    sortOrder: Number(r.sort_order),
  }));
}

async function listContentTagsPublic() {
  const [rows] = await pool.execute(
    `SELECT id, slug, label, sort_order
       FROM catalog_content_tags
      WHERE is_active = 1
      ORDER BY sort_order ASC, label ASC`,
  );
  return rows.map((r) => ({
    id: Number(r.id),
    slug: r.slug,
    label: r.label,
    sortOrder: Number(r.sort_order),
  }));
}

// ---------------------------------------------------------------------------
// Admin — full lists
// ---------------------------------------------------------------------------

async function listCategoriesAdmin() {
  const [rows] = await pool.execute(
    `SELECT c.*,
            (SELECT COUNT(*) FROM books b WHERE b.category_id = c.id) AS book_count
       FROM catalog_categories c
       ORDER BY c.sort_order ASC, c.label ASC`,
  );
  return rows.map(mapCategoryRow);
}

async function listLanguagesAdmin() {
  const [rows] = await pool.execute(
    `SELECT l.*,
            (SELECT COUNT(*) FROM books b WHERE b.language_id = l.id) AS book_count
       FROM catalog_languages l
       ORDER BY l.sort_order ASC, l.label ASC`,
  );
  return rows.map(mapLanguageRow);
}

async function listContentTagsAdmin() {
  const [rows] = await pool.execute(
    `SELECT t.*,
            (SELECT COUNT(*) FROM book_content_tags bct WHERE bct.tag_id = t.id) AS book_count
       FROM catalog_content_tags t
       ORDER BY t.sort_order ASC, t.label ASC`,
  );
  return rows.map(mapTagRow);
}

function mapCategoryRow(r) {
  return {
    id: Number(r.id),
    slug: r.slug,
    label: r.label,
    sortOrder: Number(r.sort_order),
    isActive: Boolean(r.is_active),
    bookCount: Number(r.book_count) || 0,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapLanguageRow(r) {
  return {
    id: Number(r.id),
    code: r.code,
    label: r.label,
    sortOrder: Number(r.sort_order),
    isActive: Boolean(r.is_active),
    bookCount: Number(r.book_count) || 0,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapTagRow(r) {
  return {
    id: Number(r.id),
    slug: r.slug,
    label: r.label,
    sortOrder: Number(r.sort_order),
    isActive: Boolean(r.is_active),
    bookCount: Number(r.book_count) || 0,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Admin CRUD
// ---------------------------------------------------------------------------

async function createCategory({ label, slug, sortOrder, isActive }) {
  if (!label || !String(label).trim()) throw errors.badRequest('label is required');
  const finalSlug = slug && String(slug).trim() ? toSlug(slug) : await uniqueSlugIn('catalog_categories', label);
  const [ins] = await pool.execute(
    `INSERT INTO catalog_categories (slug, label, sort_order, is_active)
     VALUES (?, ?, ?, ?)`,
    [finalSlug, String(label).trim(), Number.isFinite(sortOrder) ? sortOrder : 0, isActive === false ? 0 : 1],
  );
  const [rows] = await pool.execute('SELECT * FROM catalog_categories WHERE id = ?', [ins.insertId]);
  return mapCategoryRow({ ...rows[0], book_count: 0 });
}

async function updateCategory(id, patch) {
  const [cur] = await pool.execute('SELECT * FROM catalog_categories WHERE id = ?', [id]);
  if (!cur[0]) throw errors.notFound('Category not found');
  const fields = [];
  const params = [];
  if (patch.label != null) {
    fields.push('label = ?');
    params.push(String(patch.label).trim());
  }
  if (patch.slug != null) {
    fields.push('slug = ?');
    params.push(toSlug(patch.slug));
  }
  if (patch.sortOrder != null) {
    fields.push('sort_order = ?');
    params.push(Number(patch.sortOrder));
  }
  if (patch.isActive != null) {
    fields.push('is_active = ?');
    params.push(patch.isActive ? 1 : 0);
  }
  if (!fields.length) return mapCategoryRow({ ...cur[0], book_count: 0 });
  params.push(id);
  await pool.execute(`UPDATE catalog_categories SET ${fields.join(', ')} WHERE id = ?`, params);
  const [rows] = await pool.execute(
    `SELECT c.*, (SELECT COUNT(*) FROM books b WHERE b.category_id = c.id) AS book_count FROM catalog_categories c WHERE c.id = ?`,
    [id],
  );
  return mapCategoryRow(rows[0]);
}

async function deleteCategory(id) {
  const [u] = await pool.execute('SELECT COUNT(*) AS n FROM books WHERE category_id = ?', [id]);
  if (Number(u[0].n) > 0) throw errors.badRequest('Cannot delete: books still use this category');
  const [r] = await pool.execute('DELETE FROM catalog_categories WHERE id = ?', [id]);
  if (!r.affectedRows) throw errors.notFound('Category not found');
  return { ok: true };
}

async function createLanguage({ code, label, sortOrder, isActive }) {
  if (!code || !label) throw errors.badRequest('code and label are required');
  const c = String(code).trim().toLowerCase().slice(0, 20);
  const [ins] = await pool.execute(
    `INSERT INTO catalog_languages (code, label, sort_order, is_active) VALUES (?, ?, ?, ?)`,
    [c, String(label).trim(), Number.isFinite(sortOrder) ? sortOrder : 0, isActive === false ? 0 : 1],
  );
  const [rows] = await pool.execute('SELECT * FROM catalog_languages WHERE id = ?', [ins.insertId]);
  return mapLanguageRow({ ...rows[0], book_count: 0 });
}

async function updateLanguage(id, patch) {
  const [cur] = await pool.execute('SELECT * FROM catalog_languages WHERE id = ?', [id]);
  if (!cur[0]) throw errors.notFound('Language not found');
  const fields = [];
  const params = [];
  if (patch.code != null) {
    fields.push('code = ?');
    params.push(String(patch.code).trim().toLowerCase().slice(0, 20));
  }
  if (patch.label != null) {
    fields.push('label = ?');
    params.push(String(patch.label).trim());
  }
  if (patch.sortOrder != null) {
    fields.push('sort_order = ?');
    params.push(Number(patch.sortOrder));
  }
  if (patch.isActive != null) {
    fields.push('is_active = ?');
    params.push(patch.isActive ? 1 : 0);
  }
  if (!fields.length) return mapLanguageRow({ ...cur[0], book_count: 0 });
  params.push(id);
  await pool.execute(`UPDATE catalog_languages SET ${fields.join(', ')} WHERE id = ?`, params);
  const [rows] = await pool.execute(
    `SELECT l.*, (SELECT COUNT(*) FROM books b WHERE b.language_id = l.id) AS book_count FROM catalog_languages l WHERE l.id = ?`,
    [id],
  );
  return mapLanguageRow(rows[0]);
}

async function deleteLanguage(id) {
  const [u] = await pool.execute('SELECT COUNT(*) AS n FROM books WHERE language_id = ?', [id]);
  if (Number(u[0].n) > 0) throw errors.badRequest('Cannot delete: books still use this language');
  const [r] = await pool.execute('DELETE FROM catalog_languages WHERE id = ?', [id]);
  if (!r.affectedRows) throw errors.notFound('Language not found');
  return { ok: true };
}

async function findOrCreateContentTag({ label }) {
  const trimmed = String(label || '').trim();
  if (!trimmed) throw errors.badRequest('label is required');
  const [rows] = await pool.execute(
    `SELECT t.*,
            (SELECT COUNT(*) FROM book_content_tags bct WHERE bct.tag_id = t.id) AS book_count
       FROM catalog_content_tags t
      WHERE LOWER(t.label) = LOWER(?)
      LIMIT 1`,
    [trimmed],
  );
  if (rows[0]) {
    if (!rows[0].is_active) {
      await pool.execute('UPDATE catalog_content_tags SET is_active = 1 WHERE id = ?', [rows[0].id]);
      rows[0].is_active = 1;
    }
    return mapTagRow(rows[0]);
  }
  return createContentTag({ label: trimmed, isActive: true });
}

async function createContentTag({ label, slug, sortOrder, isActive }) {
  if (!label || !String(label).trim()) throw errors.badRequest('label is required');
  const finalSlug = slug && String(slug).trim() ? toSlug(slug) : await uniqueSlugIn('catalog_content_tags', label);
  const [ins] = await pool.execute(
    `INSERT INTO catalog_content_tags (slug, label, sort_order, is_active) VALUES (?, ?, ?, ?)`,
    [finalSlug, String(label).trim(), Number.isFinite(sortOrder) ? sortOrder : 0, isActive === false ? 0 : 1],
  );
  const [rows] = await pool.execute('SELECT * FROM catalog_content_tags WHERE id = ?', [ins.insertId]);
  return mapTagRow({ ...rows[0], book_count: 0 });
}

async function updateContentTag(id, patch) {
  const [cur] = await pool.execute('SELECT * FROM catalog_content_tags WHERE id = ?', [id]);
  if (!cur[0]) throw errors.notFound('Tag not found');
  const fields = [];
  const params = [];
  if (patch.label != null) {
    fields.push('label = ?');
    params.push(String(patch.label).trim());
  }
  if (patch.slug != null) {
    fields.push('slug = ?');
    params.push(toSlug(patch.slug));
  }
  if (patch.sortOrder != null) {
    fields.push('sort_order = ?');
    params.push(Number(patch.sortOrder));
  }
  if (patch.isActive != null) {
    fields.push('is_active = ?');
    params.push(patch.isActive ? 1 : 0);
  }
  if (!fields.length) return mapTagRow({ ...cur[0], book_count: 0 });
  params.push(id);
  await pool.execute(`UPDATE catalog_content_tags SET ${fields.join(', ')} WHERE id = ?`, params);
  const [rows] = await pool.execute(
    `SELECT t.*, (SELECT COUNT(*) FROM book_content_tags bct WHERE bct.tag_id = t.id) AS book_count
       FROM catalog_content_tags t WHERE t.id = ?`,
    [id],
  );
  return mapTagRow(rows[0]);
}

async function deleteContentTag(id) {
  const [r] = await pool.execute('DELETE FROM catalog_content_tags WHERE id = ?', [id]);
  if (!r.affectedRows) throw errors.notFound('Tag not found');
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Book ↔ content tags
// ---------------------------------------------------------------------------

// Only active tags are surfaced on a novel; a deactivated tag behaves like a removed one.
async function getContentTagsForBook(bookId) {
  const [rows] = await pool.execute(
    `SELECT t.id, t.slug, t.label
       FROM book_content_tags bct
       JOIN catalog_content_tags t ON t.id = bct.tag_id
      WHERE bct.book_id = ? AND t.is_active = 1
      ORDER BY t.sort_order ASC, t.label ASC`,
    [bookId],
  );
  return rows.map((r) => ({ id: Number(r.id), slug: r.slug, label: r.label }));
}

async function setBookContentTags(bookId, tagIds, { allowInactive = false } = {}) {
  const ids = [...new Set((tagIds || []).map(Number).filter((n) => n > 0))];
  if (ids.length) {
    const ph = ids.map(() => '?').join(',');
    const [ok] = await pool.execute(
      allowInactive
        ? `SELECT id FROM catalog_content_tags WHERE id IN (${ph})`
        : `SELECT id FROM catalog_content_tags WHERE id IN (${ph}) AND is_active = 1`,
      ids,
    );
    if (ok.length !== ids.length) throw errors.badRequest('One or more tags are invalid or inactive');
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute('DELETE FROM book_content_tags WHERE book_id = ?', [bookId]);
    for (const tid of ids) {
      await conn.execute('INSERT INTO book_content_tags (book_id, tag_id) VALUES (?, ?)', [bookId, tid]);
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
  return getContentTagsForBook(bookId);
}

async function syncBookCategoryLanguageColumns(bookId) {
  await pool.execute(
    `UPDATE books b
       LEFT JOIN catalog_categories c ON c.id = b.category_id
       LEFT JOIN catalog_languages l ON l.id = b.language_id
        SET b.category = c.label,
            b.language = COALESCE(l.code, b.language)
      WHERE b.id = ?`,
    [bookId],
  );
}

module.exports = {
  listCategoriesPublic,
  listLanguagesPublic,
  listContentTagsPublic,
  listCategoriesAdmin,
  listLanguagesAdmin,
  listContentTagsAdmin,
  createCategory,
  updateCategory,
  deleteCategory,
  createLanguage,
  updateLanguage,
  deleteLanguage,
  createContentTag,
  findOrCreateContentTag,
  updateContentTag,
  deleteContentTag,
  getContentTagsForBook,
  setBookContentTags,
  syncBookCategoryLanguageColumns,
};
