'use strict';

const pool = require('../db/pool');
const { withTransaction } = require('../db/tx');
const { errors } = require('../utils/HttpError');
const { clampPagination } = require('../utils/pagination');
const auditSvc = require('./audit.service');

function rowSnapshot(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    if (v instanceof Date) out[k] = v.toISOString();
    else out[k] = v;
  }
  return out;
}

async function listBookChapters(bookId) {
  const [bookRows] = await pool.execute(
    `SELECT b.id, b.title, b.slug, b.author_id, u.display_name AS author_name
       FROM books b
       JOIN users u ON u.id = b.author_id
      WHERE b.id = ? AND b.recycled_at IS NULL
      LIMIT 1`,
    [bookId],
  );
  const book = bookRows[0];
  if (!book) throw errors.notFound('Book not found');

  const [chapters] = await pool.execute(
    `SELECT id, book_id, idx, title, status, is_paid, token_price,
            scheduled_publish_at, created_at, updated_at
       FROM chapters
      WHERE book_id = ? AND recycled_at IS NULL
      ORDER BY idx ASC`,
    [bookId],
  );

  return {
    book: {
      id: book.id,
      title: book.title,
      slug: book.slug,
      authorId: book.author_id,
      authorName: book.author_name,
    },
    items: chapters.map((c) => ({
      id: c.id,
      bookId: c.book_id,
      idx: Number(c.idx),
      title: c.title,
      status: c.status,
      isPaid: !!c.is_paid,
      tokenPrice: Number(c.token_price),
      scheduledPublishAt: c.scheduled_publish_at
        ? new Date(c.scheduled_publish_at).toISOString()
        : null,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    })),
  };
}

async function recycleChapter(chapterId, actor) {
  return withTransaction(async (conn) => {
    const [rows] = await conn.execute(
      `SELECT c.*, b.title AS book_title, b.recycled_at AS book_recycled
         FROM chapters c
         JOIN books b ON b.id = c.book_id
        WHERE c.id = ? FOR UPDATE`,
      [chapterId],
    );
    const chapter = rows[0];
    if (!chapter) throw errors.notFound('Chapter not found');
    if (chapter.recycled_at) throw errors.badRequest('Chapter is already in recycle bin');
    if (chapter.book_recycled) throw errors.badRequest('Book is in recycle bin');

    await conn.execute(
      'UPDATE chapters SET recycled_at = UTC_TIMESTAMP(), recycled_by = ? WHERE id = ?',
      [actor.id, chapterId],
    );

    const [ins] = await conn.execute(
      `INSERT INTO recycle_bin (entity_type, entity_id, book_id, title, snapshot, deleted_by)
       VALUES ('chapter', ?, ?, ?, ?, ?)`,
      [
        chapterId,
        chapter.book_id,
        chapter.title,
        JSON.stringify({
          chapter: rowSnapshot(chapter),
          bookTitle: chapter.book_title,
        }),
        actor.id,
      ],
    );

    await auditSvc.logAction({
      actor,
      action: 'book.chapter_recycle',
      targetType: 'chapter',
      targetId: chapterId,
      summary: `Moved chapter "${chapter.title}" to recycle bin`,
      meta: { bookId: chapter.book_id, recycleId: ins.insertId },
    });

    return { ok: true, recycleId: ins.insertId };
  });
}

async function recycleBook(bookId, actor) {
  return withTransaction(async (conn) => {
    const [bookRows] = await conn.execute(
      `SELECT b.*, u.display_name AS author_name
         FROM books b
         JOIN users u ON u.id = b.author_id
        WHERE b.id = ? FOR UPDATE`,
      [bookId],
    );
    const book = bookRows[0];
    if (!book) throw errors.notFound('Book not found');
    if (book.recycled_at) throw errors.badRequest('Book is already in recycle bin');

    const [chapterRows] = await conn.execute(
      'SELECT * FROM chapters WHERE book_id = ? AND recycled_at IS NULL',
      [bookId],
    );

    await conn.execute(
      'UPDATE books SET recycled_at = UTC_TIMESTAMP(), recycled_by = ? WHERE id = ?',
      [actor.id, bookId],
    );

    if (chapterRows.length) {
      await conn.execute(
        'UPDATE chapters SET recycled_at = UTC_TIMESTAMP(), recycled_by = ? WHERE book_id = ? AND recycled_at IS NULL',
        [actor.id, bookId],
      );
    }

    const [ins] = await conn.execute(
      `INSERT INTO recycle_bin (entity_type, entity_id, book_id, title, snapshot, deleted_by)
       VALUES ('book', ?, ?, ?, ?, ?)`,
      [
        bookId,
        bookId,
        book.title,
        JSON.stringify({
          book: rowSnapshot(book),
          chapterIds: chapterRows.map((c) => c.id),
          chapterCount: chapterRows.length,
        }),
        actor.id,
      ],
    );

    await auditSvc.logAction({
      actor,
      action: 'book.recycle',
      targetType: 'book',
      targetId: bookId,
      summary: `Moved book "${book.title}" to recycle bin (${chapterRows.length} chapters)`,
      meta: { recycleId: ins.insertId, chapterCount: chapterRows.length },
    });

    return { ok: true, recycleId: ins.insertId };
  });
}

