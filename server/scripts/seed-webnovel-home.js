'use strict';

/**
 * Seed the database from WebNovel-derived JSON only (no hand-authored seed books).
 *
 * Pipeline:
 *   1. Load JSON: default `server/webnovel-books.json`
 *      - Internal keys (weekly_featured, …) as in that file
 *      - OR raw `data.blockItems` API response (auto-detected; same as normalize input)
 *      - OR scrape output (`weekly`, `featured`, `ranking`, …)
 *   2. Map every section → the seven `book_tags` rails used by `/api/v1/home`
 *   3. Cross-tag + balance so Recommended / New Arrivals / Ranking / etc. stay full
 *   4. Wipe existing books + dependents (users kept), insert Eleanor-authored books + chapters
 *
 * Usage:
 *   npm run db:seed:webnovel
 *   npm run db:seed:webnovel -- --input ./webnovel-books.json --min-per-rail 12
 *   npm run db:seed:webnovel -- --input ./webnovel-books.json --min-per-rail 12
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const {
  buildBySourceFromAnyJson,
  enrichMinimumTags,
  INTERNAL_HOME_TAGS,
} = require('./lib/webnovelSeedCore');
const { wipeBooksSubtree, insertFromBySource } = require('./lib/webnovelDbRunner');

function parseArgs(argv) {
  const args = {
    input: path.resolve(__dirname, '..', 'webnovel-books.json'),
    minPerRail: 12,
    dryRun: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--input') {
      args.input = path.resolve(process.cwd(), argv[i + 1] || '');
      i += 1;
    } else if (a === '--min-per-rail') {
      args.minPerRail = Number(argv[i + 1]) || 12;
      i += 1;
    } else if (a === '--dry-run') {
      args.dryRun = true;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(args.input)) {
    throw new Error(`Input not found: ${args.input}`);
  }
  const raw = JSON.parse(fs.readFileSync(args.input, 'utf8'));

  let bySource = buildBySourceFromAnyJson(raw);
  enrichMinimumTags(bySource, args.minPerRail);

  const tagCounts = Object.fromEntries(INTERNAL_HOME_TAGS.map((t) => [t, 0]));
  for (const { tags } of bySource.values()) {
    for (const t of tags) if (Object.prototype.hasOwnProperty.call(tagCounts, t)) tagCounts[t] += 1;
  }

  console.log(`> Parsed ${bySource.size} unique books from ${args.input}`);
  console.log('> Target tag counts (after map + balance):');
  for (const t of INTERNAL_HOME_TAGS) {
    console.log(`    ${t.padEnd(22)} ${String(tagCounts[t]).padStart(3)}`);
  }

  if (args.dryRun) {
    console.log('> Dry run — no database writes.');
    return;
  }

  const cfg = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'novel_center',
    multipleStatements: false,
  };
  console.log(`> mysql://${cfg.user}@${cfg.host}:${cfg.port}/${cfg.database}`);

  const conn = await mysql.createConnection(cfg);
  try {
    console.log('> Wiping books + dependents (users unchanged)…');
    await wipeBooksSubtree(conn);
    const { booksInserted, tagsInserted } = await insertFromBySource(conn, bySource);
    console.log(`> Inserted ${booksInserted} books, ${tagsInserted} book_tags rows`);
    console.log('> Home section visibility reset to ON (site_home_page_config).');
    console.log('> Done.');
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
