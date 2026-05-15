'use strict';

const slugify = require('slugify');

const ELEANOR_ID = 2;
const DEMO_READER_ID = 3;

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

async function safeQuery(conn, sql) {
  try {
    await conn.query(sql);
  } catch (e) {
    if (e && e.code === 'ER_NO_SUCH_TABLE') return;
    throw e;
  }
}

async function wipeBooksSubtree(conn) {
  const stmts = [
    'DELETE FROM reader_progress',
    'DELETE FROM library',
    'DELETE FROM chapter_unlocks',
    'DELETE FROM transactions',
    'DELETE FROM comments',
    'DELETE FROM chapters',
    'DELETE FROM book_content_tags',
    'DELETE FROM book_tags',
    'DELETE FROM books',
    'ALTER TABLE books AUTO_INCREMENT = 1',
    'ALTER TABLE chapters AUTO_INCREMENT = 1',
    'ALTER TABLE transactions AUTO_INCREMENT = 1',
    'ALTER TABLE comments AUTO_INCREMENT = 1',
  ];
  for (const sql of stmts) {
    if (sql.includes('book_content_tags')) await safeQuery(conn, sql);
    else await conn.query(sql);
  }
}

async function insertDummyChapters(conn, bookId, { title, category }) {
  const chapters = [
    { idx: 1, title: 'The Arrival', isPaid: 0, tokenPrice: 0 },
    { idx: 2, title: 'A Quiet Promise', isPaid: 0, tokenPrice: 0 },
    { idx: 3, title: 'The Keeper’s Toll', isPaid: 1, tokenPrice: 20 },
    { idx: 4, title: 'Beyond the Gate', isPaid: 1, tokenPrice: 25 },
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

async function upsertHomePageSectionsVisible(conn) {
  await safeQuery(
    conn,
    `INSERT INTO site_home_page_config (id, weekly_book, meet_webnovel, recommended, new_arrivals, ranking_novels, updated_today, completed_novels, editors_choice, gs_originals)
     VALUES (1, 1, 1, 1, 1, 1, 1, 1, 1, 1)
     ON DUPLICATE KEY UPDATE
       weekly_book = VALUES(weekly_book),
       meet_webnovel = VALUES(meet_webnovel),
       recommended = VALUES(recommended),
       new_arrivals = VALUES(new_arrivals),
       ranking_novels = VALUES(ranking_novels),
       updated_today = VALUES(updated_today),
       completed_novels = VALUES(completed_novels),
       editors_choice = VALUES(editors_choice),
       gs_originals = VALUES(gs_originals)`,
  );
}

/**
 * @param {import('mysql2/promise').Connection} conn
 * @param {Map<string, { book: object, tags: Set<string> }>} bySource
 */
async function insertFromBySource(conn, bySource) {
  const uniqueSlug = uniqueSlugFactory();
  let booksInserted = 0;
  let tagsInserted = 0;
  let runningIdx = 0;

  for (const [extKey, { book, tags }] of bySource.entries()) {
    const title = String(book.title || 'Untitled').slice(0, 220);
    const slug = uniqueSlug(title).slice(0, 220);
    const synopsis = (book.short_description && String(book.short_description).trim()) || null;
    const coverUrl = book.cover_image || null;
    const category = (book.category && String(book.category).slice(0, 80)) || null;
    const score = parseScore(book.score) ?? fallbackScore(runningIdx);
    const chapterNum = Number.isFinite(Number(book.chapter_num)) ? Number(book.chapter_num) : 0;
    const externalLink = book.link || null;
    const extId = String(extKey || '').slice(0, 64) || null;

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
        extId,
        externalLink,
      ],
    );
    const bookId = res.insertId;
    booksInserted += 1;
    runningIdx += 1;

    const chapterIds = await insertDummyChapters(conn, bookId, { title, category });
    const paidToUnlock = chapterIds[2];
    if (paidToUnlock) {
      await conn.execute(
        'INSERT INTO chapter_unlocks (user_id, chapter_id, tokens_spent) VALUES (?, ?, ?)',
        [DEMO_READER_ID, paidToUnlock, 20],
      );
    }

    for (const tag of tags) {
      await conn.execute('INSERT INTO book_tags (book_id, tag) VALUES (?, ?)', [bookId, tag]);
      tagsInserted += 1;
    }
  }

  await upsertHomePageSectionsVisible(conn);

  return { booksInserted, tagsInserted };
}

module.exports = {
  wipeBooksSubtree,
  insertFromBySource,
  insertDummyChapters,
  ELEANOR_ID,
  DEMO_READER_ID,
};
