'use strict';

const pool = require('../db/pool');
const storage = require('../storage');
const { errors } = require('../utils/HttpError');
const { clampPagination } = require('../utils/pagination');
const { hashPassword, comparePassword } = require('../utils/hash');
const { publicUser } = require('../utils/publicUser');
const { readImageDimensions } = require('../utils/imageDimensions');
const { levelFromXp, xpProgress, XP_THRESHOLDS } = require('./levels');

const BANNER_MIN_WIDTH = 1080;
const BANNER_MIN_HEIGHT = 420;

const SOCIAL_KEYS = ['website', 'twitter', 'discord', 'instagram', 'facebook', 'youtube'];
const CHECKIN_XP = 10;
const READING_XP = 5;

function parseJson(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (_e) {
    return fallback;
  }
}

function toDateStr(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function yesterdayStr() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function profilePublicFields(row, { isOwner = false, viewerId = null } = {}) {
  const socialLinks = parseJson(row.social_links, {});
  const base = {
    id: row.id,
    displayName: row.display_name,
    role: row.role,
    avatarUrl: row.avatar_url,
    bannerUrl: row.banner_url,
    bio: row.bio,
    country: row.country || null,
    socialLinks: Object.fromEntries(
      SOCIAL_KEYS.filter((k) => socialLinks[k]).map((k) => [k, socialLinks[k]]),
    ),
    isVerified: Number(row.is_verified) === 1,
    isPremium: Number(row.is_premium) === 1 || row.membership_tier === 'premium',
    isAuthor: row.role === 'author' || row.role === 'admin',
    showReviews: Number(row.show_reviews) !== 0,
    showComments: Number(row.show_comments) !== 0,
    joinedAt: row.created_at,
    readerLevel: Number(row.reader_level) || 1,
    xp: Number(row.xp) || 0,
    level: xpProgress(row.xp),
    currentStreak: Number(row.current_streak) || 0,
    longestStreak: Number(row.longest_streak) || 0,
    membershipTier: row.membership_tier || 'none',
  };

  if (isOwner) {
    return {
      ...base,
      email: row.email,
      birthDate: row.birth_date || null,
      bonusBalance: Number(row.bonus_balance) || 0,
      membershipExpiresAt: row.membership_expires_at || null,
      notifyEmail: Number(row.notify_email) !== 0,
      notifyPush: Number(row.notify_push) !== 0,
      lastCheckinDate: row.last_checkin_date || null,
      authProvider: row.google_id ? 'google' : 'local',
      isOwner: true,
    };
  }

  return {
    ...base,
    isOwner: false,
    isFollowing: false,
    viewerId,
  };
}

async function getUserRow(id) {
  const [rows] = await pool.execute('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

async function followCounts(userId) {
  const [[followers]] = await pool.execute(
    'SELECT COUNT(*) AS c FROM user_follows WHERE followee_id = ?',
    [userId],
  );
  const [[following]] = await pool.execute(
    'SELECT COUNT(*) AS c FROM user_follows WHERE follower_id = ?',
    [userId],
  );
  return {
    followers: Number(followers.c),
    following: Number(following.c),
  };
}

async function booksReadCount(userId) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS c FROM (
       SELECT book_id
         FROM reader_progress
        WHERE user_id = ?
        GROUP BY book_id
       HAVING MAX(percent) >= 95
     ) t`,
    [userId],
  );
  return Number(rows[0]?.c || 0);
}

/** Rough hours of reading from progress touchpoints (~9 min each). */
async function readingHoursApprox(userId) {
  const [rows] = await pool.execute(
    'SELECT COUNT(*) AS c FROM reader_progress WHERE user_id = ?',
    [userId],
  );
  const hours = (Number(rows[0]?.c || 0) * 9) / 60;
  return Math.round(hours * 10) / 10;
}

async function collectionCount(userId, { publicOnly = false } = {}) {
  const sql = publicOnly
    ? "SELECT COUNT(*) AS c FROM user_collections WHERE user_id = ? AND visibility = 'public'"
    : 'SELECT COUNT(*) AS c FROM user_collections WHERE user_id = ?';
  const [rows] = await pool.execute(sql, [userId]);
  return Number(rows[0]?.c || 0);
}

async function unreadNotifications(userId) {
  const [rows] = await pool.execute(
    'SELECT COUNT(*) AS c FROM user_notifications WHERE user_id = ? AND is_read = 0',
    [userId],
  );
  return Number(rows[0]?.c || 0);
}

async function walletBalance(userId) {
  const [rows] = await pool.execute('SELECT balance FROM wallets WHERE user_id = ? LIMIT 1', [userId]);
  return Number(rows[0]?.balance || 0);
}

async function isFollowing(followerId, followeeId) {
  if (!followerId || !followeeId || followerId === followeeId) return false;
  const [rows] = await pool.execute(
    'SELECT 1 FROM user_follows WHERE follower_id = ? AND followee_id = ? LIMIT 1',
    [followerId, followeeId],
  );
  return !!rows[0];
}

async function awardXp(userId, source, amount, meta = null, conn = pool) {
  if (!amount) return null;
  await conn.execute(
    'INSERT INTO user_xp_events (user_id, source, amount, meta) VALUES (?, ?, ?, ?)',
    [userId, source, amount, meta ? JSON.stringify(meta) : null],
  );
  await conn.execute('UPDATE users SET xp = xp + ? WHERE id = ?', [amount, userId]);
  const [rows] = await conn.execute('SELECT xp, reader_level FROM users WHERE id = ? LIMIT 1', [userId]);
  const xp = Number(rows[0].xp);
  const nextLevel = levelFromXp(xp);
  if (nextLevel !== Number(rows[0].reader_level)) {
    await conn.execute('UPDATE users SET reader_level = ? WHERE id = ?', [nextLevel, userId]);
  }
  return xpProgress(xp);
}

async function tryGrantAchievement(userId, code) {
  const [ach] = await pool.execute('SELECT id, xp_reward FROM achievements WHERE code = ? LIMIT 1', [code]);
  if (!ach[0]) return null;
  try {
    await pool.execute(
      'INSERT INTO user_achievements (user_id, achievement_id) VALUES (?, ?)',
      [userId, ach[0].id],
    );
    if (ach[0].xp_reward > 0) {
      await awardXp(userId, 'events', Number(ach[0].xp_reward), { achievement: code });
    }
    return code;
  } catch (_e) {
    return null; // already earned
  }
}

/**
 * Re-evaluate milestone achievements from live activity and grant any newly earned.
 * Safe to call often — INSERT IGNORE style via tryGrantAchievement.
 */
async function syncAchievements(userId) {
  if (!userId) return [];
  const earned = [];
  const grant = async (code) => {
    const codeGranted = await tryGrantAchievement(userId, code);
    if (codeGranted) earned.push(codeGranted);
  };

  const [[progress]] = await pool.execute(
    'SELECT COUNT(*) AS c FROM reader_progress WHERE user_id = ?',
    [userId],
  );
  if (Number(progress.c) > 0) await grant('first_read');

  const booksRead = await booksReadCount(userId);
  if (booksRead >= 5) await grant('books_read_5');
  if (booksRead >= 25) await grant('books_read_25');

  const [[lib]] = await pool.execute(
    'SELECT COUNT(*) AS c FROM library WHERE user_id = ?',
    [userId],
  );
  if (Number(lib.c) >= 10) await grant('library_10');
  if (Number(lib.c) >= 50) await grant('library_50');

  const [[reviews]] = await pool.execute(
    `SELECT COUNT(*) AS c FROM comments
      WHERE user_id = ? AND chapter_id IS NULL AND parent_id IS NULL
        AND review_ratings IS NOT NULL AND status = 'visible'`,
    [userId],
  );
  if (Number(reviews.c) > 0) await grant('first_review');
  if (Number(reviews.c) >= 5) await grant('critic');

  const [[comments]] = await pool.execute(
    `SELECT COUNT(*) AS c FROM comments
      WHERE user_id = ? AND status = 'visible'
        AND (review_ratings IS NULL OR chapter_id IS NOT NULL)`,
    [userId],
  );
  if (Number(comments.c) > 0) await grant('first_comment');
  if (Number(comments.c) >= 25) await grant('social_butterfly');

  const [[follows]] = await pool.execute(
    'SELECT COUNT(*) AS c FROM user_follows WHERE follower_id = ?',
    [userId],
  );
  if (Number(follows.c) > 0) await grant('first_follow');

  const counts = await followCounts(userId);
  if (counts.followers >= 10) await grant('followers_10');
  if (counts.followers >= 100) await grant('followers_100');

  const [[novels]] = await pool.execute(
    `SELECT COUNT(*) AS c FROM books
      WHERE author_id = ? AND status = 'published' AND recycled_at IS NULL`,
    [userId],
  );
  if (Number(novels.c) > 0) await grant('first_novel');

  const [userRows] = await pool.execute(
    'SELECT current_streak, longest_streak, is_verified, is_premium, membership_tier FROM users WHERE id = ? LIMIT 1',
    [userId],
  );
  const streak = Math.max(
    Number(userRows[0]?.current_streak || 0),
    Number(userRows[0]?.longest_streak || 0),
  );
  if (streak >= 7) await grant('streak_7');
  if (streak >= 30) await grant('streak_30');
  if (streak >= 365) await grant('streak_365');
  if (Number(userRows[0]?.is_verified) === 1) await grant('verified_reader');
  if (
    Number(userRows[0]?.is_premium) === 1
    || ['plus', 'premium'].includes(userRows[0]?.membership_tier)
  ) {
    await grant('premium_member');
  }

  // Genre badges from library categories / genres
  const [genreRows] = await pool.execute(
    `SELECT DISTINCT LOWER(COALESCE(b.genre, b.category, '')) AS g
       FROM library l
       JOIN books b ON b.id = l.book_id
      WHERE l.user_id = ? AND b.recycled_at IS NULL`,
    [userId],
  );
  const joined = genreRows.map((r) => String(r.g || '')).join(' ');
  if (/fantasy|isekai|magic/i.test(joined)) await grant('genre_fantasy');
  if (/eastern|xianxia|wuxia|cultivat/i.test(joined)) await grant('genre_eastern');
  if (/romance|yuri|yaoi|love/i.test(joined)) await grant('genre_romance');
  if (/horror|thriller|dark/i.test(joined)) await grant('genre_horror');
  if (/sci-?fi|science|cyber|space/i.test(joined)) await grant('genre_scifi');

  return earned;
}

async function getProfile(userId, viewerId = null) {
  const row = await getUserRow(userId);
  if (!row || row.status === 'suspended') throw errors.notFound('Profile not found');

  const isOwner = viewerId != null && Number(viewerId) === Number(userId);
  const profile = profilePublicFields(row, { isOwner, viewerId });

  // One round-trip for common counters instead of 4 sequential queries.
  const [[stats]] = await pool.execute(
    `SELECT
       (SELECT COUNT(*) FROM user_follows WHERE followee_id = ?) AS followers,
       (SELECT COUNT(*) FROM user_follows WHERE follower_id = ?) AS following,
       (SELECT COUNT(*) FROM user_collections
         WHERE user_id = ? AND (? = 1 OR visibility = 'public')) AS collection_count,
       (SELECT COUNT(*) FROM (
          SELECT book_id FROM reader_progress
           WHERE user_id = ?
           GROUP BY book_id
          HAVING MAX(percent) >= 95
        ) t) AS books_read,
       (SELECT COUNT(*) FROM reader_progress WHERE user_id = ?) AS progress_rows,
       (SELECT COUNT(*) FROM user_follows
         WHERE follower_id = ? AND followee_id = ?) AS is_following`,
    [
      userId,
      userId,
      userId,
      isOwner ? 1 : 0,
      userId,
      userId,
      viewerId || 0,
      userId,
    ],
  );

  if (!isOwner && viewerId) {
    profile.isFollowing = Number(stats.is_following) > 0;
  }

  const progressRows = Number(stats.progress_rows || 0);
  return {
    profile: {
      ...profile,
      followers: Number(stats.followers || 0),
      following: Number(stats.following || 0),
      collectionCount: Number(stats.collection_count || 0),
      booksRead: Number(stats.books_read || 0),
      readingHours: Math.round(((progressRows * 9) / 60) * 10) / 10,
      continuousWritingDays: profile.isAuthor ? Number(profile.currentStreak || 0) : 0,
    },
  };
}

let levelBenefitsCache = null;
let levelBenefitsCacheAt = 0;

async function listLevelBenefits() {
  const now = Date.now();
  if (levelBenefitsCache && now - levelBenefitsCacheAt < 10 * 60 * 1000) {
    return levelBenefitsCache;
  }
  const [rows] = await pool.execute(
    'SELECT level, title, description, xp_required FROM reader_level_benefits ORDER BY level ASC',
  );
  levelBenefitsCache = rows.map((r) => ({
    level: Number(r.level),
    title: r.title,
    description: r.description,
    xpRequired: Number(r.xp_required),
  }));
  levelBenefitsCacheAt = now;
  return levelBenefitsCache;
}

/** Lightweight novel cards for overview (no heavy rating AVG subqueries). */
async function listProfileNovelsLight(userId, { viewerId = null, pageSize = 6 } = {}) {
  const isOwner = viewerId != null && Number(viewerId) === Number(userId);
  const limit = Math.min(24, Math.max(1, Number(pageSize) || 6));
  const where = ["b.author_id = ?", "b.status = 'published'", 'b.recycled_at IS NULL'];
  const params = [userId];
  if (!isOwner) where.push('b.show_on_profile = 1');

  const [rows] = await pool.execute(
    `SELECT b.id, b.slug, b.title, b.cover_url, b.serialization_status, b.view_count,
            b.show_on_profile, b.category,
            (SELECT COUNT(*) FROM library l WHERE l.book_id = b.id) AS bookmark_count,
            (SELECT COUNT(DISTINCT rp.user_id) FROM reader_progress rp WHERE rp.book_id = b.id) AS reader_count,
            (SELECT COUNT(*) FROM chapters ch
              WHERE ch.book_id = b.id AND ch.status = 'published' AND ch.recycled_at IS NULL) AS chapter_count
       FROM books b
      WHERE ${where.join(' AND ')}
      ORDER BY b.updated_at DESC
      LIMIT ${limit}`,
    params,
  );

  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    coverUrl: r.cover_url,
    category: r.category || null,
    status: r.serialization_status,
    views: Math.max(Number(r.view_count || 0), Number(r.reader_count || 0)),
    bookmarks: Number(r.bookmark_count || 0),
    chapters: Number(r.chapter_count || 0),
    rating: null,
    showOnProfile: Number(r.show_on_profile) === 1,
  }));
}

async function getOverview(userId, viewerId = null) {
  const isOwnerViewer = viewerId != null && Number(viewerId) === Number(userId);

  // Never block first paint on achievement sync — run in background.
  if (isOwnerViewer) {
    setImmediate(() => {
      syncAchievements(userId).catch(() => {});
    });
  }

  const { profile } = await getProfile(userId, viewerId);
  const isOwner = profile.isOwner;
  const isAuthor = !!profile.isAuthor;

  const jobs = [
    pool.execute(
      `SELECT uc.id, uc.name, uc.visibility, uc.updated_at,
              (SELECT COUNT(*) FROM collection_books cb
                JOIN books b ON b.id = cb.book_id
               WHERE cb.collection_id = uc.id AND b.recycled_at IS NULL) AS book_count
         FROM user_collections uc
        WHERE uc.user_id = ?
          AND (? = 1 OR uc.visibility = 'public')
        ORDER BY uc.updated_at DESC
        LIMIT 8`,
      [userId, isOwner ? 1 : 0],
    ),
    listAchievements(userId, { earnedOnly: true, limit: 24 }),
    listLevelBenefits(),
  ];

  if (isOwner) {
    jobs.push(walletBalance(userId), unreadNotifications(userId));
  } else {
    jobs.push(Promise.resolve(0), Promise.resolve(0));
  }

  if (isAuthor) {
    jobs.push(listProfileNovelsLight(userId, { viewerId, pageSize: 6 }));
  } else {
    jobs.push(Promise.resolve([]));
  }

  const [
    collectionsResult,
    achievements,
    levelBenefits,
    coins,
    unread,
    novelsPreview,
  ] = await Promise.all(jobs);

  const publicCollections = collectionsResult[0];

  let dashboard = null;
  if (isOwner) {
    dashboard = {
      coins: Number(coins) || 0,
      bonus: profile.bonusBalance,
      membership: profile.membershipTier,
      membershipExpiresAt: profile.membershipExpiresAt,
      checkedInToday: profile.lastCheckinDate === toDateStr(),
      readingStreak: profile.currentStreak,
      unreadNotifications: Number(unread) || 0,
      booksRead: profile.booksRead,
      longestStreak: profile.longestStreak,
    };
  }

  return {
    profile,
    collections: publicCollections.map((c) => ({
      id: c.id,
      name: c.name,
      visibility: c.visibility,
      bookCount: Number(c.book_count),
      updatedAt: c.updated_at,
    })),
    achievements: achievements.items,
    dashboard,
    novelsPreview: Array.isArray(novelsPreview) ? novelsPreview : [],
    levelBenefits,
  };
}

async function listAchievements(userId, { earnedOnly = false, limit } = {}) {
  let sql = `
    SELECT a.id, a.code, a.title, a.description, a.icon, a.category, a.xp_reward,
           ua.earned_at
      FROM achievements a
      LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = ?
  `;
  if (earnedOnly) sql += ' WHERE ua.earned_at IS NOT NULL';
  sql += ' ORDER BY ua.earned_at DESC, a.id ASC';
  if (limit) sql += ` LIMIT ${Number(limit)}`;

  const [rows] = await pool.execute(sql, [userId]);
  return {
    items: rows.map((r) => ({
      id: r.id,
      code: r.code,
      title: r.title,
      description: r.description,
      icon: r.icon,
      category: r.category,
      xpReward: Number(r.xp_reward),
      earnedAt: r.earned_at || null,
      earned: !!r.earned_at,
    })),
  };
}

async function listProfileNovels(userId, {
  viewerId = null,
  page = 1,
  pageSize = 12,
  statusFilter = 'all',
} = {}) {
  const isOwner = viewerId != null && Number(viewerId) === Number(userId);
  const { page: safePage, pageSize: safePageSize, offset } = clampPagination(page, pageSize, {
    defaultSize: 12,
    max: 48,
  });

  const where = ["b.author_id = ?", "b.status = 'published'", 'b.recycled_at IS NULL'];
  const params = [userId];

  if (!isOwner) {
    where.push('b.show_on_profile = 1');
  }

  if (statusFilter && statusFilter !== 'all') {
    where.push('b.serialization_status = ?');
    params.push(statusFilter);
  }

  const whereSql = where.join(' AND ');

  const [rows] = await pool.execute(
    `SELECT b.id, b.slug, b.title, b.cover_url, b.serialization_status, b.view_count,
            b.show_on_profile, b.updated_at, b.category,
            (SELECT COUNT(*) FROM library l WHERE l.book_id = b.id) AS bookmark_count,
            (SELECT COUNT(DISTINCT rp.user_id) FROM reader_progress rp WHERE rp.book_id = b.id) AS reader_count,
            (SELECT COUNT(*) FROM chapters ch
              WHERE ch.book_id = b.id AND ch.status = 'published' AND ch.recycled_at IS NULL) AS chapter_count,
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
            (SELECT COUNT(*) FROM comments c
              WHERE c.book_id = b.id AND c.chapter_id IS NULL AND c.review_ratings IS NOT NULL
                AND c.status = 'visible') AS rating_count
       FROM books b
      WHERE ${whereSql}
      ORDER BY b.updated_at DESC
      LIMIT ${safePageSize} OFFSET ${offset}`,
    params,
  );

  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM books b WHERE ${whereSql}`,
    params,
  );

  return {
    items: rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      coverUrl: r.cover_url,
      category: r.category || null,
      status: r.serialization_status,
      // Page views + unique readers so cards aren't stuck at 0
      views: Math.max(Number(r.view_count || 0), Number(r.reader_count || 0)),
      bookmarks: Number(r.bookmark_count || 0),
      chapters: Number(r.chapter_count || 0),
      rating: r.avg_rating != null ? Math.round(Number(r.avg_rating) * 10) / 10 : null,
      ratingCount: Number(r.rating_count || 0),
      showOnProfile: Number(r.show_on_profile) === 1,
      updatedAt: r.updated_at,
    })),
    page: safePage,
    pageSize: safePageSize,
    total: Number(countRows[0].total),
  };
}

