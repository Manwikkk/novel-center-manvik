'use strict';

const pool = require('../db/pool');
const { withTransaction } = require('../db/tx');
const { errors } = require('../utils/HttpError');
const { clampPagination } = require('../utils/pagination');
const { resolveUserRow, assertRestriction } = require('./suspension.service');
const finance = require('./finance.service');

const PACKS = finance.PACKS;

async function getMine(userId) {
  const [rows] = await pool.execute(
    `SELECT user_id, balance, purchased_balance, bonus_balance, promo_balance, updated_at
       FROM wallets WHERE user_id = ?`,
    [userId],
  );
  if (!rows[0]) throw errors.notFound('Wallet not found');
  return {
    userId: rows[0].user_id,
    balance: Number(rows[0].balance),
    purchasedBalance: Number(rows[0].purchased_balance) || 0,
    bonusBalance: Number(rows[0].bonus_balance) || 0,
    promoBalance: Number(rows[0].promo_balance) || 0,
    updatedAt: rows[0].updated_at,
  };
}

async function listTransactions(userId, { page, pageSize, type }) {
  const where = ['user_id = ?'];
  const params = [userId];
  if (type) { where.push('type = ?'); params.push(type); }
  const { page: safePage, pageSize: safePageSize, offset } = clampPagination(page, pageSize);

  const [rows] = await pool.execute(
    `SELECT id, user_id, type, tokens_delta, ref_chapter_id, payment_order_id, meta, created_at
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
      paymentOrderId: r.payment_order_id,
      meta: r.meta,
      createdAt: r.created_at,
    })),
    page: safePage, pageSize: safePageSize, total: Number(c[0].total),
  };
}

async function purchase(userId, { pack, tokens, couponCode }) {
  const packKey = pack || 'pack_99';
  const packDef = finance.getPack(packKey) || {
    tokens: tokens || 50,
    price: tokens || 99,
    name: 'Custom Coin Pack',
    bonus: 0,
  };
  const tokensToCredit = tokens || packDef.tokens;
  const bonusCoins = packDef.bonus || 0;

  return withTransaction(async (conn) => {
    const order = await finance.createSuccessfulOrder(conn, {
      userId,
      packKey,
      productName: packDef.name || `${tokensToCredit} Coin Pack`,
      unitPrice: packDef.price ?? tokensToCredit,
      coinsAdded: tokensToCredit,
      bonusCoins,
      couponCode: couponCode || null,
      paymentMethod: 'mock',
      gateway: 'mock',
      platform: 'web',
      createdBy: 'system',
      remarks: 'Mock coin purchase',
    });

    await finance.creditWalletBuckets(conn, userId, {
      purchased: tokensToCredit,
      bonus: bonusCoins,
      promo: 0,
    });

    await conn.execute(
      `INSERT INTO transactions (user_id, type, tokens_delta, payment_order_id, meta)
       VALUES (?, 'purchase', ?, ?, JSON_OBJECT('pack', ?, 'mock', true, 'invoiceNo', ?, 'bonusCoins', ?))`,
      [userId, tokensToCredit + bonusCoins, order.orderId, packKey, order.invoiceNo, bonusCoins],
    );

    const [w] = await conn.execute('SELECT balance FROM wallets WHERE user_id = ?', [userId]);
    return {
      balance: Number(w[0].balance),
      creditedTokens: tokensToCredit + bonusCoins,
      orderId: order.orderId,
      invoiceNo: order.invoiceNo,
    };
  });
}

async function unlockChapter(userId, chapterId) {
  const userRow = await resolveUserRow(userId);
  assertRestriction(userRow, 'reading', 'Reading is restricted on your account');

  return withTransaction(async (conn) => {
    const [cRows] = await conn.execute(
      `SELECT c.id, c.is_paid, c.token_price, c.status, c.book_id, c.title,
              b.status AS book_status, b.author_id, b.title AS book_title
       FROM chapters c JOIN books b ON b.id = c.book_id
       WHERE c.id = ? FOR UPDATE`,
      [chapterId],
    );
    const chapter = cRows[0];
    if (!chapter) throw errors.notFound('Chapter not found');
    if (chapter.status !== 'published' || chapter.book_status !== 'published') {
      throw errors.notFound('Chapter not available');
    }

    const bookAuthorId = Number(chapter.author_id);
    if (bookAuthorId === Number(userId)) {
      await conn.execute(
        `INSERT IGNORE INTO chapter_unlocks (user_id, chapter_id, tokens_spent)
         VALUES (?, ?, 0)`,
        [userId, chapterId],
      );
      const [w] = await conn.execute('SELECT balance FROM wallets WHERE user_id = ? FOR UPDATE', [userId]);
      return { balance: Number(w[0].balance), tokensSpent: 0, alreadyUnlocked: false };
    }

    if (!chapter.is_paid || Number(chapter.token_price) === 0) {
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

    const price = Number(chapter.token_price);
    const debit = await finance.debitWalletBuckets(conn, userId, price);
    if (!debit) throw errors.payment('Insufficient tokens');

    await conn.execute(
      `INSERT INTO chapter_unlocks (user_id, chapter_id, tokens_spent) VALUES (?, ?, ?)`,
      [userId, chapterId, price],
    );
    await conn.execute(
      `INSERT INTO transactions (user_id, type, tokens_delta, ref_chapter_id, meta)
       VALUES (?, 'unlock', ?, ?, JSON_OBJECT(
         'chapterId', ?, 'bookId', ?, 'bookTitle', ?, 'chapterTitle', ?, 'authorId', ?
       ))`,
      [
        userId,
        -price,
        chapterId,
        chapterId,
        chapter.book_id,
        chapter.book_title || '',
        chapter.title || '',
        bookAuthorId,
      ],
    );
    return { balance: debit.balance, tokensSpent: price, alreadyUnlocked: false };
  });
}

module.exports = { PACKS, getMine, listTransactions, purchase, unlockChapter };
