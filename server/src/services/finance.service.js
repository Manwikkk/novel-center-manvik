'use strict';

const pool = require('../db/pool');

const DEFAULT_GST = 18;
const DEFAULT_ROYALTY = 70;
const TOKEN_INR_RATE = 1; // 1 token ≈ ₹1 for royalty valuation in mock economy

const PACKS = {
  pack_99: { tokens: 50, price: 99, name: '₹99 Coin Pack', bonus: 0 },
  pack_249: { tokens: 125, price: 249, name: '₹249 Coin Pack', bonus: 6 },
  pack_499: { tokens: 250, price: 499, name: '₹499 Coin Pack', bonus: 25 },
  pack_999: { tokens: 500, price: 999, name: '₹999 Coin Pack', bonus: 75 },
  pack_1999: { tokens: 1000, price: 1999, name: '₹1999 Coin Pack', bonus: 200 },
  pack_2999: { tokens: 1500, price: 2999, name: '₹2999 Coin Pack', bonus: 375 },
};

const LEGACY_PACK_ALIASES = {
  small: 'pack_99',
  medium: 'pack_499',
  large: 'pack_1999',
};

function getPack(packKey) {
  const key = LEGACY_PACK_ALIASES[packKey] || packKey;
  return PACKS[key] || null;
}

async function getFinanceSettings(conn = pool) {
  try {
    const [rows] = await conn.execute(
      'SELECT default_gst_rate, author_royalty_percent FROM admin_settings WHERE id = 1 LIMIT 1',
    );
    if (rows[0]) {
      return {
        gstRate: Number(rows[0].default_gst_rate) || DEFAULT_GST,
        royaltyPercent: Number(rows[0].author_royalty_percent) || DEFAULT_ROYALTY,
      };
    }
  } catch (_e) {
    /* column may be missing on older DBs */
  }
  return { gstRate: DEFAULT_GST, royaltyPercent: DEFAULT_ROYALTY };
}

function invoiceNo(orderId) {
  return `INV-${String(orderId).padStart(8, '0')}`;
}

function calcTaxInclusive(gross, gstRate) {
  const rate = Number(gstRate) || 0;
  if (rate <= 0) return { taxAmount: 0, subtotal: Number(gross) };
  const taxAmount = Number(((Number(gross) * rate) / (100 + rate)).toFixed(2));
  const subtotal = Number((Number(gross) - taxAmount).toFixed(2));
  return { taxAmount, subtotal };
}

async function resolveCoupon(conn, code) {
  if (!code) return null;
  const [rows] = await conn.execute(
    `SELECT * FROM coupons
      WHERE UPPER(code) = UPPER(?) AND status = 'active'
        AND (start_at IS NULL OR start_at <= NOW())
        AND (end_at IS NULL OR end_at >= NOW())
      LIMIT 1`,
    [String(code).trim()],
  );
  return rows[0] || null;
}

function applyCouponDiscount(gross, coupon) {
  if (!coupon) return { discount: 0, coupon };
  const value = Number(coupon.discount_value) || 0;
  let discount = 0;
  if (coupon.discount_type === 'percent') {
    discount = Number(((gross * value) / 100).toFixed(2));
  } else {
    discount = Math.min(gross, value);
  }
  return { discount, coupon };
}

/**
 * Create a successful mock payment order + tax + recon + optional coupon redemption.
 * Caller must be inside a transaction (conn).
 */