async function setNovelProfileVisibility(authorId, bookId, showOnProfile) {
  const [rows] = await pool.execute(
    'SELECT id FROM books WHERE id = ? AND author_id = ? LIMIT 1',
    [bookId, authorId],
  );
  if (!rows[0]) throw errors.notFound('Novel not found');
  await pool.execute('UPDATE books SET show_on_profile = ? WHERE id = ?', [
    showOnProfile ? 1 : 0,
    bookId,
  ]);
  return { id: bookId, showOnProfile: !!showOnProfile };
}

async function listLibrary(userId, viewerId, { page = 1, pageSize = 20 } = {}) {
  if (Number(viewerId) !== Number(userId)) {
    throw errors.forbidden('Library is only visible to the owner');
  }
  const { page: safePage, pageSize: safePageSize, offset } = clampPagination(page, pageSize, {
    defaultSize: 20,
    max: 60,
  });

  const [rows] = await pool.execute(
    `SELECT b.id, b.slug, b.title, b.cover_url, b.category, b.status, b.view_count,
            b.serialization_status,
            l.reading_status, l.added_at,
            (SELECT COUNT(*) FROM library l2 WHERE l2.book_id = b.id) AS bookmark_count,
            (SELECT COUNT(DISTINCT rp.user_id) FROM reader_progress rp WHERE rp.book_id = b.id) AS reader_count,
            (SELECT COUNT(*) FROM chapters ch
              WHERE ch.book_id = b.id AND ch.status = 'published' AND ch.recycled_at IS NULL) AS chapter_count,
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
            (SELECT COUNT(*) FROM comments c
              WHERE c.book_id = b.id AND c.chapter_id IS NULL AND c.review_ratings IS NOT NULL
                AND c.status = 'visible') AS rating_count
       FROM library l
       JOIN books b ON b.id = l.book_id
      WHERE l.user_id = ? AND b.recycled_at IS NULL
      ORDER BY l.added_at DESC
      LIMIT ${safePageSize} OFFSET ${offset}`,
    [userId],
  );
  const [c] = await pool.execute(
    `SELECT COUNT(*) AS total FROM library l
       JOIN books b ON b.id = l.book_id
      WHERE l.user_id = ? AND b.recycled_at IS NULL`,
    [userId],
  );

  return {
    items: rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      coverUrl: r.cover_url,
      category: r.category,
      status: r.serialization_status || 'ongoing',
      readingStatus: r.reading_status,
      addedAt: r.added_at,
      views: Math.max(Number(r.view_count || 0), Number(r.reader_count || 0)),
      bookmarks: Number(r.bookmark_count || 0),
      chapters: Number(r.chapter_count || 0),
      rating: r.avg_rating != null ? Math.round(Number(r.avg_rating) * 10) / 10 : null,
      ratingCount: Number(r.rating_count || 0),
    })),
    page: safePage,
    pageSize: safePageSize,
    total: Number(c[0].total),
  };
}

