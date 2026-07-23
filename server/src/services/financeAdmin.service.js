'use strict';

const pool = require('../db/pool');
const { withTransaction } = require('../db/tx');
const { errors } = require('../utils/HttpError');
const { clampPagination } = require('../utils/pagination');
const finance = require('./finance.service');
const auditSvc = require('./audit.service');

function rowCampaign(r) {
  return {
    id: r.id,
    name: r.name,
    campaignType: r.campaign_type,
    startAt: r.start_at,
    endAt: r.end_at,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function rowCoupon(r) {
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    discountType: r.discount_type,
    discountValue: Number(r.discount_value),
    campaignId: r.campaign_id,
    startAt: r.start_at,
    endAt: r.end_at,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

async function listCampaigns() {
  const [rows] = await pool.execute('SELECT * FROM campaigns ORDER BY id DESC');
  return { items: rows.map(rowCampaign) };
}

async function createCampaign(body, actor) {
  const [ins] = await pool.execute(
    `INSERT INTO campaigns (name, campaign_type, start_at, end_at, status)
     VALUES (?, ?, ?, ?, ?)`,
    [
      body.name,
      body.campaignType || 'promo',
      body.startAt || null,
      body.endAt || null,
      body.status || 'active',
    ],
  );
  const [rows] = await pool.execute('SELECT * FROM campaigns WHERE id = ?', [ins.insertId]);
  if (actor) {
    await auditSvc.logAction({
      actor,
      action: 'finance.campaign_create',
      targetType: 'campaign',
      targetId: ins.insertId,
      summary: `Created campaign ${body.name}`,
    });
  }
  return rowCampaign(rows[0]);
}

async function listCoupons() {
  const [rows] = await pool.execute('SELECT * FROM coupons ORDER BY id DESC');
  return { items: rows.map(rowCoupon) };
}

async function createCoupon(body, actor) {
  try {
    const [ins] = await pool.execute(
      `INSERT INTO coupons (code, name, discount_type, discount_value, campaign_id, start_at, end_at, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        String(body.code).trim().toUpperCase(),
        body.name,
        body.discountType || 'percent',
        body.discountValue,
        body.campaignId || null,
        body.startAt || null,
        body.endAt || null,
        body.status || 'active',
      ],
    );
    const [rows] = await pool.execute('SELECT * FROM coupons WHERE id = ?', [ins.insertId]);
    if (actor) {
      await auditSvc.logAction({
        actor,
        action: 'finance.coupon_create',
        targetType: 'coupon',
        targetId: ins.insertId,
        summary: `Created coupon ${body.code}`,
      });
    }
    return rowCoupon(rows[0]);
  } catch (e) {
    if (e && e.code === 'ER_DUP_ENTRY') throw errors.conflict('Coupon code already exists');
    throw e;
  }
}

async function updateCoupon(id, body, actor) {
  const [cur] = await pool.execute('SELECT * FROM coupons WHERE id = ?', [id]);
  if (!cur[0]) throw errors.notFound('Coupon not found');
  const fields = [];
  const params = [];
  if (body.name != null) { fields.push('name = ?'); params.push(body.name); }
  if (body.discountType != null) { fields.push('discount_type = ?'); params.push(body.discountType); }
  if (body.discountValue != null) { fields.push('discount_value = ?'); params.push(body.discountValue); }
  if (body.campaignId !== undefined) { fields.push('campaign_id = ?'); params.push(body.campaignId); }
  if (body.startAt !== undefined) { fields.push('start_at = ?'); params.push(body.startAt); }
  if (body.endAt !== undefined) { fields.push('end_at = ?'); params.push(body.endAt); }
  if (body.status != null) { fields.push('status = ?'); params.push(body.status); }
  if (!fields.length) return rowCoupon(cur[0]);
  params.push(id);
  await pool.execute(`UPDATE coupons SET ${fields.join(', ')} WHERE id = ?`, params);
  const [rows] = await pool.execute('SELECT * FROM coupons WHERE id = ?', [id]);
  if (actor) {
    await auditSvc.logAction({
      actor,
      action: 'finance.coupon_update',
      targetType: 'coupon',
      targetId: id,
      summary: `Updated coupon ${rows[0].code}`,
    });
  }
  return rowCoupon(rows[0]);
}

async function createRefund(body, actor) {
  const orderId = Number(body.paymentOrderId);
  return withTransaction(async (conn) => {
    const [orders] = await conn.execute(
      'SELECT * FROM payment_orders WHERE id = ? FOR UPDATE',
      [orderId],
    );
    const order = orders[0];
    if (!order) throw errors.notFound('Payment order not found');
    if (order.status === 'refunded') throw errors.badRequest('Order already refunded');
    if (order.status !== 'success' && order.status !== 'partially_refunded') {
      throw errors.badRequest('Only successful orders can be refunded');
    }

    const refundAmount = body.refundAmount != null
      ? Number(body.refundAmount)
      : Number(order.net_amount);
    if (refundAmount <= 0 || refundAmount > Number(order.net_amount)) {
      throw errors.badRequest('Invalid refund amount');
    }

    const full = refundAmount >= Number(order.net_amount);
    const coinsToRevoke = full ? Number(order.coins_added) + Number(order.bonus_coins) : 0;

    if (coinsToRevoke > 0) {
      const debit = await finance.debitWalletBuckets(conn, order.user_id, coinsToRevoke);
      if (!debit) throw errors.badRequest('User wallet does not have enough coins to reverse');
      await conn.execute(
        `INSERT INTO transactions (user_id, type, tokens_delta, payment_order_id, meta)
         VALUES (?, 'admin_adjust', ?, ?, JSON_OBJECT('reason', 'refund', 'paymentOrderId', ?))`,
        [order.user_id, -coinsToRevoke, orderId, orderId],
      );
    }

    const [ins] = await conn.execute(
      `INSERT INTO payment_refunds
         (payment_order_id, user_id, refund_amount, currency, reason, status, approved_by, gateway_reference, notes)
       VALUES (?, ?, ?, 'INR', ?, 'completed', ?, ?, ?)`,
      [
        orderId,
        order.user_id,
        refundAmount,
        body.reason || null,
        actor?.id || null,
        body.gatewayReference || null,
        body.notes || null,
      ],
    );

    await conn.execute(
      `UPDATE payment_orders SET status = ? WHERE id = ?`,
      [full ? 'refunded' : 'partially_refunded', orderId],
    );

    if (actor) {
      await auditSvc.logAction({
        actor,
        action: 'finance.refund',
        targetType: 'payment_order',
        targetId: orderId,
        summary: `Refunded ₹${refundAmount} on order ${order.invoice_no}`,
        meta: { refundId: ins.insertId, refundAmount },
      });
    }

    return { id: ins.insertId, paymentOrderId: orderId, refundAmount, status: 'completed' };
  });
}

async function generateAuthorPayoutDraft({ authorId, periodStart, periodEnd }, actor) {
  const settings = await finance.getFinanceSettings();
  const royaltyPct = settings.royaltyPercent;

  return withTransaction(async (conn) => {
    const [authorRows] = await conn.execute(
      "SELECT id, display_name FROM users WHERE id = ? AND role IN ('author','admin') LIMIT 1",
      [authorId],
    );
    if (!authorRows[0]) throw errors.notFound('Author not found');

    const [bookEarn] = await conn.execute(
      `SELECT b.id AS book_id, b.title,
              COUNT(cu.user_id) AS chapters_sold,
              COALESCE(SUM(cu.tokens_spent), 0) AS coins_earned
         FROM books b
         JOIN chapters c ON c.book_id = b.id
         JOIN chapter_unlocks cu ON cu.chapter_id = c.id
        WHERE b.author_id = ?
          AND cu.unlocked_at >= ?
          AND cu.unlocked_at < DATE_ADD(?, INTERVAL 1 DAY)
          AND cu.tokens_spent > 0
        GROUP BY b.id, b.title
        HAVING coins_earned > 0`,
      [authorId, periodStart, periodEnd],
    );

    if (!bookEarn.length) throw errors.badRequest('No unlock earnings in this period');

    let grossTotal = 0;
    const lines = bookEarn.map((r) => {
      const coins = Number(r.coins_earned);
      const gross = Number((coins * finance.TOKEN_INR_RATE).toFixed(2));
      const platformCut = Number((gross * ((100 - royaltyPct) / 100)).toFixed(2));
      const net = Number((gross - platformCut).toFixed(2));
      const royalty = Number(((net * royaltyPct) / 100).toFixed(2));
      // For revenue-share model: author gets royaltyPct of gross novel revenue
      const authorShare = Number(((gross * royaltyPct) / 100).toFixed(2));
      const deductions = Number((gross - authorShare).toFixed(2));
      grossTotal += gross;
      return {
        bookId: r.book_id,
        chaptersSold: Number(r.chapters_sold),
        coinsEarned: coins,
        gross,
        platformDeductions: deductions,
        netRevenue: authorShare,
        royaltyPercent: royaltyPct,
        royaltyAmount: authorShare,
      };
    });

    const netTotal = lines.reduce((s, l) => s + l.royaltyAmount, 0);
    const deductions = Number((grossTotal - netTotal).toFixed(2));

    const [payoutIns] = await conn.execute(
      `INSERT INTO author_payouts
         (author_id, agreement_type, payout_type, period_start, period_end,
          gross_amount, deductions, net_amount, currency, status, notes)
       VALUES (?, 'Revenue Share', 'Royalty', ?, ?, ?, ?, ?, 'INR', 'draft', ?)`,
      [
        authorId,
        periodStart,
        periodEnd,
        grossTotal,
        deductions,
        netTotal,
        `Draft from unlocks ${periodStart} → ${periodEnd}`,
      ],
    );
    const payoutId = payoutIns.insertId;

    for (const line of lines) {
      await conn.execute(
        `INSERT INTO author_royalty_lines
           (payout_id, author_id, book_id, period_start, period_end, chapters_sold, coins_earned,
            gross_novel_revenue, platform_deductions, net_revenue, royalty_percent, royalty_amount,
            settlement_status, available_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'available', NOW())`,
        [
          payoutId,
          authorId,
          line.bookId,
          periodStart,
          periodEnd,
          line.chaptersSold,
          line.coinsEarned,
          line.gross,
          line.platformDeductions,
          line.netRevenue,
          line.royaltyPercent,
          line.royaltyAmount,
        ],
      );
    }

    if (actor) {
      await auditSvc.logAction({
        actor,
        action: 'finance.payout_draft',
        targetType: 'author_payout',
        targetId: payoutId,
        summary: `Draft payout ₹${netTotal} for author ${authorRows[0].display_name}`,
      });
    }

    return {
      id: payoutId,
      authorId,
      authorName: authorRows[0].display_name,
      grossAmount: grossTotal,
      deductions,
      netAmount: netTotal,
      status: 'draft',
      lines: lines.length,
    };
  });
}

async function updateAuthorPayout(id, body, actor) {
  const [cur] = await pool.execute('SELECT * FROM author_payouts WHERE id = ?', [id]);
  if (!cur[0]) throw errors.notFound('Payout not found');

  const fields = [];
  const params = [];
  if (body.status != null) {
    fields.push('status = ?');
    params.push(body.status);
    if (body.status === 'approved') {
      fields.push('approved_by = ?');
      params.push(actor?.id || null);
    }
    if (body.status === 'paid') {
      fields.push('paid_at = COALESCE(paid_at, NOW())');
    }
  }
  if (body.paymentMethod != null) { fields.push('payment_method = ?'); params.push(body.paymentMethod); }
  if (body.bankReference != null) { fields.push('bank_reference = ?'); params.push(body.bankReference); }
  if (body.notes != null) { fields.push('notes = ?'); params.push(body.notes); }
  if (!fields.length) throw errors.badRequest('No updates');

  params.push(id);
  await pool.execute(`UPDATE author_payouts SET ${fields.join(', ')} WHERE id = ?`, params);

  if (body.status === 'paid') {
    await pool.execute(
      `UPDATE author_royalty_lines
          SET settlement_status = 'paid', paid_at = NOW()
        WHERE payout_id = ?`,
      [id],
    );
  }

  if (actor) {
    await auditSvc.logAction({
      actor,
      action: 'finance.payout_update',
      targetType: 'author_payout',
      targetId: id,
      summary: `Updated payout #${id} status=${body.status || cur[0].status}`,
    });
  }

  const [rows] = await pool.execute('SELECT * FROM author_payouts WHERE id = ?', [id]);
  return rows[0];
}

async function listReconciliation({ page, pageSize, status }) {
  const where = [];
  const params = [];
  if (status) { where.push('r.reconciliation_status = ?'); params.push(status); }
  const { page: safePage, pageSize: safePageSize, offset } = clampPagination(page, pageSize);
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [rows] = await pool.execute(
    `SELECT r.*, o.invoice_no, o.user_id, u.display_name AS username
       FROM reconciliation_records r
       JOIN payment_orders o ON o.id = r.payment_order_id
       JOIN users u ON u.id = o.user_id
       ${whereSql}
       ORDER BY r.created_at DESC
       LIMIT ${safePageSize} OFFSET ${offset}`,
    params,
  );
  const [c] = await pool.execute(
    `SELECT COUNT(*) AS total FROM reconciliation_records r ${whereSql}`,
    params,
  );
  return {
    items: rows.map((r) => ({
      id: r.id,
      paymentOrderId: r.payment_order_id,
      invoiceNo: r.invoice_no,
      userId: r.user_id,
      username: r.username,
      gateway: r.gateway,
      grossAmount: Number(r.gross_amount),
      gatewayFee: Number(r.gateway_fee),
      netSettlement: Number(r.net_settlement),
      expectedSettlement: Number(r.expected_settlement),
      settlementDifference: Number(r.settlement_difference),
      reconciliationStatus: r.reconciliation_status,
      settlementStatus: r.settlement_status,
      notes: r.notes,
      createdAt: r.created_at,
    })),
    page: safePage,
    pageSize: safePageSize,
    total: Number(c[0].total),
  };
}

async function updateReconciliation(id, body, actor) {
  const [cur] = await pool.execute('SELECT * FROM reconciliation_records WHERE id = ?', [id]);
  if (!cur[0]) throw errors.notFound('Reconciliation record not found');

  const fields = [];
  const params = [];
  if (body.reconciliationStatus != null) {
    fields.push('reconciliation_status = ?');
    params.push(body.reconciliationStatus);
  }
  if (body.settlementStatus != null) {
    fields.push('settlement_status = ?');
    params.push(body.settlementStatus);
  }
  if (body.notes != null) { fields.push('notes = ?'); params.push(body.notes); }
  fields.push('reconciled_by = ?', 'reconciled_on = NOW()');
  params.push(actor?.id || null);
  params.push(id);

  await pool.execute(`UPDATE reconciliation_records SET ${fields.join(', ')} WHERE id = ?`, params);

  if (actor) {
    await auditSvc.logAction({
      actor,
      action: 'finance.reconciliation_update',
      targetType: 'reconciliation',
      targetId: id,
      summary: `Updated reconciliation #${id}`,
    });
  }

  const [rows] = await pool.execute('SELECT * FROM reconciliation_records WHERE id = ?', [id]);
  return rows[0];
}

module.exports = {
  listCampaigns,
  createCampaign,
  listCoupons,
  createCoupon,
  updateCoupon,
  createRefund,
  generateAuthorPayoutDraft,
  updateAuthorPayout,
  listReconciliation,
  updateReconciliation,
};
