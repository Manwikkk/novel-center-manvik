'use strict';

const pool = require('../db/pool');
const storage = require('../storage');
const { errors } = require('../utils/HttpError');
const { clampPagination } = require('../utils/pagination');
const { hashPassword, comparePassword } = require('../utils/hash');
const { publicUser } = require('../utils/publicUser');
const { readImageDimensions } = require('../utils/imageDimensions');
const { levelFromXp, xpProgress, XP_THRESHOLDS } = require('./levels');
const { dateOnly } = require('../utils/dateOnly');
const checkinConfig = require('./checkinConfig.service');
const checkin = require('./checkin.service');
const notifications = require('./notifications.service');

const BANNER_MIN_WIDTH = 1080;
const BANNER_MIN_HEIGHT = 420;

const SOCIAL_KEYS = ['website', 'twitter', 'discord', 'instagram', 'facebook', 'youtube'];
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

function profilePublicFields(row, { isOwner = false, viewerId = null } = {}) {
  const socialLinks = parseJson(row.social_links, {});
  const base = {
    id: row.id,
    displayName: row.display_name,
    role: row.role,
    experience: row.experience || (row.role === 'author' || row.role === 'admin' ? 'both' : 'reader'),
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
    totalCheckIns: Number(row.total_checkins) || 0,
    membershipTier: row.membership_tier || 'none',
    profileTitle: row.profile_title || null,
    profileCosmetic: row.profile_cosmetic || null,
  };

  if (isOwner) {
    return {
      ...base,
      email: row.email,
      birthDate: dateOnly(row.birth_date),
      bonusBalance: Number(row.bonus_balance) || 0,
      membershipExpiresAt: row.membership_expires_at || null,
      notifyEmail: Number(row.notify_email) !== 0,
      notifyPush: Number(row.notify_push) !== 0,
      lastCheckinDate: dateOnly(row.last_checkin_date),
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
  const [ach] = await pool.execute('SELECT id, title, xp_reward FROM achievements WHERE code = ? LIMIT 1', [code]);
  if (!ach[0]) return null;
  try {
    await pool.execute(
      'INSERT INTO user_achievements (user_id, achievement_id) VALUES (?, ?)',
      [userId, ach[0].id],
    );
    if (ach[0].xp_reward > 0) {
      await awardXp(userId, 'events', Number(ach[0].xp_reward), { achievement: code });
    }
    await notifications.notify(userId, {
      type: 'badge',
      title: `Badge unlocked: ${ach[0].title}`,
      body: ach[0].xp_reward > 0 ? `+${ach[0].xp_reward} EXP added to your reader level.` : null,
      linkUrl: '/account?tab=achievements',
    });
    try {
      const tasks = require('./tasks.service');
      await tasks.safeIngest(userId);
    } catch (err) {
      console.error('[tasks] achievement hook', err && err.message ? err.message : err);
    }
    return code;
  } catch (_e) {
    return null; // already earned
  }
}

/**
 * Achievement rules: badge code → the activity metric it tracks and the value
 * that earns it. Used both to grant badges and to show progress on locked ones.
 */
const ACHIEVEMENT_RULES = {
  first_read: { metric: 'progressRows', target: 1 },
  books_read_5: { metric: 'booksRead', target: 5 },
  books_read_25: { metric: 'booksRead', target: 25 },
  library_10: { metric: 'library', target: 10 },
  library_50: { metric: 'library', target: 50 },
  first_review: { metric: 'reviews', target: 1 },
  critic: { metric: 'reviews', target: 5 },
  first_comment: { metric: 'comments', target: 1 },
  social_butterfly: { metric: 'comments', target: 25 },
  first_follow: { metric: 'following', target: 1 },
  followers_10: { metric: 'followers', target: 10 },
  followers_100: { metric: 'followers', target: 100 },
  first_novel: { metric: 'novels', target: 1 },
  streak_7: { metric: 'bestStreak', target: 7 },
  streak_30: { metric: 'bestStreak', target: 30 },
  streak_100: { metric: 'bestStreak', target: 100 },
  streak_365: { metric: 'bestStreak', target: 365 },
  checkins_100: { metric: 'totalCheckIns', target: 100 },
  checkins_500: { metric: 'totalCheckIns', target: 500 },
  chapters_100: { metric: 'chaptersRead', target: 100 },
  chapters_1000: { metric: 'chaptersRead', target: 1000 },
  novels_completed_1: { metric: 'novelsCompleted', target: 1 },
  novels_completed_10: { metric: 'novelsCompleted', target: 10 },
  verified_reader: { metric: 'verified', target: 1 },
  premium_member: { metric: 'premium', target: 1 },
  genre_fantasy: { metric: 'genreFantasy', target: 1 },
  genre_eastern: { metric: 'genreEastern', target: 1 },
  genre_romance: { metric: 'genreRomance', target: 1 },
  genre_horror: { metric: 'genreHorror', target: 1 },
  genre_scifi: { metric: 'genreScifi', target: 1 },
};

/** Live activity counters behind every rule-based achievement. */
async function collectAchievementMetrics(userId) {
  const [[stats]] = await pool.execute(
    `SELECT
       (SELECT COUNT(*) FROM reader_progress WHERE user_id = ?) AS progress_rows,
       (SELECT COUNT(*) FROM library WHERE user_id = ?) AS library_count,
       (SELECT COUNT(*) FROM comments
         WHERE user_id = ? AND chapter_id IS NULL AND parent_id IS NULL
           AND review_ratings IS NOT NULL AND status = 'visible') AS reviews,
       (SELECT COUNT(*) FROM comments
         WHERE user_id = ? AND status = 'visible'
           AND (review_ratings IS NULL OR chapter_id IS NOT NULL)) AS comments,
       (SELECT COUNT(*) FROM user_follows WHERE follower_id = ?) AS following,
       (SELECT COUNT(*) FROM user_follows WHERE followee_id = ?) AS followers,
       (SELECT COUNT(*) FROM books
         WHERE author_id = ? AND status = 'published' AND recycled_at IS NULL) AS novels,
       (SELECT COUNT(*) FROM reader_progress WHERE user_id = ? AND qualified_at IS NOT NULL) AS chapters_read,
       (SELECT COUNT(*) FROM novel_completions WHERE user_id = ?) AS novels_completed`,
    [userId, userId, userId, userId, userId, userId, userId, userId, userId],
  );
  const booksRead = await booksReadCount(userId);
  const [userRows] = await pool.execute(
    'SELECT current_streak, longest_streak, total_checkins, is_verified, is_premium, membership_tier FROM users WHERE id = ? LIMIT 1',
    [userId],
  );
  const u = userRows[0] || {};

  // Genre badges from library categories / genres
  const [genreRows] = await pool.execute(
    `SELECT DISTINCT LOWER(COALESCE(b.genre, b.category, '')) AS g
       FROM library l
       JOIN books b ON b.id = l.book_id
      WHERE l.user_id = ? AND b.recycled_at IS NULL`,
    [userId],
  );
  const joined = genreRows.map((r) => String(r.g || '')).join(' ');

  return {
    progressRows: Number(stats.progress_rows || 0),
    booksRead,
    library: Number(stats.library_count || 0),
    reviews: Number(stats.reviews || 0),
    comments: Number(stats.comments || 0),
    following: Number(stats.following || 0),
    followers: Number(stats.followers || 0),
    novels: Number(stats.novels || 0),
    chaptersRead: Number(stats.chapters_read || 0),
    novelsCompleted: Number(stats.novels_completed || 0),
    bestStreak: Math.max(Number(u.current_streak || 0), Number(u.longest_streak || 0)),
    totalCheckIns: Number(u.total_checkins || 0),
    verified: Number(u.is_verified) === 1 ? 1 : 0,
    premium: Number(u.is_premium) === 1 || ['plus', 'premium'].includes(u.membership_tier) ? 1 : 0,
    genreFantasy: /fantasy|isekai|magic/i.test(joined) ? 1 : 0,
    genreEastern: /eastern|xianxia|wuxia|cultivat/i.test(joined) ? 1 : 0,
    genreRomance: /romance|yuri|yaoi|love/i.test(joined) ? 1 : 0,
    genreHorror: /horror|thriller|dark/i.test(joined) ? 1 : 0,
    genreScifi: /sci-?fi|science|cyber|space/i.test(joined) ? 1 : 0,
  };
}

/**
 * Re-evaluate milestone achievements from live activity and grant any newly earned.
 * Safe to call often — INSERT IGNORE style via tryGrantAchievement.
 */
async function syncAchievements(userId) {
  if (!userId) return [];
  const metrics = await collectAchievementMetrics(userId);
  const earned = [];
  for (const [code, rule] of Object.entries(ACHIEVEMENT_RULES)) {
    if (Number(metrics[rule.metric] || 0) >= rule.target) {
      // eslint-disable-next-line no-await-in-loop
      const granted = await tryGrantAchievement(userId, code);
      if (granted) earned.push(granted);
    }
  }
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
  const checkinCfg = isOwner ? await checkinConfig.getConfig() : null;

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
      checkedInToday: checkin.isClaimedToday({ last_checkin_date: profile.lastCheckinDate }, checkinCfg),
      readingStreak: profile.currentStreak,
      unreadNotifications: Number(unread) || 0,
      booksRead: profile.booksRead,
      longestStreak: profile.longestStreak,
      totalCheckIns: profile.totalCheckIns,
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

const BADGE_SHOWCASE_MAX = 4;

async function listAchievements(userId, { earnedOnly = false, limit, withProgress = false } = {}) {
  let sql = `
    SELECT a.id, a.code, a.title, a.description, a.icon, a.category, a.xp_reward,
           ua.earned_at, ua.pinned_order
      FROM achievements a
      LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = ?
  `;
  if (earnedOnly) sql += ' WHERE ua.earned_at IS NOT NULL';
  sql += ' ORDER BY ua.earned_at DESC, a.id ASC';
  if (limit) sql += ` LIMIT ${Number(limit)}`;

  const [rows] = await pool.execute(sql, [userId]);
  // Progress towards locked badges is derived from the owner's own activity
  // counters, so it is only computed for the profile owner.
  const metrics = withProgress ? await collectAchievementMetrics(userId) : null;

  const items = rows.map((r) => {
    const rule = ACHIEVEMENT_RULES[r.code] || null;
    let progress = null;
    if (rule && !r.earned_at) {
      if (metrics) {
        const current = Math.min(rule.target, Number(metrics[rule.metric] || 0));
        progress = { current, target: rule.target, percent: Math.round((current / rule.target) * 100) };
      } else {
        progress = { current: null, target: rule.target, percent: null };
      }
    }
    return {
      id: r.id,
      code: r.code,
      title: r.title,
      description: r.description,
      icon: r.icon,
      category: r.category,
      xpReward: Number(r.xp_reward),
      earnedAt: r.earned_at || null,
      earned: !!r.earned_at,
      pinned: r.pinned_order != null,
      pinnedOrder: r.pinned_order != null ? Number(r.pinned_order) : null,
      progress,
    };
  });

  const earnedCount = items.filter((a) => a.earned).length;
  return {
    items,
    summary: {
      earned: earnedCount,
      total: earnedOnly ? null : items.length,
      xpFromBadges: items.filter((a) => a.earned).reduce((sum, a) => sum + a.xpReward, 0),
      pinned: items.filter((a) => a.pinned).length,
      showcaseMax: BADGE_SHOWCASE_MAX,
    },
  };
}

/** Pin up to BADGE_SHOWCASE_MAX earned badges (ordered) to the profile header. */
async function setBadgeShowcase(userId, codes) {
  const wanted = [...new Set((Array.isArray(codes) ? codes : []).map((c) => String(c)))].slice(0, BADGE_SHOWCASE_MAX);
  if (wanted.length) {
    const placeholders = wanted.map(() => '?').join(',');
    const [rows] = await pool.execute(
      `SELECT a.code FROM user_achievements ua
         JOIN achievements a ON a.id = ua.achievement_id
        WHERE ua.user_id = ? AND a.code IN (${placeholders})`,
      [userId, ...wanted],
    );
    const earnedCodes = new Set(rows.map((r) => r.code));
    const missing = wanted.filter((c) => !earnedCodes.has(c));
    if (missing.length) throw errors.badRequest('You can only showcase badges you have earned');
  }
  await pool.execute('UPDATE user_achievements SET pinned_order = NULL WHERE user_id = ?', [userId]);
  for (let i = 0; i < wanted.length; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await pool.execute(
      `UPDATE user_achievements ua JOIN achievements a ON a.id = ua.achievement_id
          SET ua.pinned_order = ? WHERE ua.user_id = ? AND a.code = ?`,
      [i + 1, userId, wanted[i]],
    );
  }
  return listAchievements(userId, { withProgress: true });
}

/** Full badge objects for a list of codes (used for unlock celebrations). */
async function achievementsByCodes(userId, codes) {
  const list = [...new Set((codes || []).filter(Boolean))];
  if (!list.length) return [];
  const placeholders = list.map(() => '?').join(',');
  const [rows] = await pool.execute(
    `SELECT a.id, a.code, a.title, a.description, a.icon, a.category, a.xp_reward, ua.earned_at
       FROM achievements a
       LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = ?
      WHERE a.code IN (${placeholders})`,
    [userId, ...list],
  );
  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    title: r.title,
    description: r.description,
    icon: r.icon,
    category: r.category,
    xpReward: Number(r.xp_reward),
    earnedAt: r.earned_at || null,
    earned: !!r.earned_at,
  }));
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

  let created = false;
  try {
    const [r] = await pool.execute(
      'INSERT INTO user_follows (follower_id, followee_id) VALUES (?, ?)',
      [followerId, followeeId],
    );
    created = r.affectedRows > 0;
  } catch (_e) {
    // already following
  }
  await tryGrantAchievement(followerId, 'first_follow');
  const counts = await followCounts(followeeId);
  if (counts.followers >= 10) await tryGrantAchievement(followeeId, 'followers_10');
  if (counts.followers >= 100) await tryGrantAchievement(followeeId, 'followers_100');
  if (created) {
    const isAuthor = target.role === 'author'
      || target.role === 'admin';
    let followsAuthor = isAuthor && target.role === 'author';
    if (!followsAuthor) {
      const [books] = await pool.execute(
        `SELECT 1 FROM books
          WHERE author_id = ? AND status = 'published' AND recycled_at IS NULL
          LIMIT 1`,
        [followeeId],
      );
      followsAuthor = !!books[0];
    }
    if (followsAuthor) {
      try {
        const tasks = require('./tasks.service');
        await tasks.safeIngest(followerId);
      } catch (err) {
        console.error('[tasks] follow hook', err && err.message ? err.message : err);
      }
    }
    const follower = await getUserRow(followerId);
    await notifications.notify(followeeId, {
      type: 'follow',
      title: `${follower?.display_name || 'Someone'} started following you`,
      body: `You now have ${counts.followers} follower${counts.followers === 1 ? '' : 's'}.`,
      linkUrl: `/users/${followerId}`,
    });
  }
  return { isFollowing: true, followers: counts.followers, following: counts.following };
}