async function listReviews(userId, viewerId, { page = 1, pageSize = 20 } = {}) {
  const row = await getUserRow(userId);
  if (!row) throw errors.notFound('Profile not found');
  const isOwner = Number(viewerId) === Number(userId);
  if (!isOwner && Number(row.show_reviews) === 0) {
    throw errors.forbidden('Reviews are private on this profile');
  }

  const { page: safePage, pageSize: safePageSize, offset } = clampPagination(page, pageSize, {
    defaultSize: 20,
    max: 60,
  });

  const [rows] = await pool.execute(
    `SELECT c.id, c.body, c.review_ratings, c.created_at, c.is_spoiler,
            b.id AS book_id, b.slug, b.title, b.cover_url, b.category, b.genre,
            au.display_name AS author_name, au.id AS author_user_id
       FROM comments c
       JOIN books b ON b.id = c.book_id
       LEFT JOIN users au ON au.id = b.author_id
      WHERE c.user_id = ? AND c.chapter_id IS NULL AND c.parent_id IS NULL
        AND c.review_ratings IS NOT NULL AND c.status = 'visible'
        AND b.recycled_at IS NULL
      ORDER BY c.created_at DESC
      LIMIT ${safePageSize} OFFSET ${offset}`,
    [userId],
  );
  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM comments c
       JOIN books b ON b.id = c.book_id
      WHERE c.user_id = ? AND c.chapter_id IS NULL AND c.parent_id IS NULL
        AND c.review_ratings IS NOT NULL AND c.status = 'visible'
        AND b.recycled_at IS NULL`,
    [userId],
  );

  return {
    items: rows.map((r) => ({
      id: r.id,
      body: r.body,
      ratings: parseJson(r.review_ratings, null),
      isSpoiler: Number(r.is_spoiler) === 1,
      createdAt: r.created_at,
      book: {
        id: r.book_id,
        slug: r.slug,
        title: r.title,
        coverUrl: r.cover_url,
        category: r.category || r.genre || null,
        genre: r.genre || null,
        authorName: r.author_name || null,
        authorId: r.author_user_id || null,
      },
    })),
    page: safePage,
    pageSize: safePageSize,
    total: Number(countRows[0].total),
  };
}

async function listComments(userId, viewerId, { page = 1, pageSize = 20 } = {}) {
  const row = await getUserRow(userId);
  if (!row) throw errors.notFound('Profile not found');
  const isOwner = Number(viewerId) === Number(userId);
  if (!isOwner && Number(row.show_comments) === 0) {
    throw errors.forbidden('Comments are private on this profile');
  }

  const { page: safePage, pageSize: safePageSize, offset } = clampPagination(page, pageSize, {
    defaultSize: 20,
    max: 60,
  });

  const [rows] = await pool.execute(
    `SELECT c.id, c.body, c.created_at, c.is_spoiler, c.chapter_id, c.parent_id,
            b.id AS book_id, b.slug, b.title, b.cover_url, b.category, b.genre,
            au.display_name AS author_name, au.id AS author_user_id,
            ch.idx AS chapter_idx, ch.title AS chapter_title,
            pu.display_name AS parent_author_name
       FROM comments c
       LEFT JOIN books b ON b.id = c.book_id AND b.recycled_at IS NULL
       LEFT JOIN users au ON au.id = b.author_id
       LEFT JOIN chapters ch ON ch.id = c.chapter_id
       LEFT JOIN comments pc ON pc.id = c.parent_id
       LEFT JOIN users pu ON pu.id = pc.user_id
      WHERE c.user_id = ? AND c.status = 'visible'
        AND (c.review_ratings IS NULL OR c.chapter_id IS NOT NULL)
      ORDER BY c.created_at DESC
      LIMIT ${safePageSize} OFFSET ${offset}`,
    [userId],
  );
  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM comments c
      WHERE c.user_id = ? AND c.status = 'visible'
        AND (c.review_ratings IS NULL OR c.chapter_id IS NOT NULL)`,
    [userId],
  );

  return {
    items: rows.map((r) => ({
      id: r.id,
      body: r.body,
      isSpoiler: Number(r.is_spoiler) === 1,
      createdAt: r.created_at,
      chapterId: r.chapter_id,
      replyToName: r.parent_author_name || null,
      chapter: r.chapter_id
        ? { id: r.chapter_id, idx: r.chapter_idx, title: r.chapter_title }
        : null,
      book: r.book_id
        ? {
            id: r.book_id,
            slug: r.slug,
            title: r.title,
            coverUrl: r.cover_url,
            category: r.category || r.genre || null,
            genre: r.genre || null,
            authorName: r.author_name || null,
            authorId: r.author_user_id || null,
          }
        : null,
    })),
    page: safePage,
    pageSize: safePageSize,
    total: Number(countRows[0].total),
  };
}

