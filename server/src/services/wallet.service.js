'use strict';

const pool = require('../db/pool');
const { withTransaction } = require('../db/tx');
const { errors } = require('../utils/HttpError');
const { clampPagination } = require('../utils/pagination');
const { resolveUserRow, assertRestriction } = require('./suspension.service');
const { assertMatureAccess } = require('./ageGate');
const finance = require('./finance.service');
const rewards = require('./rewards.service');

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

async function unlockChapter(userId, chapterId, { useVoucher = true } = {}) {
  const userRow = await resolveUserRow(userId);
  assertRestriction(userRow, 'reading', 'Reading is restricted on your account');

  return withTransaction(async (conn) => {
    const [cRows] = await conn.execute(
      `SELECT c.id, c.is_paid, c.token_price, c.status, c.book_id, c.title,
              b.status AS book_status, b.author_id, b.title AS book_title, b.warning_notice
       FROM chapters c JOIN books b ON b.id = c.book_id
       WHERE c.id = ? FOR UPDATE`,
      [chapterId],
    );
    const chapter = cRows[0];
    if (!chapter) throw errors.notFound('Chapter not found');
    if (chapter.status !== 'published' || chapter.book_status !== 'published') {
      throw errors.notFound('Chapter not available');
    }
    // No point spending tokens on a chapter the reader is not allowed to open.
    assertMatureAccess({ warningNotice: chapter.warning_notice, authorId: chapter.author_id }, userRow);

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

    // An active Novel / Platform Pass already makes this chapter readable; never
    // let a tap spend coins on it while the pass runs.
    const pass = await rewards.passCovering(userId, chapter.book_id, { conn });
    if (pass) {
      throw errors.conflict(`This chapter is free to read with your ${pass.title} until it expires`);
    }

    const price = Number(chapter.token_price);
    // Discount vouchers are platform-funded: the author's unlock value stays at
    // the full price while the reader's wallet is charged the discounted one.
    const voucher = useVoucher ? await rewards.bestVoucher(userId, 'CHAPTER_DISCOUNT', conn) : null;
    const discount = voucher ? rewards.computeDiscount(price, voucher) : 0;
    const charge = price - discount;

    const debit = await finance.debitWalletBuckets(conn, userId, charge);
    if (!debit) throw errors.payment('Insufficient tokens');
    if (voucher && discount > 0) {
      await rewards.consumeVoucher(conn, userId, voucher.id, { chapterId, basePrice: price, discount });
    }

    await conn.execute(
      `INSERT INTO chapter_unlocks (user_id, chapter_id, tokens_spent) VALUES (?, ?, ?)`,
      [userId, chapterId, price],
    );
    await conn.execute(
      `INSERT INTO transactions (user_id, type, tokens_delta, ref_chapter_id, meta)
       VALUES (?, 'unlock', ?, ?, JSON_OBJECT(
         'chapterId', ?, 'bookId', ?, 'bookTitle', ?, 'chapterTitle', ?, 'authorId', ?,
         'basePrice', ?, 'discount', ?, 'voucherId', ?
       ))`,
      [
        userId,
        -charge,
        chapterId,
        chapterId,
        chapter.book_id,
        chapter.book_title || '',
        chapter.title || '',
        bookAuthorId,
        price,
        discount,
        voucher && discount > 0 ? voucher.id : null,
      ],
    );
    return {
      balance: debit.balance,
      tokensSpent: charge,
      basePrice: price,
      discount,
      voucher: voucher && discount > 0 ? { id: voucher.id, title: voucher.title, percent: voucher.percent } : null,
      alreadyUnlocked: false,
    };
  });
}

/**
 * Unlock a run of consecutive locked chapters starting at `chapterId` in one
 * charge. A Bundle Discount voucher (Day 14 milestone reward) applies to the
 * combined price; the author still earns the full value of every chapter.
 */
