'use strict';

const pool = require('../db/pool');
const { errors } = require('../utils/HttpError');

function htmlToWordCount(html) {
  if (!html) return 0;
  const text = String(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return 0;
  return text.split(' ').filter(Boolean).length;
}

function pctChange(current, previous) {
  const c = Number(current) || 0;
  const p = Number(previous) || 0;
  if (p === 0) return c === 0 ? 0 : 100;
  return ((c - p) / p) * 100;
}

async function getEarnings(authorId) {
  const [[totals]] = await pool.execute(
    `SELECT
       COUNT(DISTINCT b.id)             AS book_count,
       COUNT(DISTINCT c.id)             AS chapter_count,
       COALESCE(SUM(cu.tokens_spent),0) AS lifetime_tokens,
       COUNT(cu.user_id)                AS unlocks_total,
       COUNT(DISTINCT cu.user_id)       AS unique_readers
     FROM books b
     LEFT JOIN chapters c        ON c.book_id    = b.id
     LEFT JOIN chapter_unlocks cu ON cu.chapter_id = c.id
     WHERE b.author_id = ?`,
    [authorId],
  );

  const [[month]] = await pool.execute(
    `SELECT COALESCE(SUM(cu.tokens_spent),0) AS month_tokens
     FROM chapter_unlocks cu
     JOIN chapters c ON c.id      = cu.chapter_id
     JOIN books    b ON b.id      = c.book_id
     WHERE b.author_id = ? AND cu.unlocked_at >= (NOW() - INTERVAL 30 DAY)`,
    [authorId],
  );

  const [byBook] = await pool.execute(
    `SELECT
       b.id, b.title, b.slug, b.status,
       COUNT(DISTINCT c.id)             AS chapter_count,
       COUNT(cu.user_id)                AS unlocks,
       COALESCE(SUM(cu.tokens_spent),0) AS tokens
     FROM books b
     LEFT JOIN chapters c        ON c.book_id    = b.id
     LEFT JOIN chapter_unlocks cu ON cu.chapter_id = c.id
     WHERE b.author_id = ?
     GROUP BY b.id, b.title, b.slug, b.status
     ORDER BY tokens DESC, b.created_at DESC
     LIMIT 100`,
    [authorId],
  );

  return {
    totals: {
      books: Number(totals.book_count),
      chapters: Number(totals.chapter_count),
      lifetimeTokens: Number(totals.lifetime_tokens),
      unlocksTotal: Number(totals.unlocks_total),
      uniqueReaders: Number(totals.unique_readers),
      monthTokens: Number(month.month_tokens),
    },
    byBook: byBook.map((r) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      status: r.status,
      chapterCount: Number(r.chapter_count),
      unlocks: Number(r.unlocks),
      tokens: Number(r.tokens),
    })),
  };
}