async function listPublicCollections(userId, viewerId, { page = 1, pageSize = 20 } = {}) {
  const isOwner = Number(viewerId) === Number(userId);
  const { page: safePage, pageSize: safePageSize, offset } = clampPagination(page, pageSize, {
    defaultSize: 20,
    max: 60,
  });

  const [rows] = await pool.execute(
    `SELECT uc.*,
            (SELECT COUNT(*) FROM collection_books cb
              JOIN books b ON b.id = cb.book_id
             WHERE cb.collection_id = uc.id AND b.recycled_at IS NULL) AS book_count
       FROM user_collections uc
      WHERE uc.user_id = ?
        AND (? = 1 OR uc.visibility = 'public')
      ORDER BY uc.updated_at DESC
      LIMIT ${safePageSize} OFFSET ${offset}`,
    [userId, isOwner ? 1 : 0],
  );
  const [c] = await pool.execute(
    `SELECT COUNT(*) AS total FROM user_collections
      WHERE user_id = ? AND (? = 1 OR visibility = 'public')`,
    [userId, isOwner ? 1 : 0],
  );

  return {
    items: rows.map((r) => ({
      id: r.id,
      name: r.name,
      visibility: r.visibility,
      bookCount: Number(r.book_count),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })),
    page: safePage,
    pageSize: safePageSize,
    total: Number(c[0].total),
  };
}

