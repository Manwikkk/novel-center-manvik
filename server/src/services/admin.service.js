'use strict';

const pool = require('../db/pool');
const { withTransaction } = require('../db/tx');
const { errors } = require('../utils/HttpError');
const { publicUser } = require('./auth.service');
const { clampPagination } = require('../utils/pagination');

async function listUsers({ q, role, status, page, pageSize }) {
  const where = [];
  const params = [];
  if (q) {
    where.push('(u.email LIKE ? OR u.display_name LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like);
  }
  if (role) { where.push('u.role = ?'); params.push(role); }
  if (status) { where.push('u.status = ?'); params.push(status); }

  const { page: safePage, pageSize: safePageSize, offset } = clampPagination(page, pageSize);
  const [rows] = await pool.execute(
    `SELECT u.*, COALESCE(w.balance, 0) AS wallet_balance
     FROM users u LEFT JOIN wallets w ON w.user_id = u.id
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY u.created_at DESC LIMIT ${safePageSize} OFFSET ${offset}`,
    params,
  );
  const [c] = await pool.execute(
    `SELECT COUNT(*) AS total FROM users u ${where.length ? `WHERE ${where.join(' AND ')}` : ''}`,
    params,
  );
  return {
    items: rows.map((r) => ({ ...publicUser(r), wallet: { balance: Number(r.wallet_balance) } })),
    page: safePage, pageSize: safePageSize, total: Number(c[0].total),
  };
}

async function updateUser(id, patch) {
  const [u] = await pool.execute('SELECT id FROM users WHERE id = ?', [id]);
  if (!u[0]) throw errors.notFound('User not found');

  return withTransaction(async (conn) => {
    if (patch.role || patch.status) {
      const fields = [];
      const params = [];
      if (patch.role) { fields.push('role = ?'); params.push(patch.role); }
      if (patch.status) { fields.push('status = ?'); params.push(patch.status); }
      params.push(id);
      await conn.execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params);
    }
    if (patch.walletDelta) {
      await conn.execute(
        'UPDATE wallets SET balance = GREATEST(CAST(balance AS SIGNED) + ?, 0) WHERE user_id = ?',
        [patch.walletDelta, id],
      );
      await conn.execute(
        `INSERT INTO transactions (user_id, type, tokens_delta, meta)
         VALUES (?, 'admin_adjust', ?, JSON_OBJECT('reason', 'admin_panel'))`,
        [id, patch.walletDelta],
      );
    }
    const [rows] = await conn.execute(
      `SELECT u.*, COALESCE(w.balance, 0) AS wallet_balance
       FROM users u LEFT JOIN wallets w ON w.user_id = u.id WHERE u.id = ?`,
      [id],
    );
    return { ...publicUser(rows[0]), wallet: { balance: Number(rows[0].wallet_balance) } };
  });
}

async function listBooks({ q, status, page, pageSize }) {
  const where = [];
  const params = [];
  if (q) { where.push('(b.title LIKE ? OR b.slug LIKE ?)'); const like = `%${q}%`; params.push(like, like); }
  if (status) { where.push('b.status = ?'); params.push(status); }

  const { page: safePage, pageSize: safePageSize, offset } = clampPagination(page, pageSize);
  const [rows] = await pool.execute(
    `SELECT b.*, u.display_name AS author_name,
       (SELECT COUNT(*) FROM chapters c WHERE c.book_id = b.id) AS chapter_count
     FROM books b JOIN users u ON u.id = b.author_id
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY b.updated_at DESC LIMIT ${safePageSize} OFFSET ${offset}`,
    params,
  );
  const [c] = await pool.execute(
    `SELECT COUNT(*) AS total FROM books b ${where.length ? `WHERE ${where.join(' AND ')}` : ''}`,
    params,
  );
  return {
    items: rows.map((r) => ({
      id: r.id, slug: r.slug, title: r.title,
      authorId: r.author_id, authorName: r.author_name,
      status: r.status, category: r.category, language: r.language,
      coverUrl: r.cover_url, chapterCount: Number(r.chapter_count),
      createdAt: r.created_at, updatedAt: r.updated_at,
    })),
    page: safePage, pageSize: safePageSize, total: Number(c[0].total),
  };
}