async function getBookStats(authorId, bookId) {
  const [books] = await pool.execute(
    `SELECT b.id, b.title, b.slug, b.status, b.cover_url, b.updated_at, b.score
     FROM books b WHERE b.id = ? AND b.author_id = ? LIMIT 1`,
    [bookId, authorId],
  );
  const book = books[0];
  if (!book) throw errors.notFound('Book not found');

  const [[libNow]] = await pool.execute(
    `SELECT COUNT(*) AS c FROM library WHERE book_id = ? AND added_at >= (NOW() - INTERVAL 1 DAY)`,
    [bookId],
  );
  const [[libPrev]] = await pool.execute(
    `SELECT COUNT(*) AS c FROM library WHERE book_id = ?
       AND added_at >= (NOW() - INTERVAL 2 DAY) AND added_at < (NOW() - INTERVAL 1 DAY)`,
    [bookId],
  );
  const [[libTotal]] = await pool.execute(
    'SELECT COUNT(*) AS c FROM library WHERE book_id = ?',
    [bookId],
  );

  const [[viewsNow]] = await pool.execute(
    `SELECT COUNT(*) AS c FROM reader_progress WHERE book_id = ?
       AND updated_at >= (NOW() - INTERVAL 1 DAY)`,
    [bookId],
  );
  const [[viewsPrev]] = await pool.execute(
    `SELECT COUNT(*) AS c FROM reader_progress WHERE book_id = ?
       AND updated_at >= (NOW() - INTERVAL 2 DAY) AND updated_at < (NOW() - INTERVAL 1 DAY)`,
    [bookId],
  );
  const [[viewsTotal]] = await pool.execute(
    'SELECT COUNT(DISTINCT user_id) AS c FROM reader_progress WHERE book_id = ?',
    [bookId],
  );

  const [[earnNow]] = await pool.execute(
    `SELECT COALESCE(SUM(cu.tokens_spent), 0) AS t FROM chapter_unlocks cu
     JOIN chapters c ON c.id = cu.chapter_id
     WHERE c.book_id = ? AND cu.unlocked_at >= (NOW() - INTERVAL 1 DAY)`,
    [bookId],
  );
  const [[earnPrev]] = await pool.execute(
    `SELECT COALESCE(SUM(cu.tokens_spent), 0) AS t FROM chapter_unlocks cu
     JOIN chapters c ON c.id = cu.chapter_id
     WHERE c.book_id = ?
       AND cu.unlocked_at >= (NOW() - INTERVAL 2 DAY) AND cu.unlocked_at < (NOW() - INTERVAL 1 DAY)`,
    [bookId],
  );
  const [[earnTotal]] = await pool.execute(
    `SELECT COALESCE(SUM(cu.tokens_spent), 0) AS t FROM chapter_unlocks cu
     JOIN chapters c ON c.id = cu.chapter_id WHERE c.book_id = ?`,
    [bookId],
  );

  const [[chNow]] = await pool.execute(
    `SELECT COUNT(*) AS c FROM chapters WHERE book_id = ?
       AND status = 'published' AND updated_at >= (NOW() - INTERVAL 7 DAY)`,
    [bookId],
  );
  const [[chPrev]] = await pool.execute(
    `SELECT COUNT(*) AS c FROM chapters WHERE book_id = ?
       AND status = 'published'
       AND updated_at >= (NOW() - INTERVAL 14 DAY) AND updated_at < (NOW() - INTERVAL 7 DAY)`,
    [bookId],
  );
  const [[chTotal]] = await pool.execute(
    `SELECT COUNT(*) AS c FROM chapters WHERE book_id = ? AND status = 'published'`,
    [bookId],
  );

  const [chRows] = await pool.execute(
    'SELECT content_html FROM chapters WHERE book_id = ? AND status = ?',
    [bookId, 'published'],
  );
  const wordCount = chRows.reduce((sum, row) => sum + htmlToWordCount(row.content_html), 0);

  const [rankRows] = await pool.execute(
    `SELECT b.id, COALESCE(SUM(cu.tokens_spent), 0) AS tokens
     FROM books b
     LEFT JOIN chapters c ON c.book_id = b.id
     LEFT JOIN chapter_unlocks cu ON cu.chapter_id = c.id
     WHERE b.author_id = ?
     GROUP BY b.id
     ORDER BY tokens DESC, b.updated_at DESC`,
    [authorId],
  );
  const rankIdx = rankRows.findIndex((r) => Number(r.id) === Number(bookId));
  const powerRank = rankIdx >= 0 ? rankIdx + 1 : rankRows.length + 1;
  const prevRank = powerRank;

  const recorded = new Date();
  const gmt8 = new Date(recorded.getTime() + 8 * 60 * 60 * 1000);
  const dateLabel = gmt8.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });

  return {
    book: {
      id: Number(book.id),
      title: book.title,
      slug: book.slug,
      status: book.status,
      coverUrl: book.cover_url,
      updatedAt: book.updated_at,
      score: book.score == null ? null : Number(book.score),
    },
    dataWindowLabel: `Incremental data was recorded on ${dateLabel} 00:00–24:00 (GMT+8)`,
    stats: {
      collections: {
        value: Number(libTotal.c),
        changePercent: Math.round(pctChange(Number(libNow.c), Number(libPrev.c)) * 10) / 10,
        period: 'day',
      },
      views: {
        value: Number(viewsTotal.c),
        changePercent: Math.round(pctChange(Number(viewsNow.c), Number(viewsPrev.c)) * 10) / 10,
        period: 'day',
      },
      earnings: {
        value: Number(earnTotal.t),
        changePercent: Math.round(pctChange(Number(earnNow.t), Number(earnPrev.t)) * 10) / 10,
        period: 'day',
      },
      powerRanking: {
        value: powerRank,
        change: 0,
        period: 'day',
        label: `No.${powerRank}`,
      },
      chapters: {
        value: Number(chTotal.c),
        changePercent: Math.round(pctChange(Number(chNow.c), Number(chPrev.c)) * 10) / 10,
        period: 'week',
      },
      words: {
        value: wordCount,
        changePercent: 0,
        period: 'week',
      },
    },
  };
}

module.exports = { getEarnings, getBookStats };
