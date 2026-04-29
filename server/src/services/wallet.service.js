'use strict';

const pool = require('../db/pool');
const { withTransaction } = require('../db/tx');
const { errors } = require('../utils/HttpError');
const { clampPagination } = require('../utils/pagination');

const PACKS = {
  small: { tokens: 100, price: 199 },
  medium: { tokens: 500, price: 899 },
  large: { tokens: 1200, price: 1899 },
};

async function getMine(userId) {
  const [rows] = await pool.execute('SELECT user_id, balance, updated_at FROM wallets WHERE user_id = ?', [userId]);
  if (!rows[0]) throw errors.notFound('Wallet not found');
  return { userId: rows[0].user_id, balance: Number(rows[0].balance), updatedAt: rows[0].updated_at };
}

async function listTransactions(userId, { page, pageSize, type }) {
  const where = ['user_id = ?'];
  const params = [userId];
  if (type) { where.push('type = ?'); params.push(type); }
  const { page: safePage, pageSize: safePageSize, offset } = clampPagination(page, pageSize);

  const [rows] = await pool.execute(
    `SELECT id, user_id, type, tokens_delta, ref_chapter_id, meta, created_at
     FROM transactions WHERE ${where.join(' AND ')}
     ORDER BY created_at DESC LIMIT ${safePageSize} OFFSET ${offset}`,
    params,
  );
  const [c] = await pool.execute(
    `SELECT COUNT(*) AS total FROM transactions WHERE ${where.join(' AND ')}`,
    params,
  );
  return {
    items: rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      type: r.type,
      tokensDelta: Number(r.tokens_delta),
      refChapterId: r.ref_chapter_id,
      meta: r.meta,
      createdAt: r.created_at,
    })),
    page: safePage, pageSize: safePageSize, total: Number(c[0].total),
  };
}

// Mock purchase: credits the wallet by the pack's tokens and logs a transaction.
async function purchase(userId, { pack, tokens }) {
  const tokensToCredit = tokens || (PACKS[pack || 'small'].tokens);
  return withTransaction(async (conn) => {
    await conn.execute(
      'UPDATE wallets SET balance = balance + ? WHERE user_id = ?',
      [tokensToCredit, userId],
    );
    await conn.execute(
      `INSERT INTO transactions (user_id, type, tokens_delta, meta)
       VALUES (?, 'purchase', ?, JSON_OBJECT('pack', ?, 'mock', true))`,
      [userId, tokensToCredit, pack || 'custom'],
    );
    const [w] = await conn.execute('SELECT balance FROM wallets WHERE user_id = ?', [userId]);
    return { balance: Number(w[0].balance), creditedTokens: tokensToCredit };
  });
}

async function unlockChapter(userId, chapterId) {
  return withTransaction(async (conn) => {
    // Lock chapter and wallet rows for update
    const [cRows] = await conn.execute(
      `SELECT c.id, c.is_paid, c.token_price, c.status, c.book_id, b.status AS book_status
       FROM chapters c JOIN books b ON b.id = c.book_id
       WHERE c.id = ? FOR UPDATE`,
      [chapterId],
    );
    const chapter = cRows[0];
    if (!chapter) throw errors.notFound('Chapter not found');
    if (chapter.status !== 'published' || chapter.book_status !== 'published') {
      throw errors.notFound('Chapter not available');
    }
    if (!chapter.is_paid || Number(chapter.token_price) === 0) {
      // Free chapter - record unlock idempotently and return.
      await conn.execute(
        `INSERT IGNORE INTO chapter_unlocks (user_id, chapter_id, tokens_spent)
         VALUES (?, ?, 0)`,
        [userId, chapterId],
      );
      const [w] = await conn.execute('SELECT balance FROM wallets WHERE user_id = ? FOR UPDATE', [userId]);
      return { balance: Number(w[0].balance), tokensSpent: 0, alreadyUnlocked: false };
    }

    const [exists] = await conn.execute(
      'SELECT 1 FROM chapter_unlocks WHERE user_id = ? AND chapter_id = ? LIMIT 1',
      [userId, chapterId],
    );
    if (exists.length) {
      const [w] = await conn.execute('SELECT balance FROM wallets WHERE user_id = ? FOR UPDATE', [userId]);
      return { balance: Number(w[0].balance), tokensSpent: 0, alreadyUnlocked: true };
    }

    const [wRows] = await conn.execute('SELECT balance FROM wallets WHERE user_id = ? FOR UPDATE', [userId]);
    const balance = wRows[0] ? Number(wRows[0].balance) : 0;
    const price = Number(chapter.token_price);
    if (balance < price) throw errors.payment('Insufficient tokens');

    await conn.execute('UPDATE wallets SET balance = balance - ? WHERE user_id = ?', [price, userId]);
    await conn.execute(
      `INSERT INTO chapter_unlocks (user_id, chapter_id, tokens_spent) VALUES (?, ?, ?)`,
      [userId, chapterId, price],
    );
    await conn.execute(
      `INSERT INTO transactions (user_id, type, tokens_delta, ref_chapter_id, meta)
       VALUES (?, 'unlock', ?, ?, JSON_OBJECT('chapterId', ?))`,
      [userId, -price, chapterId, chapterId],
    );
    return { balance: balance - price, tokensSpent: price, alreadyUnlocked: false };
  });
}

module.exports = { PACKS, getMine, listTransactions, purchase, unlockChapter };
