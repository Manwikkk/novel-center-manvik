'use strict';

/**
 * Live leaderboards for /ranking. Computed from real activity (views, readers,
 * unlocks, reviews, follows, EXP) rather than the admin-curated home shelves,
 * and cached briefly because every query scans the catalogue.
 */

const pool = require('../db/pool');

const CACHE_MS = 60 * 1000;
const LIMIT = 10;
let cache = null;
let cacheAt = 0;

const BOOK_SELECT = `
  SELECT b.id, b.slug, b.title, b.cover_url, b.category, b.genre, b.score, b.synopsis,
         b.view_count, b.serialization_status, b.created_at,
         u.id AS author_id, u.display_name AS author_name,
         (SELECT COUNT(*) FROM chapters c WHERE c.book_id = b.id AND c.status = 'published' AND c.recycled_at IS NULL) AS chapter_count,
         (SELECT COUNT(DISTINCT rp.user_id) FROM reader_progress rp WHERE rp.book_id = b.id) AS reader_count,
         (SELECT COUNT(*) FROM library l WHERE l.book_id = b.id) AS library_count,
         (SELECT COUNT(*) FROM comments c WHERE c.book_id = b.id AND c.chapter_id IS NULL
            AND c.review_ratings IS NOT NULL AND c.status = 'visible') AS review_count,
         (SELECT AVG((
             COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(c.review_ratings, '$.writingQuality')) AS DECIMAL(4,2)), 0)
           + COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(c.review_ratings, '$.stabilityOfUpdates')) AS DECIMAL(4,2)), 0)
           + COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(c.review_ratings, '$.storyDevelopment')) AS DECIMAL(4,2)), 0)
           + COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(c.review_ratings, '$.characterDesign')) AS DECIMAL(4,2)), 0)
           + COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(c.review_ratings, '$.worldBackground')) AS DECIMAL(4,2)), 0)
           ) / 5)
            FROM comments c
           WHERE c.book_id = b.id AND c.chapter_id IS NULL AND c.review_ratings IS NOT NULL
             AND c.status = 'visible') AS avg_rating,
         (SELECT COUNT(*) FROM reader_progress rp WHERE rp.book_id = b.id
            AND rp.updated_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) AS recent_reads,
         (SELECT COUNT(*) FROM chapter_unlocks cu JOIN chapters c2 ON c2.id = cu.chapter_id
           WHERE c2.book_id = b.id AND cu.unlocked_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) AS recent_unlocks,
         (SELECT COUNT(*) FROM library l2 WHERE l2.book_id = b.id
            AND l2.added_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) AS recent_saves
    FROM books b
    JOIN users u ON u.id = b.author_id
   WHERE b.status = 'published' AND b.recycled_at IS NULL AND u.status = 'active'`;

function rowToBook(r, extra = {}) {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    coverUrl: r.cover_url,
    category: r.category,
    genre: r.genre || null,
    synopsis: r.synopsis,
    score: r.avg_rating != null ? Math.round(Number(r.avg_rating) * 10) / 10 : (r.score == null ? null : Number(r.score)),
    reviewCount: Number(r.review_count || 0),
    views: Math.max(Number(r.view_count || 0), Number(r.reader_count || 0)),
    readers: Number(r.reader_count || 0),
    saves: Number(r.library_count || 0),
    chapterNum: Number(r.chapter_count || 0),
    serializationStatus: r.serialization_status,
    authorId: r.author_id,
    authorName: r.author_name,
    createdAt: r.created_at,
    ...extra,
  };
}

