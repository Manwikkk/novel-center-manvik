'use strict';

const pool = require('../db/pool');

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

module.exports = { getEarnings };
