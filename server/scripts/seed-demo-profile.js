#!/usr/bin/env node
'use strict';

/**
 * Seed a rich demo profile (badges, XP, streak, bio, follows) for local UI review.
 *
 * Usage:
 *   node scripts/seed-demo-profile.js
 *   node scripts/seed-demo-profile.js sujalpatel1502@gmail.com
 */

const pool = require('../src/db/pool');
const { levelFromXp } = require('../src/services/levels');

const EMAIL = String(process.argv[2] || 'sujalpatel1502@gmail.com').trim().toLowerCase();

const DEMO_BADGE_CODES = [
  'first_read',
  'books_read_5',
  'books_read_25',
  'streak_7',
  'streak_30',
  'first_review',
  'first_comment',
  'first_follow',
  'followers_10',
  'library_10',
  'genre_fantasy',
  'genre_eastern',
  'genre_romance',
  'genre_horror',
  'genre_scifi',
  'event_new_year',
  'event_halloween',
  'event_anniversary',
  'event_winter',
  'premium_member',
  'verified_reader',
  'night_owl',
  'critic',
  'social_butterfly',
];

async function main() {
  const [users] = await pool.execute('SELECT * FROM users WHERE email = ? LIMIT 1', [EMAIL]);
  const user = users[0];
  if (!user) {
    console.error(`User not found: ${EMAIL}`);
    process.exit(1);
  }

  const userId = user.id;
  const xp = Math.max(Number(user.xp) || 0, 280);
  const level = levelFromXp(xp);

  await pool.execute(
    `UPDATE users SET
        bio = COALESCE(NULLIF(bio, ''), ?),
        country = COALESCE(NULLIF(country, ''), ?),
        is_verified = 1,
        is_premium = 1,
        membership_tier = 'premium',
        membership_expires_at = DATE_ADD(NOW(), INTERVAL 90 DAY),
        bonus_balance = GREATEST(bonus_balance, 120),
        xp = ?,
        reader_level = ?,
        current_streak = GREATEST(current_streak, 7),
        longest_streak = GREATEST(longest_streak, 14),
        last_checkin_date = CURDATE(),
        last_read_date = CURDATE(),
        show_reviews = 1,
        show_comments = 1,
        social_links = COALESCE(social_links, ?)
      WHERE id = ?`,
    [
      'Reader, reviewer, and late-night chapter hopper. Building stories one page at a time.',
      'India',
      xp,
      level,
      JSON.stringify({
        website: 'https://novelcenter.local',
        twitter: 'https://twitter.com/novelcenter',
        discord: 'sujal#1502',
      }),
      userId,
    ],
  );

  // Wallet top-up for dashboard
  await pool.execute(
    'UPDATE wallets SET balance = GREATEST(balance, 450) WHERE user_id = ?',
    [userId],
  );

  // Grant demo badges
  const [achs] = await pool.execute(
    `SELECT id, code, xp_reward FROM achievements WHERE code IN (${DEMO_BADGE_CODES.map(() => '?').join(',')})`,
    DEMO_BADGE_CODES,
  );
  let granted = 0;
  for (const a of achs) {
    const [r] = await pool.execute(
      'INSERT IGNORE INTO user_achievements (user_id, achievement_id) VALUES (?, ?)',
      [userId, a.id],
    );
    if (r.affectedRows) {
      granted += 1;
      await pool.execute(
        'INSERT INTO user_xp_events (user_id, source, amount, meta) VALUES (?, ?, ?, ?)',
        [userId, 'events', Number(a.xp_reward) || 0, JSON.stringify({ achievement: a.code, seed: true })],
      );
    }
  }

  // Sample notifications
  const [notifCount] = await pool.execute(
    'SELECT COUNT(*) AS c FROM user_notifications WHERE user_id = ?',
    [userId],
  );
  if (Number(notifCount[0].c) === 0) {
    await pool.execute(
      `INSERT INTO user_notifications (user_id, type, title, body, link_url, is_read) VALUES
        (?, 'achievement', 'Badge unlocked', 'You earned Week Streak — keep the fire going.', '/account', 0),
        (?, 'system', 'Welcome', 'Your profile is ready. Customize your banner and bio anytime.', '/account', 0),
        (?, 'social', 'New follower', 'Someone started following your reading journey.', '/account', 1)`,
      [userId, userId, userId],
    );
  }

  // Public collection for Activity tab
  const [cols] = await pool.execute(
    'SELECT id FROM user_collections WHERE user_id = ? AND name = ? LIMIT 1',
    [userId, 'Nightstand Picks'],
  );
  let collectionId = cols[0]?.id;
  if (!collectionId) {
    const [ins] = await pool.execute(
      `INSERT INTO user_collections (user_id, name, visibility) VALUES (?, 'Nightstand Picks', 'public')`,
      [userId],
    );
    collectionId = ins.insertId;
  } else {
    await pool.execute(
      `UPDATE user_collections SET visibility = 'public' WHERE id = ?`,
      [collectionId],
    );
  }

  const [books] = await pool.execute(
    `SELECT id FROM books WHERE status = 'published' AND recycled_at IS NULL ORDER BY updated_at DESC LIMIT 6`,
  );
  for (const b of books) {
    await pool.execute(
      'INSERT IGNORE INTO collection_books (collection_id, book_id) VALUES (?, ?)',
      [collectionId, b.id],
    );
    await pool.execute(
      'INSERT IGNORE INTO library (user_id, book_id, reading_status) VALUES (?, ?, ?)',
      [userId, b.id, 'active'],
    );
  }

  // Follow a few other users so Following count isn't empty
  const [others] = await pool.execute(
    `SELECT id FROM users WHERE id <> ? AND status = 'active' ORDER BY id ASC LIMIT 5`,
    [userId],
  );
  for (const o of others) {
    await pool.execute(
      'INSERT IGNORE INTO user_follows (follower_id, followee_id) VALUES (?, ?)',
      [userId, o.id],
    );
  }
  // Get a couple followers back
  for (const o of others.slice(0, 3)) {
    await pool.execute(
      'INSERT IGNORE INTO user_follows (follower_id, followee_id) VALUES (?, ?)',
      [o.id, userId],
    );
  }

  // Fake some reading progress for hours/books stats
  if (books[0]) {
    const [chs] = await pool.execute(
      `SELECT id, book_id FROM chapters WHERE book_id = ? AND status = 'published' ORDER BY idx ASC LIMIT 3`,
      [books[0].id],
    );
    for (const ch of chs) {
      await pool.execute(
        `INSERT INTO reader_progress (user_id, chapter_id, book_id, percent, position)
         VALUES (?, ?, ?, 100, 0)
         ON DUPLICATE KEY UPDATE percent = GREATEST(percent, 100)`,
        [userId, ch.id, ch.book_id],
      );
    }
  }

  const [finalUser] = await pool.execute(
    'SELECT id, email, display_name, xp, reader_level, current_streak, longest_streak FROM users WHERE id = ?',
    [userId],
  );
  const [badgeRows] = await pool.execute(
    'SELECT COUNT(*) AS c FROM user_achievements WHERE user_id = ?',
    [userId],
  );

  console.log('Demo profile seeded:');
  console.log({
    id: finalUser[0].id,
    email: finalUser[0].email,
    displayName: finalUser[0].display_name,
    xp: finalUser[0].xp,
    level: finalUser[0].reader_level,
    streak: finalUser[0].current_streak,
    badges: Number(badgeRows[0].c),
    newlyGranted: granted,
    profileUrl: `/users/${userId}`,
    accountUrl: '/account',
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
