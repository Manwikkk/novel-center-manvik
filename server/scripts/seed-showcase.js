#!/usr/bin/env node
'use strict';

/**
 * Seed a realistic showcase catalogue: 8 authors, 10 readers, 18 novels with
 * full chapters, reviews, comments, follows, libraries, collections, unlocks,
 * check-in streaks, badges and notifications — enough to exercise search,
 * profiles, rankings, follows, badges and the reading/unlock flows.
 *
 * Re-runnable: every seeded account uses the `showcase.novelcentre.demo`
 * email domain and is wiped (with everything it owns) before re-inserting.
 *
 * Usage:
 *   node scripts/seed-showcase.js          # seed (assets must exist in client/public/stitch/seed)
 *   node scripts/seed-showcase.js --wipe   # remove showcase data only
 */

const fs = require('fs');
const path = require('path');

const pool = require('../src/db/pool');
const { withTransaction } = require('../src/db/tx');
const { hashPassword } = require('../src/utils/hash');
const { levelFromXp } = require('../src/services/levels');
const { computeTokenPrice } = require('../src/services/chapterPricing.service');
const finance = require('../src/services/finance.service');
const profileService = require('../src/services/profile.service');
const notifications = require('../src/services/notifications.service');
const { DEFAULT_DAILY_EXP, cycleDay } = require('../src/constants/checkin');
const { calendarDate, shiftDateStr } = require('../src/utils/calendarDay');
const pageSectionsSvc = require('../src/services/pageSections.service');
const data = require('./lib/showcaseData');
const { generateChapterHtml, authorThought, mulberry32, hashString, pick } = require('./lib/proseGenerator');

const WIPE_ONLY = process.argv.includes('--wipe');
const ASSET_DIR = path.resolve(__dirname, '../../client/public/stitch/seed');
const TZ = 'Asia/Kolkata';

const rng = mulberry32(hashString('novel-centre-showcase'));
const rint = (min, max) => min + Math.floor(rng() * (max - min + 1));
const chance = (p) => rng() < p;
const sample = (list, n) => {
  const copy = [...list];
  const out = [];
  while (copy.length && out.length < n) out.push(copy.splice(Math.floor(rng() * copy.length), 1)[0]);
  return out;
};

function daysAgo(days, hour = 9) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(hour, rint(0, 59), rint(0, 59), 0);
  return d;
}

function mysqlDt(d) {
  return new Date(d).toISOString().slice(0, 19).replace('T', ' ');
}

function assetUrl(name) {
  return fs.existsSync(path.join(ASSET_DIR, `${name}.jpg`)) ? `/stitch/seed/${name}.jpg` : null;
}

async function wipe() {
  let removed = 0;
  for (const domain of [data.DEMO_DOMAIN, ...(data.LEGACY_DOMAINS || [])]) {
    // eslint-disable-next-line no-await-in-loop
    const [r] = await pool.execute('DELETE FROM users WHERE email LIKE ?', [`%@${domain}`]);
    removed += r.affectedRows;
  }
  return removed;
}

async function catalogIds() {
  const [cats] = await pool.execute('SELECT id, label FROM catalog_categories');
  const [langs] = await pool.execute("SELECT id FROM catalog_languages WHERE code = 'en' LIMIT 1");
  const [tags] = await pool.execute('SELECT id, slug FROM catalog_content_tags');
  return {
    category: Object.fromEntries(cats.map((c) => [c.label, c.id])),
    languageId: langs[0]?.id || null,
    contentTag: Object.fromEntries(tags.map((t) => [t.slug, t.id])),
  };
}

