'use strict';

// Imports WebNovel JSON into MySQL using the shared home-rail mapper + balancer.
//
//   • Default input: server/webnovel-books.json
//   • Wipes books + dependents (keeps users). Author = Eleanor (id 2).
//   • Maps normalize / scrape / internal JSON → the seven `book_tags` used by /api/v1/home.
//
// Prefer the orchestrated script (same engine + flags):
//   npm run db:seed:webnovel
//
// This file remains as:  npm run db:import:webnovel

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

async function main() {
  const jsonPath = path.resolve(__dirname, '..', 'webnovel-books.json');
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Source JSON not found: ${jsonPath}`);
  }
  const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  let bySource = buildBySourceFromAnyJson(raw);
  enrichMinimumTags(bySource, 12);

  const cfg = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'novel_center',
    multipleStatements: false,
  };
  console.log(`> Connecting to mysql://${cfg.user}@${cfg.host}:${cfg.port}/${cfg.database}`);
  const conn = await mysql.createConnection(cfg);

  try {
    console.log('> Wiping existing books and dependants...');
    await wipeBooksSubtree(conn);

    const { booksInserted, tagsInserted } = await insertFromBySource(conn, bySource);
    console.log(`> Inserted ${booksInserted} books, ${tagsInserted} tags`);
    for (const tag of INTERNAL_HOME_TAGS) {
      const [rows] = await conn.execute('SELECT COUNT(*) AS n FROM book_tags WHERE tag = ?', [tag]);
      console.log(`  • ${tag.padEnd(22)} ${String(rows[0].n).padStart(4)}`);
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