/** Public user card used by follower / following lists. */
function followRowToCard(r) {
  return {
    id: r.id,
    displayName: r.display_name,
    avatarUrl: r.avatar_url,
    bio: r.bio || '',
    role: r.role,
    isAuthor: r.role === 'author' || r.role === 'admin',
    isVerified: Number(r.is_verified) === 1,
    readerLevel: Number(r.reader_level) || 1,
    bookCount: Number(r.book_count || 0),
    followers: Number(r.follower_count || 0),
    isFollowing: Number(r.viewer_follows || 0) > 0,
    followedAt: r.followed_at,
  };
}

async function listFollowRelations(userId, viewerId, direction, { page = 1, pageSize = 24 } = {}) {
  const { page: safePage, pageSize: safePageSize, offset } = clampPagination(page, pageSize, {
    defaultSize: 24,
    max: 60,
  });
  // followers: people who follow `userId`; following: people `userId` follows.
  const joinCol = direction === 'followers' ? 'uf.follower_id' : 'uf.followee_id';
  const whereCol = direction === 'followers' ? 'uf.followee_id' : 'uf.follower_id';
  const [rows] = await pool.execute(
    `SELECT u.id, u.display_name, u.avatar_url, u.bio, u.role, u.is_verified, u.reader_level,
            uf.created_at AS followed_at,
            (SELECT COUNT(*) FROM books b WHERE b.author_id = u.id AND b.status = 'published' AND b.recycled_at IS NULL) AS book_count,
            (SELECT COUNT(*) FROM user_follows f2 WHERE f2.followee_id = u.id) AS follower_count,
            (SELECT COUNT(*) FROM user_follows f3 WHERE f3.follower_id = ? AND f3.followee_id = u.id) AS viewer_follows
       FROM user_follows uf
       JOIN users u ON u.id = ${joinCol}
      WHERE ${whereCol} = ? AND u.status = 'active'
      ORDER BY uf.created_at DESC
      LIMIT ${safePageSize} OFFSET ${offset}`,
    [viewerId || 0, userId],
  );
  const [[c]] = await pool.execute(
    `SELECT COUNT(*) AS total FROM user_follows uf JOIN users u ON u.id = ${joinCol}
      WHERE ${whereCol} = ? AND u.status = 'active'`,
    [userId],
  );
  return {
    items: rows.map(followRowToCard),
    page: safePage,
    pageSize: safePageSize,
    total: Number(c.total || 0),
  };
}