async function insertUser(u, { role, passwordHash, index }) {
  const xp = u.xp || 0;
  const created = daysAgo(rint(120, 420));
  const streak = u.streak || 0;
  const longest = Math.max(u.longest || 0, streak);
  const today = calendarDate(TZ);
  const lastCheckIn = streak > 0 ? today : (longest > 0 ? shiftDateStr(today, -rint(4, 30)) : null);
  const [r] = await pool.execute(
    `INSERT INTO users
       (email, password_hash, display_name, role, experience, onboarding_completed, avatar_url, banner_url, bio, country,
        birth_date, social_links, is_verified, is_premium, membership_tier, membership_expires_at, xp, reader_level,
        current_streak, longest_streak, last_checkin_date, total_checkins, last_read_date, status, created_at)
     VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'active', ?)`,
    [
      `${u.key}@${data.DEMO_DOMAIN}`, passwordHash, u.displayName, role,
      role === 'author' ? 'both' : 'reader',
      role === 'author' ? assetUrl(`avatar-${u.key}`) : null,
      role === 'author' ? assetUrl(`banner-${u.key}`) : null,
      u.bio, u.country,
      `${1978 + ((index * 7) % 22)}-0${1 + (index % 9)}-1${index % 9}`,
      JSON.stringify(u.social || {}),
      u.verified ? 1 : 0, u.premium ? 1 : 0,
      u.premium ? 'premium' : 'none',
      u.premium ? mysqlDt(daysAgo(-rint(20, 200))) : null,
      xp, levelFromXp(xp),
      streak, longest, lastCheckIn,
      streak > 0 ? today : null,
      mysqlDt(created),
    ],
  );
  const id = r.insertId;
  await pool.execute(
    'INSERT INTO wallets (user_id, balance, purchased_balance, bonus_balance, promo_balance) VALUES (?, ?, ?, 0, 0)',
    [id, u.coins || 0, u.coins || 0],
  );

  // Check-in history that matches the streak numbers.
  const rows = [];
  if (streak > 0) {
    for (let i = 0; i < streak; i += 1) {
      const streakNo = streak - i;
      rows.push([id, shiftDateStr(today, -i), streakNo, cycleDay(streakNo), DEFAULT_DAILY_EXP[cycleDay(streakNo) - 1]]);
    }
  }
  if (longest > streak) {
    const gap = rint(3, 12);
    const end = shiftDateStr(today, -(streak + gap));
    for (let i = 0; i < Math.min(longest, 60); i += 1) {
      const streakNo = Math.min(longest, 60) - i;
      rows.push([id, shiftDateStr(end, -i), streakNo, cycleDay(streakNo), DEFAULT_DAILY_EXP[cycleDay(streakNo) - 1]]);
    }
  }
  for (const row of rows) {
    // eslint-disable-next-line no-await-in-loop
    await pool.execute(
      'INSERT IGNORE INTO daily_checkins (user_id, checkin_date, streak_number, display_day, xp_awarded) VALUES (?, ?, ?, ?, ?)',
      row,
    );
  }
  await pool.execute('UPDATE users SET total_checkins = (SELECT COUNT(*) FROM daily_checkins WHERE user_id = ?) WHERE id = ?', [id, id]);
  if (xp > 0) {
    await pool.execute(
      "INSERT INTO user_xp_events (user_id, source, amount, meta) VALUES (?, 'reading', ?, JSON_OBJECT('seed', true))",
      [id, Math.round(xp * 0.6)],
    );
    await pool.execute(
      "INSERT INTO user_xp_events (user_id, source, amount, meta) VALUES (?, 'check_in', ?, JSON_OBJECT('seed', true))",
      [id, xp - Math.round(xp * 0.6)],
    );
  }
  return id;
}

