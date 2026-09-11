#!/usr/bin/env node
'use strict';

/**
 * Put a published book on every home shelf so the public site is not blank.
 *
 * Usage:
 *   node scripts/seed-home-dummy.js
 *   node scripts/seed-home-dummy.js the-measure-of-time
 */

const pool = require('../src/db/pool');
const { HOME_SHELF_TAGS } = require('../src/constants/homeShelves');
const pageSectionsSvc = require('../src/services/pageSections.service');

const SLUG = String(process.argv[2] || 'the-measure-of-time').trim();

async function main() {
  const [rows] = await pool.execute(
    `SELECT id, slug, title, status, recycled_at, score
       FROM books
      WHERE slug = ? OR (status = 'published' AND recycled_at IS NULL)
      ORDER BY CASE WHEN slug = ? THEN 0 ELSE 1 END, id ASC
      LIMIT 1`,
    [SLUG, SLUG],
  );
  const book = rows[0];
  if (!book) {
    throw new Error('No published book found to place on home shelves');
  }
  if (book.status !== 'published' || book.recycled_at) {
    throw new Error(`Book ${book.slug} is not published`);
  }

  for (const tag of HOME_SHELF_TAGS) {
    await pool.execute(
      'INSERT IGNORE INTO book_tags (book_id, tag) VALUES (?, ?)',
      [book.id, tag],
    );
  }
  if (book.score == null) {
    await pool.execute('UPDATE books SET score = 4.8 WHERE id = ?', [book.id]);
  }

  const allOn = Object.fromEntries(
    pageSectionsSvc.KEYS.map((key) => [key, true]),
  );
  await pageSectionsSvc.updatePageSections(allOn);

  console.log(`Placed "${book.title}" (${book.slug}) on all home sections.`);
}

main()
  .catch((err) => {
    console.error(err.message || err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