async function listTransactions({ type, userId, page, pageSize }) {
  const where = [];
  const params = [];
  if (type) { where.push('t.type = ?'); params.push(type); }
  if (userId) { where.push('t.user_id = ?'); params.push(userId); }

  const { page: safePage, pageSize: safePageSize, offset } = clampPagination(page, pageSize);
  const [rows] = await pool.execute(
    `SELECT t.*, u.display_name, u.email
     FROM transactions t JOIN users u ON u.id = t.user_id
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY t.created_at DESC LIMIT ${safePageSize} OFFSET ${offset}`,
    params,
  );
  const [c] = await pool.execute(
    `SELECT COUNT(*) AS total FROM transactions t ${where.length ? `WHERE ${where.join(' AND ')}` : ''}`,
    params,
  );
  return {
    items: rows.map((r) => ({
      id: r.id, userId: r.user_id, userName: r.display_name, userEmail: r.email,
      type: r.type, tokensDelta: Number(r.tokens_delta),
      refChapterId: r.ref_chapter_id, meta: r.meta, createdAt: r.created_at,
    })),
    page: safePage, pageSize: safePageSize, total: Number(c[0].total),
  };
}

async function listComments({ status, bookId, chapterId, chapterNull, order, page, pageSize }) {
  const where = [];
  const params = [];
  if (status) { where.push('c.status = ?'); params.push(status); }
  if (bookId) {
    // A comment belongs to a book either directly (c.book_id) or via its chapter.
    where.push('(c.book_id = ? OR ch.book_id = ?)');
    params.push(bookId, bookId);
  }
  if (chapterId) { where.push('c.chapter_id = ?'); params.push(chapterId); }
  if (chapterNull) { where.push('c.chapter_id IS NULL'); }

  const sortDir = String(order).toLowerCase() === 'desc' ? 'DESC' : 'ASC';
  const { page: safePage, pageSize: safePageSize, offset } = clampPagination(page, pageSize);

  const [rows] = await pool.execute(
    `SELECT c.*,
            u.display_name, u.email, u.avatar_url,
            COALESCE(b.title, bc.title)   AS book_title,
            COALESCE(b.slug,  bc.slug)    AS book_slug,
            COALESCE(b.id,    bc.id)      AS effective_book_id,
            ch.idx                        AS chapter_idx,
            ch.title                      AS chapter_title
       FROM comments c
       JOIN users u    ON u.id = c.user_id
       LEFT JOIN books    b  ON b.id  = c.book_id
       LEFT JOIN chapters ch ON ch.id = c.chapter_id
       LEFT JOIN books    bc ON bc.id = ch.book_id
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY c.created_at ${sortDir} LIMIT ${safePageSize} OFFSET ${offset}`,
    params,
  );

  const [c] = await pool.execute(
    `SELECT COUNT(*) AS total
       FROM comments c
       LEFT JOIN chapters ch ON ch.id = c.chapter_id
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}`,
    params,
  );

  return {
    items: rows.map((r) => ({
      id: r.id,
      body: r.body,
      status: r.status,
      bookId: r.effective_book_id,
      chapterId: r.chapter_id,
      parentId: r.parent_id,
      bookTitle: r.book_title,
      bookSlug: r.book_slug,
      chapterIdx: r.chapter_idx,
      chapterTitle: r.chapter_title,
      author: {
        id: r.user_id,
        displayName: r.display_name,
        email: r.email,
        avatarUrl: r.avatar_url,
      },
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })),
    page: safePage,
    pageSize: safePageSize,
    total: Number(c[0].total),
  };
}

