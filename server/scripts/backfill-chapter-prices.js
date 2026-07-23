'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const pool = require('../src/db/pool');
const { htmlToWordCount } = require('../src/services/reading.service');
const { computeTokenPrice } = require('../src/services/chapterPricing.service');

async function main() {
  const [rows] = await pool.execute(
    `SELECT id, content_html, is_paid FROM chapters WHERE recycled_at IS NULL`,
  );
  let updated = 0;
  for (const row of rows) {
    const isPaid = !!row.is_paid;
    const wordCount = htmlToWordCount(row.content_html);
    const tokenPrice = isPaid ? computeTokenPrice(wordCount) : 0;
    await pool.execute('UPDATE chapters SET token_price = ? WHERE id = ?', [tokenPrice, row.id]);
    updated += 1;
  }
  console.log(`Updated token_price for ${updated} chapters.`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