async function insertBook(book, authorId, ids) {
  const chapterCount = book.arc.length;
  const bookCreated = daysAgo(rint(90, 320));
  const updatedToday = book.shelves.includes('cheering_reads');
  const [r] = await pool.execute(
    `INSERT INTO books
       (slug, author_id, title, book_type, leading_gender, genre, book_length, warning_notice, synopsis, cover_url,
        category, category_id, language, language_id, status, serialization_status, show_on_profile, view_count,
        score, chapter_num, created_at, updated_at)
     VALUES (?, ?, ?, 'novel', ?, ?, 'novels', ?, ?, ?, ?, ?, 'en', ?, 'published', ?, 1, ?, NULL, ?, ?, ?)`,
    [
      book.slug, authorId, book.title, book.leadingGender, book.genre, book.warning, book.synopsis,
      assetUrl(`cover-${book.slug}`), book.category, ids.category[book.category] || null, ids.languageId,
      book.status, book.views, chapterCount, mysqlDt(bookCreated), mysqlDt(updatedToday ? new Date() : daysAgo(rint(1, 20))),
    ],
  );
  const bookId = r.insertId;

  const chapterIds = [];
  const chapterMeta = [];
  const spacing = Math.max(2, Math.floor((rint(70, 240)) / chapterCount));
  for (let i = 0; i < chapterCount; i += 1) {
    const [title, beat] = book.arc[i];
    const idx = i + 1;
    const target = 950 + ((idx * 173 + hashString(book.slug)) % 550);
    const { html, wordCount } = generateChapterHtml(book, idx, beat, target);
    const isPaid = idx > book.free;
    const price = isPaid ? computeTokenPrice(wordCount) : 0;
    const isLast = i === chapterCount - 1;
    const createdAt = updatedToday && isLast ? new Date() : new Date(bookCreated.getTime() + i * spacing * 86400000);
    const thought = chance(0.4) ? authorThought(book, idx) : null;
    // eslint-disable-next-line no-await-in-loop
    const [c] = await pool.execute(
      `INSERT INTO chapters (book_id, idx, title, content_html, author_thought, is_paid, token_price, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'published', ?, ?)`,
      [bookId, idx, title, html, thought, isPaid ? 1 : 0, price, mysqlDt(createdAt), mysqlDt(createdAt)],
    );
    chapterIds.push(c.insertId);
    chapterMeta.push({ id: c.insertId, idx, isPaid, price, wordCount });
  }

  for (const tag of book.shelves) {
    // eslint-disable-next-line no-await-in-loop
    await pool.execute('INSERT IGNORE INTO book_tags (book_id, tag) VALUES (?, ?)', [bookId, tag]);
  }
  for (const slug of book.contentTags || []) {
    const tagId = ids.contentTag[slug];
    if (tagId) await pool.execute('INSERT IGNORE INTO book_content_tags (book_id, tag_id) VALUES (?, ?)', [bookId, tagId]); // eslint-disable-line no-await-in-loop
  }
  return { bookId, chapters: chapterMeta };
}

function fillText(text, book) {
  return text.replace(/\{title\}/g, book.title).replace(/\{hero\}/g, book.world.hero);
}