async function getPublicCollection(userId, collectionId, viewerId) {
  const isOwner = Number(viewerId) === Number(userId);
  const [rows] = await pool.execute(
    `SELECT * FROM user_collections WHERE id = ? AND user_id = ? LIMIT 1`,
    [collectionId, userId],
  );
  const col = rows[0];
  if (!col) throw errors.notFound('Collection not found');
  if (!isOwner && col.visibility !== 'public') {
    throw errors.forbidden('This collection is private');
  }

  const [books] = await pool.execute(
    `SELECT b.id, b.slug, b.title, b.cover_url, b.category, b.view_count,
            b.serialization_status, cb.added_at,
            (SELECT COUNT(*) FROM library l WHERE l.book_id = b.id) AS bookmark_count,
            (SELECT COUNT(DISTINCT rp.user_id) FROM reader_progress rp WHERE rp.book_id = b.id) AS reader_count,
            (SELECT COUNT(*) FROM chapters ch
              WHERE ch.book_id = b.id AND ch.status = 'published' AND ch.recycled_at IS NULL) AS chapter_count,
            (SELECT AVG((
               COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(c.review_ratings, '$.writingQuality')) AS DECIMAL(4,2)), 0)
             + COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(c.review_ratings, '$.stabilityOfUpdates')) AS DECIMAL(4,2)), 0)
             + COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(c.review_ratings, '$.storyDevelopment')) AS DECIMAL(4,2)), 0)
             + COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(c.review_ratings, '$.characterDesign')) AS DECIMAL(4,2)), 0)
             + COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(c.review_ratings, '$.worldBackground')) AS DECIMAL(4,2)), 0)
             ) / 5)
               FROM comments c
              WHERE c.book_id = b.id AND c.chapter_id IS NULL AND c.review_ratings IS NOT NULL
                AND c.status = 'visible') AS avg_rating
       FROM collection_books cb
       JOIN books b ON b.id = cb.book_id
      WHERE cb.collection_id = ? AND b.recycled_at IS NULL
      ORDER BY cb.added_at DESC`,
    [collectionId],
  );

  return {
    collection: {
      id: col.id,
      name: col.name,
      visibility: col.visibility,
      createdAt: col.created_at,
      updatedAt: col.updated_at,
    },
    books: books.map((b) => ({
      id: b.id,
      slug: b.slug,
      title: b.title,
      coverUrl: b.cover_url,
      category: b.category,
      status: b.serialization_status || 'ongoing',
      addedAt: b.added_at,
      views: Math.max(Number(b.view_count || 0), Number(b.reader_count || 0)),
      bookmarks: Number(b.bookmark_count || 0),
      chapters: Number(b.chapter_count || 0),
      rating: b.avg_rating != null ? Math.round(Number(b.avg_rating) * 10) / 10 : null,
    })),
  };
}