async function listFollowers(userId, viewerId, opts) {
  return listFollowRelations(userId, viewerId, 'followers', opts);
}

async function listFollowing(userId, viewerId, opts) {
  return listFollowRelations(userId, viewerId, 'following', opts);
}

async function unfollow(followerId, followeeId) {
  await pool.execute(
    'DELETE FROM user_follows WHERE follower_id = ? AND followee_id = ?',
    [followerId, followeeId],
  );
  const counts = await followCounts(followeeId);
  return { isFollowing: false, followers: counts.followers, following: counts.following };
}

// Daily Check-In lives in checkin.service (streak rules, rewards, milestones);
// this legacy entry point keeps /profiles/me/check-in working.
async function checkIn(userId) {
  return checkin.claim(userId);
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

  if (['reader', 'creator', 'both'].includes(patch.experience)) {
    fields.push('experience = ?');
    params.push(patch.experience);
    // Switching to a creator experience upgrades a reader account to author.
    if (patch.experience !== 'reader') fields.push("role = IF(role = 'user', 'author', role)");
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
  listFollowers,
  listFollowing,
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
  collectAchievementMetrics,
  ACHIEVEMENT_RULES,
  setBadgeShowcase,
  achievementsByCodes,
  enrichPublicUser,
  profilePublicFields,
};
