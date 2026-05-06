'use strict';

// Imports server/webnovel-books.json into MySQL.
//
//   1. Wipes all dependent rows for books (chapters, comments, transactions,
//      chapter_unlocks, library, reader_progress) plus book_tags and books
//      themselves. The 5 hand-seeded users in seed.sql are kept.
//   2. For every book in every section of the JSON, inserts a single row in
//      `books` keyed by external_book_id (so duplicates across sections only
//      create one row), then a row per section in `book_tags`.
//   3. Author for every imported book is Eleanor Vance (users.id = 2).
//
// Run with:  npm run db:import:webnovel

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const slugify = require('slugify');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const ELEANOR_ID = 2;
const DEMO_READER_ID = 3;
const SECTION_TAGS = [
  'weekly_featured',
  'potential_starlet',
  'rising_fictions',
  'cheering_reads',
  'new_arrivals',
  'editors_choice',
  'completed_novel',
];

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function dummyChapterHtml({ title, chapterTitle, category, idx }) {
  const t = escapeHtml(title);
  const ct = escapeHtml(chapterTitle);
  const cat = escapeHtml(category || 'Novel');
  return [
    `<p><em>${t}</em> — ${cat}</p>`,
    `<p><strong>${ct}</strong></p>`,
    `<p>This is a demo chapter used to showcase Novel Centre features: a Table of Contents, free vs paid chapters, token unlocks, and the reading interface.</p>`,
    `<p>Chapter ${idx} contains placeholder prose inspired by the book’s metadata. Replace this content when real chapters are available.</p>`,
    `<blockquote>“Stories don’t start when you open the first page — they start when you decide to keep going.”</blockquote>`,
    `<p>Continue reading to see how locked chapters behave and how unlocks reflect in the UI.</p>`,
  ].join('');
}

function parseScore(raw) {
  if (raw === null || raw === undefined) return null;
  const n = typeof raw === 'string' ? Number.parseFloat(raw) : Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.min(5, Math.max(0, Number(n.toFixed(2)))) : null;
}

function fallbackScore(idx) {
  // Matches the deterministic dummy formula used in
  // client/components/home/RankingNovelsSection.jsx so first-render parity
  // with the previous static UI is preserved.
  const v = ((idx + 1) * 37) % 8;
  return Number((4.2 + v * 0.1).toFixed(2));
}

function uniqueSlugFactory() {
  const seen = new Set();
  return function uniqueSlug(title) {
    const root = (slugify(String(title || ''), { lower: true, strict: true }) || 'book').slice(0, 200);
    let candidate = root;
    let i = 0;
    while (seen.has(candidate)) {
      i += 1;
      candidate = `${root}-${i.toString(36)}${Math.random().toString(36).slice(2, 5)}`;
      if (i > 50) {
        candidate = `${root}-${Date.now().toString(36)}`;
        break;
      }
    }
    seen.add(candidate);
    return candidate;
  };
}

async function wipe(conn) {
  // Order matters: child tables first, books last.
  const stmts = [
    'DELETE FROM reader_progress',
    'DELETE FROM library',
    'DELETE FROM chapter_unlocks',
    'DELETE FROM transactions',
    'DELETE FROM comments',
    'DELETE FROM chapters',
    'DELETE FROM book_tags',
    'DELETE FROM books',
    'ALTER TABLE books AUTO_INCREMENT = 1',
    'ALTER TABLE chapters AUTO_INCREMENT = 1',
    'ALTER TABLE transactions AUTO_INCREMENT = 1',
    'ALTER TABLE comments AUTO_INCREMENT = 1',
  ];
  for (const sql of stmts) {
    await conn.query(sql);
  }
}

async function insertDummyChapters(conn, bookId, { title, category }) {
  // 4 chapters: 2 free, 2 paid.
  const chapters = [
    { idx: 1, title: 'The Arrival',       isPaid: 0, tokenPrice: 0 },
    { idx: 2, title: 'A Quiet Promise',   isPaid: 0, tokenPrice: 0 },
    { idx: 3, title: 'The Keeper’s Toll', isPaid: 1, tokenPrice: 20 },
    { idx: 4, title: 'Beyond the Gate',   isPaid: 1, tokenPrice: 25 },
  ];

  const createdIds = [];
  for (const ch of chapters) {
    const html = dummyChapterHtml({
      title,
      chapterTitle: ch.title,
      category,
      idx: ch.idx,
    });
    const [r] = await conn.execute(
      `INSERT INTO chapters (book_id, idx, title, content_html, is_paid, token_price, status)
       VALUES (?, ?, ?, ?, ?, ?, 'published')`,
      [bookId, ch.idx, ch.title, html, ch.isPaid, ch.tokenPrice],
    );
    createdIds.push(r.insertId);
  }
  return createdIds;
}