// Aggregate: per-book comment counts (paginated).
async function commentsByBook({ q, page, pageSize }) {
  const where = [];
  const params = [];
  if (q) {
    where.push('(b.title LIKE ? OR u.display_name LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const { page: safePage, pageSize: safePageSize, offset } = clampPagination(page, pageSize);

  // Book-scoped totals via UNION of book_id column and chapter->book lookup.
  const [rows] = await pool.execute(
    `SELECT b.id        AS book_id,
            b.slug,
            b.title,
            b.cover_url,
            b.status,
            u.id          AS author_id,
            u.display_name AS author_name,
            COALESCE((
              SELECT COUNT(*) FROM comments c
                LEFT JOIN chapters ch ON ch.id = c.chapter_id
               WHERE c.book_id = b.id OR ch.book_id = b.id
            ), 0) AS total_comments,
            COALESCE((
              SELECT COUNT(*) FROM comments c
                LEFT JOIN chapters ch ON ch.id = c.chapter_id
               WHERE (c.book_id = b.id OR ch.book_id = b.id) AND c.status = 'visible'
            ), 0) AS visible_comments,
            COALESCE((
              SELECT COUNT(*) FROM comments c
                LEFT JOIN chapters ch ON ch.id = c.chapter_id
               WHERE (c.book_id = b.id OR ch.book_id = b.id) AND c.status = 'hidden'
            ), 0) AS hidden_comments,
            COALESCE((
              SELECT COUNT(*) FROM comments c
                LEFT JOIN chapters ch ON ch.id = c.chapter_id
               WHERE (c.book_id = b.id OR ch.book_id = b.id) AND c.status = 'deleted'
            ), 0) AS deleted_comments,
            (
              SELECT MAX(c.created_at) FROM comments c
                LEFT JOIN chapters ch ON ch.id = c.chapter_id
               WHERE c.book_id = b.id OR ch.book_id = b.id
            ) AS last_comment_at
       FROM books b
       JOIN users u ON u.id = b.author_id
       ${whereSql}
       ORDER BY (last_comment_at IS NULL) ASC, last_comment_at DESC, b.title ASC
       LIMIT ${safePageSize} OFFSET ${offset}`,
    params,
  );

  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM books b JOIN users u ON u.id = b.author_id ${whereSql}`,
    params,
  );

  return {
    items: rows.map((r) => ({
      bookId: r.book_id,
      slug: r.slug,
      title: r.title,
      coverUrl: r.cover_url,
      status: r.status,
      author: { id: r.author_id, displayName: r.author_name },
      totals: {
        total: Number(r.total_comments),
        visible: Number(r.visible_comments),
        hidden: Number(r.hidden_comments),
        deleted: Number(r.deleted_comments),
      },
      lastCommentAt: r.last_comment_at,
    })),
    page: safePage,
    pageSize: safePageSize,
    total: Number(countRows[0].total),
  };
}

// Aggregate: per-chapter comment counts within a single book.
// A synthetic { chapterId: null, ... } "book-level" row is returned as the first item on page 1 if any book-level comments exist.
async function commentsByChapter({ bookId, page, pageSize }) {
  const [bookRows] = await pool.execute(
    `SELECT b.id, b.slug, b.title, b.cover_url, b.status,
            u.id AS author_id, u.display_name AS author_name
       FROM books b
       JOIN users u ON u.id = b.author_id
      WHERE b.id = ? LIMIT 1`,
    [bookId],
  );
  const book = bookRows[0];
  if (!book) throw errors.notFound('Book not found');

  const { page: safePage, pageSize: safePageSize, offset } = clampPagination(page, pageSize);

  const [rows] = await pool.execute(
    `SELECT ch.id  AS chapter_id, ch.idx, ch.title, ch.status,
            COALESCE((SELECT COUNT(*) FROM comments c WHERE c.chapter_id = ch.id), 0)                                  AS total_comments,
            COALESCE((SELECT COUNT(*) FROM comments c WHERE c.chapter_id = ch.id AND c.status = 'visible'), 0)         AS visible_comments,
            COALESCE((SELECT COUNT(*) FROM comments c WHERE c.chapter_id = ch.id AND c.status = 'hidden'), 0)          AS hidden_comments,
            COALESCE((SELECT COUNT(*) FROM comments c WHERE c.chapter_id = ch.id AND c.status = 'deleted'), 0)         AS deleted_comments,
            (SELECT MAX(c.created_at) FROM comments c WHERE c.chapter_id = ch.id)                                       AS last_comment_at
       FROM chapters ch
      WHERE ch.book_id = ?
      ORDER BY ch.idx ASC
      LIMIT ${safePageSize} OFFSET ${offset}`,
    [bookId],
  );

  const [countRows] = await pool.execute(
    'SELECT COUNT(*) AS total FROM chapters WHERE book_id = ?',
    [bookId],
  );

  // Book-level (chapter_id IS NULL && book_id = bookId) bucket
  const [[bookLevel]] = await pool.execute(
    `SELECT
        COUNT(*)                                                 AS total_comments,
        SUM(CASE WHEN status = 'visible' THEN 1 ELSE 0 END)      AS visible_comments,
        SUM(CASE WHEN status = 'hidden'  THEN 1 ELSE 0 END)      AS hidden_comments,
        SUM(CASE WHEN status = 'deleted' THEN 1 ELSE 0 END)      AS deleted_comments,
        MAX(created_at)                                          AS last_comment_at
       FROM comments
      WHERE book_id = ? AND chapter_id IS NULL`,
    [bookId],
  );

  const bookLevelEntry = {
    chapterId: null,
    idx: 0,
    title: 'Book-level comments',
    status: 'published',
    totals: {
      total: Number(bookLevel.total_comments || 0),
      visible: Number(bookLevel.visible_comments || 0),
      hidden: Number(bookLevel.hidden_comments || 0),
      deleted: Number(bookLevel.deleted_comments || 0),
    },
    lastCommentAt: bookLevel.last_comment_at || null,
  };

  const items = rows.map((r) => ({
    chapterId: r.chapter_id,
    idx: Number(r.idx),
    title: r.title,
    status: r.status,
    totals: {
      total: Number(r.total_comments),
      visible: Number(r.visible_comments),
      hidden: Number(r.hidden_comments),
      deleted: Number(r.deleted_comments),
    },
    lastCommentAt: r.last_comment_at,
  }));

  return {
    book: {
      id: book.id,
      slug: book.slug,
      title: book.title,
      coverUrl: book.cover_url,
      status: book.status,
      author: { id: book.author_id, displayName: book.author_name },
    },
    bookLevel: bookLevelEntry,
    items,
    page: safePage,
    pageSize: safePageSize,
    total: Number(countRows[0].total),
  };
}

async function stats() {
  const [[u]] = await pool.execute("SELECT COUNT(*) AS c FROM users");
  const [[a]] = await pool.execute("SELECT COUNT(*) AS c FROM users WHERE role = 'author'");
  const [[b]] = await pool.execute("SELECT COUNT(*) AS c FROM books");
  const [[bp]] = await pool.execute("SELECT COUNT(*) AS c FROM books WHERE status = 'published'");
  const [[ch]] = await pool.execute("SELECT COUNT(*) AS c FROM chapters");
  const [[t]] = await pool.execute("SELECT COUNT(*) AS c, COALESCE(SUM(tokens_delta), 0) AS s FROM transactions WHERE type = 'unlock'");
  const [[purchases]] = await pool.execute("SELECT COALESCE(SUM(tokens_delta), 0) AS s FROM transactions WHERE type = 'purchase'");
  return {
    users: Number(u.c),
    authors: Number(a.c),
    books: Number(b.c),
    publishedBooks: Number(bp.c),
    chapters: Number(ch.c),
    unlocks: Number(t.c),
    tokensSpent: Math.abs(Number(t.s)),
    tokensPurchased: Number(purchases.s),
  };
}

module.exports = {
  listUsers, updateUser, listBooks, listTransactions,
  listComments, commentsByBook, commentsByChapter,
  stats,
};