async function unlockBundle(userId, chapterId, { count, useVoucher = true } = {}) {
  const userRow = await resolveUserRow(userId);
  assertRestriction(userRow, 'reading', 'Reading is restricted on your account');

  return withTransaction(async (conn) => {
    const [cRows] = await conn.execute(
      `SELECT c.id, c.idx, c.status, c.book_id,
              b.status AS book_status, b.author_id, b.title AS book_title, b.warning_notice
         FROM chapters c JOIN books b ON b.id = c.book_id
        WHERE c.id = ? AND c.recycled_at IS NULL FOR UPDATE`,
      [chapterId],
    );
    const start = cRows[0];
    if (!start) throw errors.notFound('Chapter not found');
    if (start.status !== 'published' || start.book_status !== 'published') {
      throw errors.notFound('Chapter not available');
    }
    assertMatureAccess({ warningNotice: start.warning_notice, authorId: start.author_id }, userRow);
    if (Number(start.author_id) === Number(userId)) {
      throw errors.badRequest('You already have access to your own novel');
    }

    const pass = await rewards.passCovering(userId, start.book_id, { conn });
    if (pass) {
      throw errors.conflict(`These chapters are free to read with your ${pass.title} until it expires`);
    }

    const voucher = useVoucher ? await rewards.bestVoucher(userId, 'BUNDLE_DISCOUNT', conn) : null;
    const wanted = Math.max(2, Math.min(20, Number(count) || voucher?.bundleSize || 5));

    const [candidates] = await conn.execute(
      `SELECT c.id, c.idx, c.title, c.token_price
         FROM chapters c
         LEFT JOIN chapter_unlocks cu ON cu.chapter_id = c.id AND cu.user_id = ?
        WHERE c.book_id = ? AND c.idx >= ? AND c.status = 'published' AND c.recycled_at IS NULL
          AND c.is_paid = 1 AND c.token_price > 0 AND cu.chapter_id IS NULL
        ORDER BY c.idx ASC
        LIMIT ${wanted}`,
      [userId, start.book_id, start.idx],
    );
    if (!candidates.length) throw errors.badRequest('Nothing left to unlock from here');

    const basePrice = candidates.reduce((sum, c) => sum + Number(c.token_price), 0);
    const bundleVoucher = voucher && candidates.length >= 2 ? voucher : null;
    const discount = bundleVoucher ? rewards.computeDiscount(basePrice, bundleVoucher) : 0;
    const charge = basePrice - discount;

    const debit = await finance.debitWalletBuckets(conn, userId, charge);
    if (!debit) throw errors.payment('Insufficient tokens');
    if (bundleVoucher && discount > 0) {
      await rewards.consumeVoucher(conn, userId, bundleVoucher.id, {
        chapterIds: candidates.map((c) => c.id), basePrice, discount,
      });
    }

    for (const c of candidates) {
      // eslint-disable-next-line no-await-in-loop
      await conn.execute(
        'INSERT INTO chapter_unlocks (user_id, chapter_id, tokens_spent) VALUES (?, ?, ?)',
        [userId, c.id, Number(c.token_price)],
      );
    }
    await conn.execute(
      `INSERT INTO transactions (user_id, type, tokens_delta, ref_chapter_id, meta)
       VALUES (?, 'unlock', ?, ?, JSON_OBJECT(
         'bundle', true, 'chapterIds', CAST(? AS JSON), 'bookId', ?, 'bookTitle', ?, 'authorId', ?,
         'chapterTitle', ?, 'basePrice', ?, 'discount', ?, 'voucherId', ?
       ))`,
      [
        userId,
        -charge,
        candidates[0].id,
        JSON.stringify(candidates.map((c) => c.id)),
        start.book_id,
        start.book_title || '',
        Number(start.author_id),
        `${candidates.length} chapters from Chapter ${candidates[0].idx}`,
        basePrice,
        discount,
        bundleVoucher && discount > 0 ? bundleVoucher.id : null,
      ],
    );

    return {
      balance: debit.balance,
      tokensSpent: charge,
      basePrice,
      discount,
      voucher: bundleVoucher && discount > 0
        ? { id: bundleVoucher.id, title: bundleVoucher.title, percent: bundleVoucher.percent }
        : null,
      unlockedChapterIds: candidates.map((c) => c.id),
      count: candidates.length,
    };
  });
}

module.exports = { PACKS, getMine, listTransactions, purchase, unlockChapter, unlockBundle };
