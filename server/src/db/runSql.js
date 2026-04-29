'use strict';

// Lightweight SQL file runner for migrations / seeds.
// Runs statements one at a time so we don't depend on the multi-statement flag,
// and so JSON values containing semicolons are not split (we split only on
// terminator semicolons that end a line).

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

function splitStatements(sql) {
  const cleaned = sql.replace(/^\s*--.*$/gm, '');
  const parts = [];
  let buf = '';
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    const prev = cleaned[i - 1];

    if (ch === "'" && prev !== '\\' && !inDouble && !inBacktick) inSingle = !inSingle;
    else if (ch === '"' && prev !== '\\' && !inSingle && !inBacktick) inDouble = !inDouble;
    else if (ch === '`' && !inSingle && !inDouble) inBacktick = !inBacktick;

    if (ch === ';' && !inSingle && !inDouble && !inBacktick) {
      const stmt = buf.trim();
      if (stmt.length > 0) parts.push(stmt);
      buf = '';
    } else {
      buf += ch;
    }
  }
  const tail = buf.trim();
  if (tail.length > 0) parts.push(tail);
  return parts;
}

async function main() {
  const fileArg = process.argv[2];
  if (!fileArg) {
    console.error('Usage: node src/db/runSql.js <path-to-sql>');
    process.exit(1);
  }

  const filePath = path.resolve(process.cwd(), fileArg);
  if (!fs.existsSync(filePath)) {
    console.error(`SQL file not found: ${filePath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(filePath, 'utf8');
  const statements = splitStatements(sql);

  const cfg = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'novel_center',
    multipleStatements: false,
  };
  console.log(
    `> Connecting to mysql://${cfg.user}@${cfg.host}:${cfg.port}/${cfg.database} ` +
      `(password length: ${cfg.password.length})`,
  );
  const conn = await mysql.createConnection(cfg);

  console.log(`> Running ${statements.length} statement(s) from ${path.basename(filePath)}`);
  try {
    for (const stmt of statements) {
      await conn.query(stmt);
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