async function follow(followerId, followeeId) {
  if (Number(followerId) === Number(followeeId)) {
    throw errors.badRequest('You cannot follow yourself');
  }
  const target = await getUserRow(followeeId);
  if (!target || target.status === 'suspended') throw errors.notFound('User not found');

  try {
    await pool.execute(
      'INSERT INTO user_follows (follower_id, followee_id) VALUES (?, ?)',
      [followerId, followeeId],
    );
  } catch (_e) {
    // already following
  }
  await tryGrantAchievement(followerId, 'first_follow');
  const counts = await followCounts(followeeId);
  if (counts.followers >= 10) await tryGrantAchievement(followeeId, 'followers_10');
  return { isFollowing: true, followers: counts.followers, following: counts.following };
}

async function unfollow(followerId, followeeId) {
  await pool.execute(
    'DELETE FROM user_follows WHERE follower_id = ? AND followee_id = ?',
    [followerId, followeeId],
  );
  const counts = await followCounts(followeeId);
  return { isFollowing: false, followers: counts.followers, following: counts.following };
}

async function checkIn(userId) {
  const today = toDateStr();
  const row = await getUserRow(userId);
  if (!row) throw errors.notFound('User not found');
  if (row.last_checkin_date && String(row.last_checkin_date).slice(0, 10) === today) {
    throw errors.conflict('Already checked in today');
  }

  try {
    await pool.execute(
      'INSERT INTO daily_checkins (user_id, checkin_date, xp_awarded) VALUES (?, ?, ?)',
      [userId, today, CHECKIN_XP],
    );
  } catch (_e) {
    throw errors.conflict('Already checked in today');
  }

  let streak = 1;
  const last = row.last_checkin_date ? String(row.last_checkin_date).slice(0, 10) : null;
  if (last === yesterdayStr()) {
    streak = Number(row.current_streak || 0) + 1;
  }
  const longest = Math.max(Number(row.longest_streak || 0), streak);

  await pool.execute(
    `UPDATE users
        SET last_checkin_date = ?, current_streak = ?, longest_streak = ?,
            bonus_balance = bonus_balance + IF(reader_level >= 3, 5, 0)
      WHERE id = ?`,
    [today, streak, longest, userId],
  );

  await awardXp(userId, 'check_in', CHECKIN_XP, { date: today });
  if (streak >= 7) await tryGrantAchievement(userId, 'streak_7');
  if (streak >= 30) await tryGrantAchievement(userId, 'streak_30');

  const updated = await getUserRow(userId);
  return {
    checkedIn: true,
    xpAwarded: CHECKIN_XP,
    currentStreak: Number(updated.current_streak),
    longestStreak: Number(updated.longest_streak),
    level: xpProgress(updated.xp),
  };
}