async function main() {
  const removed = await wipe();
  console.log(`> Removed ${removed} previous showcase account(s)`);
  if (WIPE_ONLY) return;

  if (!fs.existsSync(ASSET_DIR) || !fs.readdirSync(ASSET_DIR).length) {
    console.warn('> No generated assets found in client/public/stitch/seed — covers and avatars will be blank.');
  }

  const ids = await catalogIds();
  const passwordHash = await hashPassword(data.DEMO_PASSWORD);

  // ── users ────────────────────────────────────────────────────────────────
  const authorIds = {};
  for (let i = 0; i < data.AUTHORS.length; i += 1) {
    const a = data.AUTHORS[i];
    authorIds[a.key] = await insertUser(a, { role: 'author', passwordHash, index: i }); // eslint-disable-line no-await-in-loop
  }
  const readerIds = {};
  for (let i = 0; i < data.READERS.length; i += 1) {
    const r = data.READERS[i];
    readerIds[r.key] = await insertUser(r, { role: 'user', passwordHash, index: i + 8 }); // eslint-disable-line no-await-in-loop
  }
  const allUserIds = [...Object.values(authorIds), ...Object.values(readerIds)];
  console.log(`> Inserted ${data.AUTHORS.length} authors and ${data.READERS.length} readers`);

  // ── books + chapters ─────────────────────────────────────────────────────
  const books = [];
  for (const book of data.BOOKS) {
    const inserted = await insertBook(book, authorIds[book.author], ids); // eslint-disable-line no-await-in-loop
    books.push({ def: book, ...inserted });
    console.log(`  · ${book.title} — ${inserted.chapters.length} chapters (${inserted.chapters.reduce((s, c) => s + c.wordCount, 0).toLocaleString()} words)`);
  }

  // ── follows ──────────────────────────────────────────────────────────────
  const authorList = Object.values(authorIds);
  const readerList = Object.values(readerIds);
  let followCount = 0;
  const follow = async (a, b, daysBack) => {
    if (a === b) return;
    const [r] = await pool.execute(
      'INSERT IGNORE INTO user_follows (follower_id, followee_id, created_at) VALUES (?, ?, ?)',
      [a, b, mysqlDt(daysAgo(daysBack))],
    );
    followCount += r.affectedRows;
  };
  for (const readerId of readerList) {
    for (const authorId of sample(authorList, rint(2, 5))) await follow(readerId, authorId, rint(1, 200)); // eslint-disable-line no-await-in-loop
    for (const other of sample(readerList.filter((x) => x !== readerId), rint(0, 3))) await follow(readerId, other, rint(1, 150)); // eslint-disable-line no-await-in-loop
  }
  for (const authorId of authorList) {
    for (const other of sample(authorList.filter((x) => x !== authorId), rint(1, 3))) await follow(authorId, other, rint(10, 300)); // eslint-disable-line no-await-in-loop
    for (const readerId of sample(readerList, rint(0, 2))) await follow(authorId, readerId, rint(1, 100)); // eslint-disable-line no-await-in-loop
  }
  // The most popular authors get extra followers from the existing seed readers.
  for (const existing of [3, 4, 5]) {
    for (const key of ['priya', 'rowan', 'mira']) await follow(existing, authorIds[key], rint(5, 60)); // eslint-disable-line no-await-in-loop
  }
  console.log(`> Created ${followCount} follow relationships`);

  // ── reviews, comments, reactions ─────────────────────────────────────────
  let reviewCount = 0;
  let commentCount = 0;
  for (const { def, bookId, chapters } of books) {
    const reviewers = sample(readerList, rint(3, 7));
    const ratings = [];
    for (const readerId of reviewers) {
      const base = def.views > 40000 ? 4 : 3;
      const r = {
        writingQuality: Math.min(5, base + rint(0, 1)),
        stabilityOfUpdates: Math.min(5, base + rint(-1, 1)),
        storyDevelopment: Math.min(5, base + rint(0, 1)),
        characterDesign: Math.min(5, base + rint(-1, 1)),
        worldBackground: Math.min(5, base + rint(0, 1)),
      };
      for (const k of Object.keys(r)) r[k] = Math.max(1, r[k]);
      ratings.push(r);
      // eslint-disable-next-line no-await-in-loop
      const [c] = await pool.execute(
        `INSERT INTO comments (book_id, chapter_id, user_id, parent_id, body, is_spoiler, review_ratings, status, created_at)
         VALUES (?, NULL, ?, NULL, ?, 0, ?, 'visible', ?)`,
        [bookId, readerId, fillText(pick(rng, data.REVIEW_BODIES), def), JSON.stringify(r), mysqlDt(daysAgo(rint(1, 90)))],
      );
      reviewCount += 1;
      for (const liker of sample(readerList.filter((x) => x !== readerId), rint(0, 4))) {
        // eslint-disable-next-line no-await-in-loop
        await pool.execute("INSERT IGNORE INTO comment_reactions (comment_id, user_id, reaction) VALUES (?, ?, 'like')", [c.insertId, liker]);
      }
    }
    const avg = ratings.reduce((s, r) => s + (r.writingQuality + r.stabilityOfUpdates + r.storyDevelopment + r.characterDesign + r.worldBackground) / 5, 0) / ratings.length;
    await pool.execute('UPDATE books SET score = ? WHERE id = ?', [Math.round(avg * 10) / 10, bookId]); // eslint-disable-line no-await-in-loop

    for (const ch of chapters) {
      if (!chance(0.35)) continue;
      const commenters = sample(readerList, rint(1, 3));
      for (const readerId of commenters) {
        // eslint-disable-next-line no-await-in-loop
        const [c] = await pool.execute(
          `INSERT INTO comments (book_id, chapter_id, user_id, parent_id, body, is_spoiler, status, created_at)
           VALUES (?, ?, ?, NULL, ?, ?, 'visible', ?)`,
          [bookId, ch.id, readerId, fillText(pick(rng, data.CHAPTER_COMMENTS), def), chance(0.1) ? 1 : 0, mysqlDt(daysAgo(rint(0, 40)))],
        );
        commentCount += 1;
        if (chance(0.4)) {
          const replier = chance(0.4) ? authorIds[def.author] : pick(rng, readerList.filter((x) => x !== readerId));
          // eslint-disable-next-line no-await-in-loop
          await pool.execute(
            `INSERT INTO comments (book_id, chapter_id, user_id, parent_id, body, is_spoiler, status, created_at)
             VALUES (?, ?, ?, ?, ?, 0, 'visible', ?)`,
            [bookId, ch.id, replier, c.insertId, pick(rng, data.COMMENT_REPLIES), mysqlDt(daysAgo(rint(0, 30)))],
          );
          commentCount += 1;
        }
        for (const liker of sample(readerList.filter((x) => x !== readerId), rint(0, 3))) {
          // eslint-disable-next-line no-await-in-loop
          await pool.execute("INSERT IGNORE INTO comment_reactions (comment_id, user_id, reaction) VALUES (?, ?, 'like')", [c.insertId, liker]);
        }
      }
    }
  }
  console.log(`> Wrote ${reviewCount} reviews and ${commentCount} chapter comments`);

  // ── reading activity: library, progress, collections, unlocks, coin orders ─
  let unlockCount = 0;
  const readerDefs = data.READERS;
  for (let i = 0; i < readerDefs.length; i += 1) {
    const readerId = readerIds[readerDefs[i].key];
    const picks = sample(books, rint(4, 8));
    const statuses = ['active', 'active', 'active', 'on_hold', 'archive', 'dropped'];
    for (let j = 0; j < picks.length; j += 1) {
      const { bookId, chapters } = picks[j];
      // eslint-disable-next-line no-await-in-loop
      await pool.execute(
        'INSERT IGNORE INTO library (user_id, book_id, added_at, reading_status) VALUES (?, ?, ?, ?)',
        [readerId, bookId, mysqlDt(daysAgo(rint(1, 120))), pick(rng, statuses)],
      );
      const finished = chance(0.3);
      const upto = finished ? chapters.length : rint(1, chapters.length);
      for (let k = 0; k < upto; k += 1) {
        const ch = chapters[k];
        const isCurrent = k === upto - 1;
        const percent = finished || !isCurrent ? 100 : rint(10, 90);
        // eslint-disable-next-line no-await-in-loop
        await pool.execute(
          'INSERT INTO reader_progress (user_id, chapter_id, book_id, percent, position, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE percent = VALUES(percent)',
          [readerId, ch.id, bookId, percent, rint(0, 4000), mysqlDt(daysAgo(isCurrent ? rint(0, 6) : rint(3, 60)))],
        );
        if (ch.isPaid) {
          // eslint-disable-next-line no-await-in-loop
          const [u] = await pool.execute(
            'INSERT IGNORE INTO chapter_unlocks (user_id, chapter_id, tokens_spent, unlocked_at) VALUES (?, ?, ?, ?)',
            [readerId, ch.id, ch.price, mysqlDt(daysAgo(rint(0, 45)))],
          );
          if (u.affectedRows) {
            unlockCount += 1;
            // eslint-disable-next-line no-await-in-loop
            await pool.execute(
              `INSERT INTO transactions (user_id, type, tokens_delta, ref_chapter_id, meta, created_at)
               VALUES (?, 'unlock', ?, ?, JSON_OBJECT('chapterId', ?, 'bookId', ?, 'seed', true), ?)`,
              [readerId, -ch.price, ch.id, ch.id, bookId, mysqlDt(daysAgo(rint(0, 45)))],
            );
          }
        }
      }
    }
    // A real coin purchase (order + tax + reconciliation) so finance screens have data.
    const packs = ['pack_249', 'pack_499', 'pack_999'];
    const packKey = pick(rng, packs);
    const packDef = finance.getPack(packKey);
    // eslint-disable-next-line no-await-in-loop
    await withTransaction(async (conn) => {
      const order = await finance.createSuccessfulOrder(conn, {
        userId: readerId, packKey, productName: packDef.name, unitPrice: packDef.price,
        coinsAdded: packDef.tokens, bonusCoins: packDef.bonus, remarks: 'Showcase seed purchase',
      });
      await conn.execute(
        `INSERT INTO transactions (user_id, type, tokens_delta, payment_order_id, meta, created_at)
         VALUES (?, 'purchase', ?, ?, JSON_OBJECT('pack', ?, 'invoiceNo', ?, 'seed', true), ?)`,
        [readerId, packDef.tokens + packDef.bonus, order.orderId, packKey, order.invoiceNo, mysqlDt(daysAgo(rint(10, 80)))],
      );
    });

    const cols = sample(data.COLLECTIONS, rint(1, 2));
    for (const col of cols) {
      // eslint-disable-next-line no-await-in-loop
      const [c] = await pool.execute(
        'INSERT INTO user_collections (user_id, name, visibility) VALUES (?, ?, ?)',
        [readerId, col.name, col.visibility],
      );
      for (const b of sample(picks, rint(2, Math.min(4, picks.length)))) {
        // eslint-disable-next-line no-await-in-loop
        await pool.execute('INSERT IGNORE INTO collection_books (collection_id, book_id) VALUES (?, ?)', [c.insertId, b.bookId]);
      }
    }
  }
  console.log(`> Recorded reading progress, ${unlockCount} chapter unlocks and coin orders`);

  // Authors read each other too, so their profiles are not empty.
  for (const authorId of authorList) {
    for (const { bookId, chapters } of sample(books.filter((b) => authorIds[b.def.author] !== authorId), rint(2, 4))) {
      // eslint-disable-next-line no-await-in-loop
      await pool.execute('INSERT IGNORE INTO library (user_id, book_id, added_at) VALUES (?, ?, ?)', [authorId, bookId, mysqlDt(daysAgo(rint(1, 90)))]);
      for (const ch of chapters.slice(0, rint(1, 3))) {
        // eslint-disable-next-line no-await-in-loop
        await pool.execute(
          'INSERT IGNORE INTO reader_progress (user_id, chapter_id, book_id, percent, position, updated_at) VALUES (?, ?, ?, 100, 0, ?)',
          [authorId, ch.id, bookId, mysqlDt(daysAgo(rint(1, 60)))],
        );
      }
    }
  }

  // ── badges, notifications ────────────────────────────────────────────────
  let badgeCount = 0;
  for (const userId of allUserIds) {
    // eslint-disable-next-line no-await-in-loop
    const earned = await profileService.syncAchievements(userId);
    badgeCount += earned.length;
    // Seeded badge grants should not flood the bell.
    // eslint-disable-next-line no-await-in-loop
    await pool.execute("DELETE FROM user_notifications WHERE user_id = ? AND type = 'badge'", [userId]);
  }
  for (const key of ['amara', 'chloe', 'grace']) {
    for (const code of ['event_anniversary', 'night_owl']) {
      // eslint-disable-next-line no-await-in-loop
      const got = await profileService.tryGrantAchievement(readerIds[key], code);
      if (got) badgeCount += 1;
    }
  }
  await pool.execute("DELETE FROM user_notifications WHERE user_id IN (?) AND type = 'badge'", [allUserIds]).catch(() => {});
  for (const key of ['priya', 'mira', 'theo']) {
    const authorId = authorIds[key];
    // eslint-disable-next-line no-await-in-loop
    const [followers] = await pool.execute(
      `SELECT u.display_name FROM user_follows f JOIN users u ON u.id = f.follower_id
        WHERE f.followee_id = ? ORDER BY f.created_at DESC LIMIT 3`,
      [authorId],
    );
    for (const f of followers) {
      // eslint-disable-next-line no-await-in-loop
      await notifications.notify(authorId, { type: 'follow', title: `${f.display_name} started following you`, linkUrl: `/users/${authorId}` });
    }
  }
  for (const { def, bookId, chapters } of books.filter((b) => b.def.shelves.includes('cheering_reads'))) {
    const last = chapters[chapters.length - 1];
    // eslint-disable-next-line no-await-in-loop
    const [followers] = await pool.execute('SELECT follower_id FROM user_follows WHERE followee_id = ?', [authorIds[def.author]]);
    // eslint-disable-next-line no-await-in-loop
    await notifications.notifyMany(followers.map((f) => f.follower_id), {
      type: 'chapter',
      title: `${data.AUTHORS.find((a) => a.key === def.author).displayName} published Chapter ${last.idx} of ${def.title}`,
      body: def.arc[last.idx - 1][0],
      linkUrl: `/read/${last.id}`,
    });
    void bookId;
  }
  console.log(`> Granted ${badgeCount} badges and wrote follow / chapter notifications`);

  const allOn = Object.fromEntries(pageSectionsSvc.KEYS.map((key) => [key, true]));
  await pageSectionsSvc.updatePageSections(allOn);

  console.log('\nShowcase ready.');
  console.log(`Sign in as any seeded account with password "${data.DEMO_PASSWORD}":`);
  for (const a of data.AUTHORS) console.log(`  author  ${a.key}@${data.DEMO_DOMAIN}  (${a.displayName})`);
  for (const r of data.READERS) console.log(`  reader  ${r.key}@${data.DEMO_DOMAIN}  (${r.displayName})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