async function createSuccessfulOrder(conn, {
  userId,
  packKey,
  productName,
  unitPrice,
  coinsAdded,
  bonusCoins = 0,
  couponCode = null,
  paymentMethod = 'mock',
  gateway = 'mock',
  platform = 'web',
  createdBy = 'system',
  remarks = null,
}) {
  const settings = await getFinanceSettings(conn);
  let gross = Number(unitPrice) || 0;
  const coupon = await resolveCoupon(conn, couponCode);
  const { discount } = applyCouponDiscount(gross, coupon);
  const payable = Math.max(0, Number((gross - discount).toFixed(2)));
  const { taxAmount, subtotal } = calcTaxInclusive(payable, settings.gstRate);
  const gatewayFee = gateway === 'mock' ? 0 : Number((payable * 0.02).toFixed(2));
  const netAmount = payable;

  const [ins] = await conn.execute(
    `INSERT INTO payment_orders
       (invoice_no, user_id, pack_key, product_name, product_type, quantity, currency,
        unit_price, gross_amount, discount_amount, tax_amount, net_amount, gateway_fee,
        coins_added, bonus_coins, coupon_id, coupon_code, payment_method, gateway,
        gateway_order_id, gateway_transaction_id, gateway_settlement_id, status,
        platform, country, state_province, created_by, remarks)
     VALUES
       ('TEMP', ?, ?, ?, 'coin_pack', 1, 'INR',
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        NULL, NULL, NULL, 'success',
        ?, 'India', NULL, ?, ?)`,
    [
      userId,
      packKey || null,
      productName,
      unitPrice,
      gross,
      discount,
      taxAmount,
      netAmount,
      gatewayFee,
      coinsAdded,
      bonusCoins,
      coupon ? coupon.id : null,
      coupon ? coupon.code : null,
      paymentMethod,
      gateway,
      platform,
      createdBy,
      remarks,
    ],
  );
  const orderId = ins.insertId;
  const inv = invoiceNo(orderId);
  const gwTxn = `MOCK-${orderId}-${Date.now().toString(36)}`;
  await conn.execute(
    `UPDATE payment_orders
        SET invoice_no = ?, gateway_order_id = ?, gateway_transaction_id = ?, gateway_settlement_id = ?
      WHERE id = ?`,
    [inv, `ORD-${orderId}`, gwTxn, `SET-${orderId}`, orderId],
  );

  await conn.execute(
    `INSERT INTO tax_lines
       (payment_order_id, tax_type, tax_rate, tax_amount, country, state_province, filing_status, filing_period)
     VALUES (?, 'GST', ?, ?, 'India', NULL, 'unfiled', DATE_FORMAT(NOW(), '%Y-%m'))`,
    [orderId, settings.gstRate, taxAmount],
  );

  if (coupon) {
    await conn.execute(
      `INSERT INTO coupon_redemptions (coupon_id, payment_order_id, user_id, discount_amount)
       VALUES (?, ?, ?, ?)`,
      [coupon.id, orderId, userId, discount],
    );
  }

  const expected = Number((netAmount - gatewayFee).toFixed(2));
  await conn.execute(
    `INSERT INTO reconciliation_records
       (payment_order_id, settlement_date, gateway, gateway_transaction_id, gateway_settlement_id,
        currency, gross_amount, gateway_fee, tax_on_gateway_fee, net_settlement, expected_settlement,
        settlement_difference, reconciliation_status, settlement_status, reconciled_on, notes)
     VALUES (?, CURDATE(), ?, ?, ?, 'INR', ?, ?, 0, ?, ?, 0, 'matched', 'settled', NOW(), ?)`,
    [orderId, gateway, gwTxn, `SET-${orderId}`, netAmount, gatewayFee, expected, expected, 'Auto-settled mock payment'],
  );

  return {
    orderId,
    invoiceNo: inv,
    gross,
    discount,
    taxAmount,
    subtotal,
    netAmount,
    gatewayFee,
    coinsAdded,
    bonusCoins,
    coupon,
  };
}

async function creditWalletBuckets(conn, userId, { purchased = 0, bonus = 0, promo = 0 }) {
  const total = purchased + bonus + promo;
  await conn.execute(
    `UPDATE wallets
        SET balance = balance + ?,
            purchased_balance = purchased_balance + ?,
            bonus_balance = bonus_balance + ?,
            promo_balance = promo_balance + ?
      WHERE user_id = ?`,
    [total, purchased, bonus, promo, userId],
  );
}

/**
 * Debit wallet preferring promo → bonus → purchased.
 */
async function debitWalletBuckets(conn, userId, amount) {
  const [rows] = await conn.execute(
    `SELECT balance, purchased_balance, bonus_balance, promo_balance
       FROM wallets WHERE user_id = ? FOR UPDATE`,
    [userId],
  );
  if (!rows[0]) throw new Error('Wallet not found');
  const w = rows[0];
  const balance = Number(w.balance);
  if (balance < amount) return null;

  let remaining = amount;
  let promo = Number(w.promo_balance);
  let bonus = Number(w.bonus_balance);
  let purchased = Number(w.purchased_balance);

  const takePromo = Math.min(promo, remaining);
  promo -= takePromo;
  remaining -= takePromo;
  const takeBonus = Math.min(bonus, remaining);
  bonus -= takeBonus;
  remaining -= takeBonus;
  const takePurchased = Math.min(purchased, remaining);
  purchased -= takePurchased;
  remaining -= takePurchased;

  await conn.execute(
    `UPDATE wallets
        SET balance = balance - ?,
            purchased_balance = ?,
            bonus_balance = ?,
            promo_balance = ?
      WHERE user_id = ?`,
    [amount, purchased, bonus, promo, userId],
  );
  return { balance: balance - amount, fromPromo: takePromo, fromBonus: takeBonus, fromPurchased: takePurchased };
}

module.exports = {
  PACKS,
  getPack,
  TOKEN_INR_RATE,
  getFinanceSettings,
  invoiceNo,
  calcTaxInclusive,
  resolveCoupon,
  applyCouponDiscount,
  createSuccessfulOrder,
  creditWalletBuckets,
  debitWalletBuckets,
};