async function updateProfile(userId, patch) {
  const fields = [];
  const params = [];

  const map = {
    displayName: 'display_name',
    bio: 'bio',
    country: 'country',
    birthDate: 'birth_date',
    showReviews: 'show_reviews',
    showComments: 'show_comments',
    notifyEmail: 'notify_email',
    notifyPush: 'notify_push',
  };

  for (const [key, col] of Object.entries(map)) {
    if (!Object.prototype.hasOwnProperty.call(patch, key)) continue;
    let val = patch[key];
    if (typeof val === 'boolean') val = val ? 1 : 0;
    if (val === '' || val === undefined) val = null;
    if (key === 'birthDate' && val instanceof Date) {
      val = val.toISOString().slice(0, 10);
    }
    fields.push(`${col} = ?`);
    params.push(val);
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'socialLinks')) {
    const incoming = patch.socialLinks || {};
    const cleaned = {};
    for (const k of SOCIAL_KEYS) {
      if (incoming[k] != null && String(incoming[k]).trim()) {
        cleaned[k] = String(incoming[k]).trim().slice(0, 300);
      }
    }
    fields.push('social_links = ?');
    params.push(JSON.stringify(cleaned));
  }

  if (fields.length === 0) {
    return getProfile(userId, userId);
  }

  params.push(userId);
  await pool.execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params);
  return getProfile(userId, userId);
}

