'use strict';

/**
 * Best-effort backfill: create payment_orders for legacy purchase transactions
 * that are not yet linked.
 *
 *   node scripts/backfill-finance-orders.js
 */

const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const finance = require('../src/services/finance.service');

async function main() {
  const cfg = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'novel_center',
  };
  const conn = await mysql.createConnection(cfg);
  try {
    const [rows] = await conn.execute(
      `SELECT id, user_id, tokens_delta, meta, created_at
         FROM transactions
        WHERE type = 'purchase' AND payment_order_id IS NULL
        ORDER BY id ASC`,
    );
    console.log(`> Found ${rows.length} legacy purchase(s) to backfill`);
    let n = 0;
    for (const row of rows) {
      let meta = row.meta;
      if (typeof meta === 'string') {
        try { meta = JSON.parse(meta); } catch (_e) { meta = {}; }
      }
      meta = meta || {};
      const packKey = meta.pack || 'custom';
      const pack = finance.PACKS[packKey];
      const tokens = Number(row.tokens_delta) || (pack ? pack.tokens : 100);
      const price = pack ? pack.price : tokens;
      const name = pack ? pack.name : `${tokens} Coin Pack`;

      await conn.beginTransaction();
      try {
        const order = await finance.createSuccessfulOrder(conn, {
          userId: row.user_id,
          packKey,
          productName: name,
          unitPrice: price,
          coinsAdded: tokens,
          bonusCoins: 0,
          paymentMethod: 'mock',
          gateway: 'mock',
          platform: 'web',
          createdBy: 'backfill',
          remarks: `Backfilled from transaction ${row.id}`,
        });
        await conn.execute(
          'UPDATE transactions SET payment_order_id = ? WHERE id = ?',
          [order.orderId, row.id],
        );
        await conn.execute(
          'UPDATE payment_orders SET created_at = ?, updated_at = ? WHERE id = ?',
          [row.created_at, row.created_at, order.orderId],
        );
        await conn.commit();
        n += 1;
      } catch (e) {
        await conn.rollback();
        console.error(`  ! failed txn ${row.id}:`, e.message);
      }
    }
    console.log(`> Backfilled ${n} order(s)`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