async function main() {
  const jsonPath = path.resolve(__dirname, '..', 'webnovel-books.json');
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Source JSON not found: ${jsonPath}`);
  }
  const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  const cfg = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'novel_center',
    multipleStatements: false,
  };
  console.log(
    `> Connecting to mysql://${cfg.user}@${cfg.host}:${cfg.port}/${cfg.database}`,
  );
  const conn = await mysql.createConnection(cfg);

  try {
    console.log('> Wiping existing books and dependants...');
    await wipe(conn);

    // Group all sections of the JSON into:
    //   externalId -> { book: <first occurrence>, tags: Set<sectionKey> }
    // so duplicates across sections only insert one books row.
    const bySource = new Map();
    let perSectionCount = {};

    for (const tag of SECTION_TAGS) {
      const list = Array.isArray(raw[tag]) ? raw[tag] : [];
      perSectionCount[tag] = list.length;
      list.forEach((b) => {
        const ext = b.book_id || (b.link || '').split('/').pop() || `${tag}-${b.title}`;
        if (!bySource.has(ext)) bySource.set(ext, { book: b, tags: new Set() });
        bySource.get(ext).tags.add(tag);
      });
    }

    const uniqueSlug = uniqueSlugFactory();
    let booksInserted = 0;
    let tagsInserted = 0;
    let runningIdx = 0;

    for (const [ext, { book, tags }] of bySource.entries()) {
      const title = String(book.title || 'Untitled').slice(0, 220);
      const slug = uniqueSlug(title).slice(0, 220);
      const synopsis = (book.short_description && String(book.short_description).trim()) || null;
      const coverUrl = book.cover_image || null;
      const category = (book.category && String(book.category).slice(0, 80)) || null;
      const score = parseScore(book.score) ?? fallbackScore(runningIdx);
      const chapterNum = Number.isFinite(Number(book.chapter_num)) ? Number(book.chapter_num) : 0;
      const externalLink = book.link || null;

      const [res] = await conn.execute(
        `INSERT INTO books
           (slug, author_id, title, synopsis, cover_url, category, language, status,
            score, chapter_num, external_book_id, external_link)
         VALUES (?, ?, ?, ?, ?, ?, 'en', 'published', ?, ?, ?, ?)`,
        [
          slug,
          ELEANOR_ID,
          title,
          synopsis,
          coverUrl,
          category,
          score,
          chapterNum,
          String(ext).slice(0, 64) || null,
          externalLink,
        ],
      );
      const bookId = res.insertId;
      booksInserted += 1;
      runningIdx += 1;

      // Create dummy chapters so the reader UI has real data.
      const chapterIds = await insertDummyChapters(conn, bookId, { title, category });
      // Pre-unlock the first paid chapter (chapter idx 3) for the demo reader.
      const paidToUnlock = chapterIds[2];
      if (paidToUnlock) {
        await conn.execute(
          'INSERT INTO chapter_unlocks (user_id, chapter_id, tokens_spent) VALUES (?, ?, ?)',
          [DEMO_READER_ID, paidToUnlock, 20],
        );
      }

      for (const tag of tags) {
        await conn.execute(
          'INSERT INTO book_tags (book_id, tag) VALUES (?, ?)',
          [bookId, tag],
        );
        tagsInserted += 1;
      }
    }

    console.log(`> Inserted ${booksInserted} books, ${tagsInserted} tags`);
    for (const tag of SECTION_TAGS) {
      const [rows] = await conn.execute(
        'SELECT COUNT(*) AS n FROM book_tags WHERE tag = ?',
        [tag],
      );
      console.log(`  • ${tag.padEnd(20)} ${String(rows[0].n).padStart(4)}  (json: ${perSectionCount[tag]})`);
    }
    console.log('> Done.');
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