async function restoreItem(recycleId, actor) {
  return withTransaction(async (conn) => {
    const [rows] = await conn.execute(
      'SELECT * FROM recycle_bin WHERE id = ? AND restored_at IS NULL FOR UPDATE',
      [recycleId],
    );
    const entry = rows[0];
    if (!entry) throw errors.notFound('Recycle entry not found');

    let snapshot = {};
    try {
      snapshot = typeof entry.snapshot === 'string'
        ? JSON.parse(entry.snapshot)
        : entry.snapshot;
    } catch (_e) {
      snapshot = {};
    }

    if (entry.entity_type === 'book') {
      const [bookRows] = await conn.execute(
        'SELECT id, recycled_at FROM books WHERE id = ? FOR UPDATE',
        [entry.entity_id],
      );
      if (!bookRows[0]?.recycled_at) throw errors.badRequest('Book is not in recycle bin');

      await conn.execute(
        'UPDATE books SET recycled_at = NULL, recycled_by = NULL WHERE id = ?',
        [entry.entity_id],
      );

      const chapterIds = Array.isArray(snapshot.chapterIds) ? snapshot.chapterIds : [];
      if (chapterIds.length) {
        const ph = chapterIds.map(() => '?').join(',');
        await conn.execute(
          `UPDATE chapters SET recycled_at = NULL, recycled_by = NULL
            WHERE id IN (${ph}) AND book_id = ?`,
          [...chapterIds, entry.entity_id],
        );
      }
    } else {
      const [chRows] = await conn.execute(
        `SELECT c.id, c.recycled_at, b.recycled_at AS book_recycled
           FROM chapters c
           JOIN books b ON b.id = c.book_id
          WHERE c.id = ? FOR UPDATE`,
        [entry.entity_id],
      );
      const chapter = chRows[0];
      if (!chapter?.recycled_at) throw errors.badRequest('Chapter is not in recycle bin');
      if (chapter.book_recycled) {
        throw errors.badRequest('Restore the parent book first');
      }

      await conn.execute(
        'UPDATE chapters SET recycled_at = NULL, recycled_by = NULL WHERE id = ?',
        [entry.entity_id],
      );
    }

    await conn.execute(
      'UPDATE recycle_bin SET restored_at = UTC_TIMESTAMP(), restored_by = ? WHERE id = ?',
      [actor.id, recycleId],
    );

    await auditSvc.logAction({
      actor,
      action: 'recycle.restore',
      targetType: entry.entity_type,
      targetId: entry.entity_id,
      summary: `Restored ${entry.entity_type} "${entry.title}" from recycle bin`,
      meta: { recycleId },
    });

    return { ok: true, entityType: entry.entity_type, entityId: entry.entity_id };
  });
}

async function listRecycle({ q, entityType, page, pageSize }) {
  const where = ['r.restored_at IS NULL'];
  const params = [];
  if (q) {
    where.push('(r.title LIKE ? OR r.snapshot LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like);
  }
  if (entityType) {
    where.push('r.entity_type = ?');
    params.push(entityType);
  }

  const { page: safePage, pageSize: safePageSize, offset } = clampPagination(page, pageSize);
  const whereSql = `WHERE ${where.join(' AND ')}`;

  const [rows] = await pool.execute(
    `SELECT r.*, u.display_name AS deleted_by_name, u.email AS deleted_by_email
       FROM recycle_bin r
       JOIN users u ON u.id = r.deleted_by
       ${whereSql}
       ORDER BY r.deleted_at DESC
       LIMIT ${safePageSize} OFFSET ${offset}`,
    params,
  );
  const [c] = await pool.execute(
    `SELECT COUNT(*) AS total FROM recycle_bin r ${whereSql}`,
    params,
  );

  return {
    items: rows.map((r) => {
      let snapshot = null;
      try {
        snapshot = typeof r.snapshot === 'string' ? JSON.parse(r.snapshot) : r.snapshot;
      } catch (_e) {
        snapshot = null;
      }
      return {
        id: r.id,
        entityType: r.entity_type,
        entityId: r.entity_id,
        bookId: r.book_id,
        title: r.title,
        snapshot,
        deletedBy: {
          id: r.deleted_by,
          displayName: r.deleted_by_name,
          email: r.deleted_by_email,
        },
        deletedAt: r.deleted_at,
      };
    }),
    page: safePage,
    pageSize: safePageSize,
    total: Number(c[0].total),
  };
}

module.exports = {
  listBookChapters,
  recycleBook,
  recycleChapter,
  restoreItem,
  listRecycle,
};