async function uploadAvatar(userId, file) {
  if (!file) throw errors.badRequest('Avatar image is required');
  const row = await getUserRow(userId);
  if (!row) throw errors.notFound('User not found');

  const { url, key } = await storage.persist(file, { prefix: `avatars/${userId}` });
  if (row.avatar_storage_key) {
    try { await storage.remove(row.avatar_storage_key); } catch (_e) { /* ignore */ }
  }
  await pool.execute(
    'UPDATE users SET avatar_url = ?, avatar_storage_key = ? WHERE id = ?',
    [url, key, userId],
  );
  return getProfile(userId, userId);
}

async function uploadBanner(userId, file) {
  if (!file) throw errors.badRequest('Banner image is required');
  const row = await getUserRow(userId);
  if (!row) throw errors.notFound('User not found');

  const dims = readImageDimensions(file);
  if (!dims || dims.width < BANNER_MIN_WIDTH || dims.height < BANNER_MIN_HEIGHT) {
    throw errors.unprocessable(
      `Banner must be at least ${BANNER_MIN_WIDTH}×${BANNER_MIN_HEIGHT}px`
        + (dims ? ` (got ${dims.width}×${dims.height})` : ''),
    );
  }

  const { url, key } = await storage.persist(file, { prefix: `banners/${userId}` });
  if (row.banner_storage_key) {
    try { await storage.remove(row.banner_storage_key); } catch (_e) { /* ignore */ }
  }
  await pool.execute(
    'UPDATE users SET banner_url = ?, banner_storage_key = ? WHERE id = ?',
    [url, key, userId],
  );
  return getProfile(userId, userId);
}

async function changePassword(userId, { currentPassword, newPassword }) {
  const row = await getUserRow(userId);
  if (!row) throw errors.notFound('User not found');
  if (!row.password_hash) {
    throw errors.badRequest('This account uses Google sign-in and has no password');
  }
  const ok = await comparePassword(currentPassword, row.password_hash);
  if (!ok) throw errors.unauthorized('Current password is incorrect');
  const password_hash = await hashPassword(newPassword);
  await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, userId]);
  return { ok: true };
}

async function updateEmail(userId, { email, password }) {
  const row = await getUserRow(userId);
  if (!row) throw errors.notFound('User not found');
  if (row.password_hash) {
    const ok = await comparePassword(password, row.password_hash);
    if (!ok) throw errors.unauthorized('Password is incorrect');
  }
  const next = String(email || '').trim().toLowerCase();
  const [existing] = await pool.execute(
    'SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1',
    [next, userId],
  );
  if (existing[0]) throw errors.conflict('Email already in use');
  await pool.execute('UPDATE users SET email = ? WHERE id = ?', [next, userId]);
  return getProfile(userId, userId);
}

async function deleteAccount(userId, { password }) {
  const row = await getUserRow(userId);
  if (!row) throw errors.notFound('User not found');
  if (row.role === 'admin') throw errors.forbidden('Admin accounts cannot be deleted here');
  if (row.password_hash) {
    const ok = await comparePassword(password, row.password_hash);
    if (!ok) throw errors.unauthorized('Password is incorrect');
  }
  await pool.execute('DELETE FROM users WHERE id = ?', [userId]);
  return { ok: true };
}

async function recordReadingActivity(userId) {
  const today = toDateStr();
  const row = await getUserRow(userId);
  if (!row) return;
  if (row.last_read_date && String(row.last_read_date).slice(0, 10) === today) return;
  await pool.execute('UPDATE users SET last_read_date = ? WHERE id = ?', [today, userId]);
  await awardXp(userId, 'reading', READING_XP, { date: today });
  await tryGrantAchievement(userId, 'first_read');
}

function enrichPublicUser(row) {
  return publicUser(row, {
    bannerUrl: row.banner_url || null,
    country: row.country || null,
    isVerified: Number(row.is_verified) === 1,
    isPremium: Number(row.is_premium) === 1 || row.membership_tier === 'premium',
    readerLevel: Number(row.reader_level) || 1,
    xp: Number(row.xp) || 0,
    level: xpProgress(row.xp),
    showReviews: Number(row.show_reviews) !== 0,
    showComments: Number(row.show_comments) !== 0,
    membershipTier: row.membership_tier || 'none',
    currentStreak: Number(row.current_streak) || 0,
    longestStreak: Number(row.longest_streak) || 0,
  });
}

module.exports = {
  SOCIAL_KEYS,
  XP_THRESHOLDS,
  getProfile,
  getOverview,
  listLevelBenefits,
  listAchievements,
  listProfileNovels,
  setNovelProfileVisibility,
  listLibrary,
  listReviews,
  listComments,
  listPublicCollections,
  getPublicCollection,
  follow,
  unfollow,
  checkIn,
  updateProfile,
  uploadAvatar,
  uploadBanner,
  changePassword,
  updateEmail,
  deleteAccount,
  recordReadingActivity,
  awardXp,
  tryGrantAchievement,
  syncAchievements,
  enrichPublicUser,
  profilePublicFields,
};
