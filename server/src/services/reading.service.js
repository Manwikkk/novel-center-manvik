'use strict';

const pool = require('../db/pool');
const { errors } = require('../utils/HttpError');
const { clampPagination } = require('../utils/pagination');
const { resolveUserRow, assertRestriction } = require('./suspension.service');

const WPM = 220;

function htmlToWordCount(html) {
  if (!html) return 0;
  const text = String(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return 0;
  return text.split(' ').length;
}

function minutesFromWords(words, percentRemaining = 100) {
  const remaining = Math.max(0, words * (percentRemaining / 100));
  return Math.max(0, Math.round(remaining / WPM));
}

async function upsertProgress(userId, chapterId, percent, position) {
  const userRow = await resolveUserRow(userId);
  assertRestriction(userRow, 'reading', 'Reading is restricted on your account');

  const [rows] = await pool.execute(
    'SELECT id, book_id, status FROM chapters WHERE id = ? LIMIT 1',
    [chapterId],
  );
  const ch = rows[0];
  if (!ch) throw errors.notFound('Chapter not found');

  const safePercent = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
  const safePosition = Math.max(0, Math.round(Number(position) || 0));

  await pool.execute(
    `INSERT INTO reader_progress (user_id, chapter_id, book_id, percent, position)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       percent  = GREATEST(percent, VALUES(percent)),
       position = VALUES(position)`,
    [userId, chapterId, ch.book_id, safePercent, safePosition],
  );

  const [out] = await pool.execute(
    'SELECT user_id, chapter_id, book_id, percent, position, updated_at FROM reader_progress WHERE user_id = ? AND chapter_id = ? LIMIT 1',
    [userId, chapterId],
  );
  const r = out[0];

  try {
    const profileSvc = require('./profile.service');
    await profileSvc.recordReadingActivity(userId);
    if (safePercent >= 95) {
      await profileSvc.syncAchievements(userId);
    } else {
      await profileSvc.tryGrantAchievement(userId, 'first_read');
    }
  } catch (_e) { /* non-fatal */ }

  return {
    chapterId: Number(r.chapter_id),
    bookId: Number(r.book_id),
    percent: Number(r.percent),
    position: Number(r.position),
    updatedAt: r.updated_at,
  };
}

// Latest saved position in one book (published, non-recycled chapters only).
async function latestForBook(userId, bookId) {
  const [rows] = await pool.execute(
    `SELECT rp.chapter_id, rp.percent, rp.position, rp.updated_at,
            c.idx AS chapter_idx, c.title AS chapter_title
       FROM reader_progress rp
       JOIN chapters c ON c.id = rp.chapter_id
      WHERE rp.user_id = ? AND rp.book_id = ?
        AND c.status = 'published' AND c.recycled_at IS NULL
      ORDER BY rp.updated_at DESC, rp.chapter_id DESC
      LIMIT 1`,
    [userId, bookId],
  );
  const r = rows[0];
  if (!r) return null;
  return {
    chapterId: Number(r.chapter_id),
    chapterIdx: Number(r.chapter_idx),
    chapterTitle: r.chapter_title,
    percent: Number(r.percent) || 0,
    position: Number(r.position) || 0,
    updatedAt: r.updated_at,
  };
}

async function recent(userId, { page, pageSize, limit } = {}) {
  // limit takes precedence (used by /recent?limit=N); pagination is exposed
  // for completeness so the same endpoint can power a future "history" view.
  const usingLimit = Number.isFinite(Number(limit)) && Number(limit) > 0;
  const { page: safePage, pageSize: safePageSize, offset } = clampPagination(page, pageSize, {
    defaultSize: 4,
    max: 24,
  });
  const effectiveLimit = usingLimit ? Math.min(24, Math.max(1, Math.floor(Number(limit)))) : safePageSize;
  const effectiveOffset = usingLimit ? 0 : offset;

  // One row per book: pick the latest chapter progress (ties broken by chapter_id).
  // The old MAX(updated_at) join duplicated books whenever two chapters shared a timestamp.
  const [rows] = await pool.execute(
    `SELECT ranked.book_id, ranked.chapter_id, ranked.percent, ranked.position,
            ranked.last_read_at,
            b.slug, b.title AS book_title, b.synopsis, b.cover_url, b.category,
            b.status AS book_status, b.author_id,
            u.display_name AS author_name,
            c.idx AS chapter_idx, c.title AS chapter_title, c.content_html,
            c.is_paid, c.token_price, c.status AS chapter_status
       FROM (
         SELECT rp.book_id, rp.chapter_id, rp.percent, rp.position,
                rp.updated_at AS last_read_at,
                ROW_NUMBER() OVER (
                  PARTITION BY rp.book_id
                  ORDER BY rp.updated_at DESC, rp.chapter_id DESC
                ) AS rn
           FROM reader_progress rp
          WHERE rp.user_id = ?
       ) ranked
       JOIN books    b ON b.id = ranked.book_id
       JOIN users    u ON u.id = b.author_id
       JOIN chapters c ON c.id = ranked.chapter_id
      WHERE ranked.rn = 1
        AND b.status = 'published'
        AND b.recycled_at IS NULL
        AND c.recycled_at IS NULL
      ORDER BY ranked.last_read_at DESC
      LIMIT ${effectiveLimit} OFFSET ${effectiveOffset}`,
    [userId],
  );

  const items = rows.map((r) => {
    const wordCount = htmlToWordCount(r.content_html);
    const percent = Number(r.percent) || 0;
    return {
      percent,
      lastReadAt: r.last_read_at,
      minutesLeft: minutesFromWords(wordCount, 100 - percent),
      book: {
        id: Number(r.book_id),
        slug: r.slug,
        title: r.book_title,
        synopsis: r.synopsis,
        coverUrl: r.cover_url,
        category: r.category,
        authorId: Number(r.author_id),
        authorName: r.author_name,
      },
      chapter: {
        id: Number(r.chapter_id),
        idx: Number(r.chapter_idx),
        title: r.chapter_title,
        wordCount,
      },
    };
  });

  let total = items.length;
  if (!usingLimit) {
    const [c] = await pool.execute(
      'SELECT COUNT(DISTINCT book_id) AS total FROM reader_progress WHERE user_id = ?',
      [userId],
    );
    total = Number(c[0].total);
  }

  return {
    items,
    page: safePage,
    pageSize: usingLimit ? items.length : safePageSize,
    total,
  };
}

module.exports = { upsertProgress, latestForBook, recent, htmlToWordCount, minutesFromWords, WPM };