async function computeRankings() {
  const [mostRead] = await pool.execute(
    `${BOOK_SELECT} ORDER BY GREATEST(b.view_count, 0) + reader_count * 3 DESC, review_count DESC, b.id ASC LIMIT ${LIMIT}`,
  );
  const [trending] = await pool.execute(
    `${BOOK_SELECT}
     ORDER BY (recent_reads * 2 + recent_unlocks * 3 + recent_saves * 2) DESC, b.view_count DESC, b.updated_at DESC
     LIMIT ${LIMIT}`,
  );
  const [topRated] = await pool.execute(
    `${BOOK_SELECT} HAVING review_count >= 1 ORDER BY avg_rating DESC, review_count DESC, b.view_count DESC LIMIT ${LIMIT}`,
  );
  const [newest] = await pool.execute(
    `${BOOK_SELECT} ORDER BY b.created_at DESC, b.id DESC LIMIT ${LIMIT}`,
  );

  const [authors] = await pool.execute(
    `SELECT u.id, u.display_name, u.avatar_url, u.bio, u.is_verified, u.country,
            (SELECT COUNT(*) FROM user_follows f WHERE f.followee_id = u.id) AS followers,
            (SELECT COUNT(*) FROM books b WHERE b.author_id = u.id AND b.status = 'published' AND b.recycled_at IS NULL) AS books,
            (SELECT COALESCE(SUM(b.view_count), 0) FROM books b WHERE b.author_id = u.id AND b.status = 'published' AND b.recycled_at IS NULL) AS views,
            (SELECT COUNT(*) FROM chapters c JOIN books b ON b.id = c.book_id
              WHERE b.author_id = u.id AND c.status = 'published' AND c.recycled_at IS NULL AND b.recycled_at IS NULL) AS chapters
       FROM users u
      WHERE u.role IN ('author', 'admin') AND u.status = 'active'
     HAVING books > 0
      ORDER BY followers DESC, views DESC, books DESC
      LIMIT ${LIMIT}`,
  );

  const [readers] = await pool.execute(
    `SELECT u.id, u.display_name, u.avatar_url, u.reader_level, u.xp, u.current_streak, u.longest_streak,
            u.is_verified, u.role,
            (SELECT COUNT(*) FROM user_achievements ua WHERE ua.user_id = u.id) AS badges,
            (SELECT COUNT(*) FROM (
               SELECT rp.book_id FROM reader_progress rp WHERE rp.user_id = u.id GROUP BY rp.book_id HAVING MAX(rp.percent) >= 95
             ) t) AS books_read
       FROM users u
      WHERE u.status = 'active' AND u.role = 'user' AND u.xp > 0
      ORDER BY u.xp DESC, badges DESC
      LIMIT ${LIMIT}`,
  );

  const trendingScore = (r) => Number(r.recent_reads || 0) * 2 + Number(r.recent_unlocks || 0) * 3 + Number(r.recent_saves || 0) * 2;

  return {
    generatedAt: new Date().toISOString(),
    mostRead: mostRead.map((r) => rowToBook(r)),
    trending: trending.map((r) => rowToBook(r, { momentum: trendingScore(r) })),
    topRated: topRated.map((r) => rowToBook(r)),
    newest: newest.map((r) => rowToBook(r)),
    topAuthors: authors.map((a) => ({
      id: a.id,
      displayName: a.display_name,
      avatarUrl: a.avatar_url,
      bio: a.bio || '',
      country: a.country || null,
      isVerified: Number(a.is_verified) === 1,
      followers: Number(a.followers || 0),
      books: Number(a.books || 0),
      chapters: Number(a.chapters || 0),
      views: Number(a.views || 0),
    })),
    topReaders: readers.map((r) => ({
      id: r.id,
      displayName: r.display_name,
      avatarUrl: r.avatar_url,
      readerLevel: Number(r.reader_level) || 1,
      xp: Number(r.xp) || 0,
      currentStreak: Number(r.current_streak) || 0,
      longestStreak: Number(r.longest_streak) || 0,
      badges: Number(r.badges || 0),
      booksRead: Number(r.books_read || 0),
      isVerified: Number(r.is_verified) === 1,
      isAuthor: r.role === 'author',
    })),
  };
}

async function getRankings({ fresh = false } = {}) {
  const now = Date.now();
  if (!fresh && cache && now - cacheAt < CACHE_MS) return cache;
  cache = await computeRankings();
  cacheAt = now;
  return cache;
}

module.exports = { getRankings, computeRankings };
