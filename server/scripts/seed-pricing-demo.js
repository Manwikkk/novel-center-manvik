'use strict';

/**
 * Creates a demo book with chapters at each word-count pricing tier.
 * Also fixes Eleanor Vance avatar path and tops up test reader wallet.
 *
 *   npm run db:seed:pricing-demo
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const pool = require('../src/db/pool');
const { pricingFromContent, htmlToWordCount } = require('../src/services/chapterPricing.service');

const DEMO_SLUG = 'pricing-demo-word-count';
const DEMO_TITLE = 'Pricing Demo — Word Count Tiers';
const AUTHOR_ID = 2; // Eleanor Vance
const READER_EMAIL = 'reader@novelcenter.io';
const READER_TOPUP = 500;

function wordsParagraph(wordCount) {
  const words = [];
  for (let i = 1; i <= wordCount; i += 1) {
    words.push(`demoword${i}`);
  }
  return `<p>${words.join(' ')}</p>`;
}

function buildChapterHtml(intro, wordCount) {
  const introWords = htmlToWordCount(intro);
  const bodyWords = Math.max(0, wordCount - introWords);
  return `${intro}${wordsParagraph(bodyWords)}`;
}

const CHAPTER_SPECS = [
  {
    idx: 1,
    title: 'Demo — Free chapter (under 800 words)',
    targetWords: 500,
    isPaid: false,
    blurb: 'Free to read. Paid chapters below show auto pricing from word count.',
  },
  {
    idx: 2,
    title: 'Demo — 8 coins (800–999 words)',
    targetWords: 850,
    isPaid: true,
    blurb: 'Expect 8 coins to unlock.',
  },
  {
    idx: 3,
    title: 'Demo — 10 coins (1000–1200 words)',
    targetWords: 1100,
    isPaid: true,
    blurb: 'Expect 10 coins to unlock.',
  },
  {
    idx: 4,
    title: 'Demo — 15 coins (1201–1800 words)',
    targetWords: 1500,
    isPaid: true,
    blurb: 'Expect 15 coins to unlock.',
  },
  {
    idx: 5,
    title: 'Demo — 20 coins (1801–2400 words)',
    targetWords: 2000,
    isPaid: true,
    blurb: 'Expect 20 coins to unlock.',
  },
  {
    idx: 6,
    title: 'Demo — 25 coins (2401–3000 words)',
    targetWords: 2700,
    isPaid: true,
    blurb: 'Expect 25 coins to unlock.',
  },
  {
    idx: 7,
    title: 'Demo — 30 coins (3001–3600 words)',
    targetWords: 3300,
    isPaid: true,
    blurb: 'Expect 30 coins to unlock.',
  },
  {
    idx: 8,
    title: 'Demo — 35 coins + split warning (3601–4000 words)',
    targetWords: 3800,
    isPaid: true,
    blurb: 'Expect 35 coins. Author UI should show split warning above 3600 words.',
  },
  {
    idx: 9,
    title: 'Demo — 38 coins (4001–4800 words)',
    targetWords: 4500,
    isPaid: true,
    blurb: 'Expect 38 coins to unlock.',
  },
  {
    idx: 10,
    title: 'Demo — 40 coins cap (4801+ words)',
    targetWords: 5000,
    isPaid: true,
    blurb: 'Expect 40 coins (cap) to unlock.',
  },
];

async function ensureAuthorAvatar(conn) {
  await conn.execute(
    `UPDATE users SET avatar_url = ?, bio = COALESCE(NULLIF(bio, ''), ?)
      WHERE id = ?`,
    [
      '/stitch/author-eleanor-vance.jpg',
      'Award-winning author known for her meticulous historical research and evocative prose. Lives in London.',
      AUTHOR_ID,
    ],
  );
}

async function ensureReaderWallet(conn) {
  const [rows] = await conn.execute(
    'SELECT id FROM users WHERE email = ? LIMIT 1',
    [READER_EMAIL],
  );
  if (!rows[0]) {
    console.log(`> Reader ${READER_EMAIL} not found — skip wallet top-up`);
    return null;
  }
  const userId = rows[0].id;
  await conn.execute(
    `INSERT INTO wallets (user_id, balance, purchased_balance, bonus_balance, promo_balance)
     VALUES (?, ?, ?, 0, 0)
     ON DUPLICATE KEY UPDATE
       balance = GREATEST(balance, ?),
       purchased_balance = GREATEST(purchased_balance, ?)`,
    [userId, READER_TOPUP, READER_TOPUP, READER_TOPUP, READER_TOPUP],
  );
  console.log(`> Reader wallet (${READER_EMAIL}) set to at least ${READER_TOPUP} tokens`);
  return userId;
}

async function upsertDemoBook(conn) {
  const [existing] = await conn.execute(
    'SELECT id FROM books WHERE slug = ? LIMIT 1',
    [DEMO_SLUG],
  );
  if (existing[0]) {
    await conn.execute(
      `UPDATE books SET title = ?, synopsis = ?, author_id = ?, status = 'published', recycled_at = NULL
        WHERE id = ?`,
      [
        DEMO_TITLE,
        'Test book for word-count chapter pricing, author avatar, and wallet coin packs. Each paid chapter is labelled with its expected coin price.',
        AUTHOR_ID,
        existing[0].id,
      ],
    );
    return existing[0].id;
  }

  const [r] = await conn.execute(
    `INSERT INTO books (slug, author_id, title, synopsis, cover_url, category, language, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'published')`,
    [
      DEMO_SLUG,
      AUTHOR_ID,
      DEMO_TITLE,
      'Test book for word-count chapter pricing, author avatar, and wallet coin packs. Each paid chapter is labelled with its expected coin price.',
      '/images/Novel_Center_Logo.png',
      'Demo',
      'en',
    ],
  );
  return r.insertId;
}

async function replaceDemoChapters(conn, bookId) {
  const [chIds] = await conn.execute('SELECT id FROM chapters WHERE book_id = ?', [bookId]);
  if (chIds.length) {
    const ids = chIds.map((r) => r.id);
    await conn.execute(
      `DELETE FROM chapter_unlocks WHERE chapter_id IN (${ids.map(() => '?').join(',')})`,
      ids,
    );
  }
  await conn.execute('DELETE FROM chapters WHERE book_id = ?', [bookId]);

  for (const spec of CHAPTER_SPECS) {
    const intro = `<p><strong>${spec.title}</strong> — ${spec.blurb}</p>`;
    let html = buildChapterHtml(intro, spec.targetWords);
    let { wordCount, tokenPrice } = pricingFromContent(spec.isPaid, html);

    // Nudge word count if rounding drifted
    if (wordCount !== spec.targetWords) {
      const delta = spec.targetWords - wordCount;
      html = buildChapterHtml(intro, spec.targetWords + delta);
      ({ wordCount, tokenPrice } = pricingFromContent(spec.isPaid, html));
    }

    await conn.execute(
      `INSERT INTO chapters (book_id, idx, title, content_html, is_paid, token_price, status)
       VALUES (?, ?, ?, ?, ?, ?, 'published')`,
      [bookId, spec.idx, spec.title, html, spec.isPaid ? 1 : 0, tokenPrice],
    );
    console.log(`  ch ${spec.idx}: ${wordCount} words → ${tokenPrice} coins${spec.isPaid ? '' : ' (free)'}`);
  }
}

async function main() {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await ensureAuthorAvatar(conn);
    await ensureReaderWallet(conn);
    const bookId = await upsertDemoBook(conn);
    console.log(`> Demo book id=${bookId} slug=${DEMO_SLUG}`);
    await replaceDemoChapters(conn, bookId);
    await conn.commit();
    console.log('\n=== How to test ===');
    console.log(`Book URL:  /books/${DEMO_SLUG}`);
    console.log(`Reader:    ${READER_EMAIL} / password: password123 (if seeded)`);
    console.log('Wallet:    /wallet — try ₹99–₹2999 coin packs');
    console.log('Login as reader, open the demo book, unlock paid chapters and check coin prices.');
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
