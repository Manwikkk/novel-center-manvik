'use strict';

const pool = require('../../db/pool');
const baseH = require('./helpers');
const { catalogFromSchemas } = require('./schemas');
const { parseReportFilters, createReportHelpers } = require('./filters');

function catalog() {
  return catalogFromSchemas();
}

function parseMeta(meta) {
  if (!meta) return {};
  if (typeof meta === 'object') return meta;
  try { return JSON.parse(meta); } catch (_e) { return {}; }
}

async function walletCoin({ from, to, generatedBy, h = baseH }) {
  const wb = await h.newWorkbook();
  const params = [];
  const range = h.rangeClause('t.created_at', from, to, params);

  const [ledger] = await pool.execute(
    `SELECT t.*, u.display_name, c.title AS chapter_title, b.title AS book_title
       FROM transactions t
       JOIN users u ON u.id = t.user_id
       LEFT JOIN chapters c ON c.id = t.ref_chapter_id
       LEFT JOIN books b ON b.id = c.book_id
      WHERE ${range}
      ORDER BY t.created_at ASC`,
    params,
  );

  const [wallets] = await pool.execute(
    `SELECT w.*, u.display_name, u.status
       FROM wallets w JOIN users u ON u.id = w.user_id
      ORDER BY w.user_id`,
  );

  let purchasedIn = 0;
  let unlockOut = 0;
  let adminIn = 0;
  let adminOut = 0;
  for (const r of ledger) {
    const d = Number(r.tokens_delta);
    if (r.type === 'purchase') purchasedIn += d;
    else if (r.type === 'unlock') unlockOut += Math.abs(d);
    else if (r.type === 'admin_adjust') {
      if (d >= 0) adminIn += d; else adminOut += Math.abs(d);
    }
  }

  const outstanding = wallets.reduce((s, w) => s + Number(w.balance), 0);
  const purchasedBal = wallets.reduce((s, w) => s + Number(w.purchased_balance || 0), 0);
  const bonusBal = wallets.reduce((s, w) => s + Number(w.bonus_balance || 0), 0);
  const promoBal = wallets.reduce((s, w) => s + Number(w.promo_balance || 0), 0);

  const summary = h.addSheet(wb, 'Summary');
  h.writeTable(summary, ['Metric', 'Value'], [
    ['Purchased Coins Issued', purchasedIn],
    ['Coins Spent (Unlocks)', unlockOut],
    ['Admin Credits', adminIn],
    ['Admin Debits', adminOut],
    ['Outstanding Wallet Liability', outstanding],
  ]);

  const coinLedger = h.addSheet(wb, 'Coin Ledger');
  h.writeTable(coinLedger, [
    'Ledger ID', 'Date', 'User ID', 'Username', 'Wallet ID', 'Transaction Type', 'Coin Source',
    'Coins In', 'Coins Out', 'Balance After', 'Related Transaction ID', 'Related Novel', 'Related Chapter', 'Remarks',
  ], ledger.map((r) => {
    const meta = parseMeta(r.meta);
    const delta = Number(r.tokens_delta);
    return [
      r.id,
      r.created_at,
      r.user_id,
      r.display_name,
      r.user_id,
      r.type,
      meta.coinSource || meta.pack || r.type,
      delta > 0 ? delta : 0,
      delta < 0 ? Math.abs(delta) : 0,
      '',
      r.payment_order_id || '',
      meta.bookTitle || r.book_title || '',
      meta.chapterTitle || r.chapter_title || '',
      meta.reason || '',
    ];
  }));

  const bal = h.addSheet(wb, 'Wallet Balances');
  h.writeTable(bal, [
    'Wallet ID', 'User ID', 'Username', 'Purchased Coins', 'Bonus Coins', 'Promotional Coins',
    'Total Balance', 'Last Activity', 'Wallet Status',
  ], wallets.map((w) => [
    w.user_id,
    w.user_id,
    w.display_name,
    Number(w.purchased_balance) || 0,
    Number(w.bonus_balance) || 0,
    Number(w.promo_balance) || 0,
    Number(w.balance) || 0,
    w.updated_at,
    w.status === 'suspended' ? 'suspended' : 'active',
  ]));

  const sourcesTotal = purchasedIn + adminIn || 1;
  const sources = h.addSheet(wb, 'Coin Sources & Usage');
  h.writeTable(sources, ['Source', 'Coins', '%'], [
    ['Coin Packs', purchasedIn, h.pct(purchasedIn, sourcesTotal)],
    ['Admin Credits', adminIn, h.pct(adminIn, sourcesTotal)],
    ['Chapter Unlocks (out)', unlockOut, h.pct(unlockOut, sourcesTotal)],
    ['Admin Debits (out)', adminOut, h.pct(adminOut, sourcesTotal)],
  ]);

  const liability = h.addSheet(wb, 'Liability Summary');
  h.writeTable(liability, ['Category', 'Coins'], [
    ['Purchased Coins Outstanding', purchasedBal],
    ['Bonus Coins Outstanding', bonusBal],
    ['Promotional Coins Outstanding', promoBal],
    ['Total Outstanding', outstanding],
  ]);

  const info = h.addSheet(wb, 'Report Information');
  h.writeKvSheet(info, 'Report Information', h.metaPairs({
    reportName: 'Wallet & Coin Report', from, to, generatedBy,
  }));

  return wb;
}

async function transactionReport({ from, to, generatedBy, h = baseH }) {
  const wb = await h.newWorkbook();
  const p = [];
  const range = h.rangeClause('o.created_at', from, to, p);

  const [orders] = await pool.execute(
    `SELECT o.*, u.display_name, u.email
       FROM payment_orders o JOIN users u ON u.id = o.user_id
      WHERE ${range}
      ORDER BY o.created_at ASC`,
    p,
  );

  const rp = [];
  const rRange = h.rangeClause('r.created_at', from, to, rp);
  const [refunds] = await pool.execute(
    `SELECT r.*, u.display_name, o.invoice_no
       FROM payment_refunds r
       JOIN users u ON u.id = r.user_id
       JOIN payment_orders o ON o.id = r.payment_order_id
      WHERE ${rRange}
      ORDER BY r.created_at ASC`,
    rp,
  );

  const pp = [];
  const pRange = h.rangeClause('ap.created_at', from, to, pp);
  const [payouts] = await pool.execute(
    `SELECT ap.*, u.display_name
       FROM author_payouts ap JOIN users u ON u.id = ap.author_id
      WHERE ${pRange}
      ORDER BY ap.created_at ASC`,
    pp,
  );

  const success = orders.filter((o) => o.status === 'success');
  const failed = orders.filter((o) => o.status === 'failed');
  const totalAmt = success.reduce((s, o) => s + Number(o.net_amount), 0);

  const summary = h.addSheet(wb, 'Summary');
  h.writeTable(summary, ['Metric', 'Value'], [
    ['Total Transactions', orders.length],
    ['Successful', success.length],
    ['Failed', failed.length],
    ['Refunds', refunds.length],
    ['Payouts', payouts.length],
    ['Successful Amount (INR)', h.inr(totalAmt)],
  ]);
  summary.addRow([]);
  summary.addRow(['Type', 'Count', 'Amount']);
  h.styleHeader(summary.getRow(summary.rowCount));
  summary.addRow(['purchase', success.length, h.inr(totalAmt)]);
  summary.addRow(['refund', refunds.length, h.inr(refunds.reduce((s, r) => s + Number(r.refund_amount), 0))]);
  summary.addRow(['payout', payouts.length, h.inr(payouts.reduce((s, r) => s + Number(r.net_amount), 0))]);

  const tx = h.addSheet(wb, 'Transactions');
  h.writeTable(tx, [
    'Transaction ID', 'Date', 'Time', 'Order ID', 'User ID', 'Username', 'Email', 'Transaction Type',
    'Payment Method', 'Gateway', 'Amount', 'Currency', 'Coins Added', 'Bonus Coins', 'Discount',
    'Coupon Code', 'Tax', 'Gateway Fee', 'Net Amount', 'Status', 'Country', 'Platform', 'Device',
    'Created By', 'Remarks',
  ], orders.map((o) => {
    const d = new Date(o.created_at);
    return [
      o.id,
      d.toISOString().slice(0, 10),
      d.toISOString().slice(11, 19),
      o.gateway_order_id || o.invoice_no,
      o.user_id,
      o.display_name,
      o.email,
      'Coin Purchase',
      o.payment_method,
      o.gateway,
      h.inr(o.gross_amount),
      o.currency,
      o.coins_added,
      o.bonus_coins,
      h.inr(o.discount_amount),
      o.coupon_code || '',
      h.inr(o.tax_amount),
      h.inr(o.gateway_fee),
      h.inr(o.net_amount),
      o.status,
      o.country || '',
      o.platform,
      '',
      o.created_by,
      o.remarks || '',
    ];
  }));

  const ref = h.addSheet(wb, 'Refunds');
  h.writeTable(ref, [
    'Refund ID', 'Original Transaction ID', 'Refund Date', 'User ID', 'Username',
    'Original Amount', 'Refund Amount', 'Currency', 'Refund Reason', 'Refund Status',
    'Approved By', 'Gateway Reference', 'Notes',
  ], refunds.map((r) => [
    r.id, r.payment_order_id, r.created_at, r.user_id, r.display_name,
    '', h.inr(r.refund_amount), r.currency, r.reason || '', r.status,
    r.approved_by || '', r.gateway_reference || '', r.notes || '',
  ]));

  const pay = h.addSheet(wb, 'Payouts');
  h.writeTable(pay, [
    'Payout ID', 'Authour ID', 'Author Name', 'Period', 'Chapters Sold', 'Coins Earned',
    'Gross Amount', 'Tax Deduction', 'Platform Commission', 'Net Payable', 'Payment Method',
    'Payment Status', 'Payment Date', 'Reference Number', 'Notes',
  ], payouts.map((r) => [
    r.id, r.author_id, r.display_name, `${r.period_start} → ${r.period_end}`, '', '',
    h.inr(r.gross_amount), 0, h.inr(r.deductions), h.inr(r.net_amount), r.payment_method || '',
    r.status, r.paid_at || '', r.bank_reference || '', r.notes || '',
  ]));

  const byGw = {};
  for (const o of orders) {
    const g = o.gateway || 'mock';
    if (!byGw[g]) byGw[g] = { total: 0, success: 0, failed: 0, amount: 0, fee: 0 };
    byGw[g].total += 1;
    if (o.status === 'success') {
      byGw[g].success += 1;
      byGw[g].amount += Number(o.net_amount);
      byGw[g].fee += Number(o.gateway_fee);
    }
    if (o.status === 'failed') byGw[g].failed += 1;
  }
  const gw = h.addSheet(wb, 'Payment Gateway Summary');
  h.writeTable(gw, ['Gateway', 'Transactions', 'Success', 'Failed', 'Amount', 'Gateway Fee'],
    Object.entries(byGw).map(([k, v]) => [k, v.total, v.success, v.failed, h.inr(v.amount), h.inr(v.fee)]));

  const meta = h.addSheet(wb, 'Metadata');
  h.writeKvSheet(meta, 'Metadata', h.metaPairs({
    reportName: 'Transaction Report', from, to, generatedBy,
  }));

  return wb;
}

async function salesReport({ from, to, generatedBy, h = baseH }) {
  const wb = await h.newWorkbook();
  const p = [];
  const range = h.rangeClause('o.created_at', from, to, p);
  const [orders] = await pool.execute(
    `SELECT o.*, u.display_name
       FROM payment_orders o JOIN users u ON u.id = o.user_id
      WHERE ${range} AND o.status IN ('success','refunded','partially_refunded')
      ORDER BY o.created_at ASC`,
    p,
  );
  const total = orders.reduce((s, o) => s + Number(o.net_amount), 0);
  const buyers = new Set(orders.map((o) => o.user_id));

  const summary = h.addSheet(wb, 'Summary');
  h.writeTable(summary, ['Metric', 'Value'], [
    ['Total Sales', h.inr(total)],
    ['Orders', orders.length],
    ['Unique Buyers', buyers.size],
  ]);

  const ledger = h.addSheet(wb, 'Sales Ledger');
  h.writeTable(ledger, [
    'Sale ID', 'Order ID', 'Transaction ID', 'Date', 'User ID', 'Username', 'Product Category',
    'Product Name', 'Quantity', 'Unit Price', 'Discount', 'Tax', 'Final Amount', 'Currency',
    'Payment Method', 'Platform', 'Status',
  ], orders.map((o) => [
    o.id, o.invoice_no, o.gateway_transaction_id || '', o.created_at, o.user_id, o.display_name,
    o.product_type, o.product_name, o.quantity, h.inr(o.unit_price), h.inr(o.discount_amount),
    h.inr(o.tax_amount), h.inr(o.net_amount), o.currency, o.payment_method, o.platform, o.status,
  ]));

  const byProduct = {};
  for (const o of orders) {
    const k = o.product_name;
    if (!byProduct[k]) byProduct[k] = { units: 0, revenue: 0 };
    byProduct[k].units += Number(o.quantity);
    byProduct[k].revenue += Number(o.net_amount);
  }
  const mon = h.addSheet(wb, 'Monetization Performance');
  h.writeTable(mon, ['Product', 'Units Sold', 'Revenue', 'Avg Selling Price'],
    Object.entries(byProduct).map(([k, v]) => [k, v.units, h.inr(v.revenue), h.inr(v.revenue / (v.units || 1))]));

  const insights = h.addSheet(wb, 'Customer Insights');
  h.writeTable(insights, ['Metric', 'Value'], [
    ['Buyers', buyers.size],
    ['Orders', orders.length],
    ['Avg Order Value', h.inr(orders.length ? total / orders.length : 0)],
  ]);

  const info = h.addSheet(wb, 'Report Information');
  h.writeKvSheet(info, 'Report Information', h.metaPairs({
    reportName: 'Sales Report', from, to, generatedBy,
  }));
  return wb;
}

async function revenueReport({ from, to, generatedBy, h = baseH }) {
  const wb = await h.newWorkbook();
  const p = [];
  const range = h.rangeClause('o.created_at', from, to, p);
  const [orders] = await pool.execute(
    `SELECT * FROM payment_orders o WHERE ${range} AND o.status = 'success' ORDER BY o.created_at ASC`,
    p,
  );
  const rp = [];
  const rRange = h.rangeClause('r.created_at', from, to, rp);
  const [refunds] = await pool.execute(
    `SELECT * FROM payment_refunds r WHERE ${rRange} AND r.status = 'completed'`,
    rp,
  );
  const gross = orders.reduce((s, o) => s + Number(o.net_amount), 0);
  const refundAmt = refunds.reduce((s, r) => s + Number(r.refund_amount), 0);
  const net = gross - refundAmt;

  const summary = h.addSheet(wb, 'Summary');
  h.writeTable(summary, ['Metric', 'Value'], [
    ['Report Period', `${from} — ${to}`],
    ['Gross Revenue', h.inr(gross)],
    ['Refunds', h.inr(refundAmt)],
    ['Net Revenue', h.inr(net)],
    ['Orders', orders.length],
  ]);

  const byDay = {};
  for (const o of orders) {
    const day = new Date(o.created_at).toISOString().slice(0, 10);
    if (!byDay[day]) byDay[day] = { orders: 0, gross: 0 };
    byDay[day].orders += 1;
    byDay[day].gross += Number(o.net_amount);
  }
  const daily = h.addSheet(wb, 'Daily Revenue');
  h.writeTable(daily, ['Date', 'Orders', 'Gross Revenue', 'Refunds', 'Net Revenue', 'Avg Order Value'],
    Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b)).map(([day, v]) => [
      day, v.orders, h.inr(v.gross), 0, h.inr(v.gross), h.inr(v.gross / (v.orders || 1)),
    ]));

  const sources = h.addSheet(wb, 'Revenue Sources');
  h.writeTable(sources, ['Source', 'Orders', 'Revenue', '%'], [
    ['Coin Top-ups', orders.length, h.inr(gross), 1],
  ]);

  const byMethod = {};
  for (const o of orders) {
    const m = o.payment_method || 'mock';
    if (!byMethod[m]) byMethod[m] = { orders: 0, revenue: 0 };
    byMethod[m].orders += 1;
    byMethod[m].revenue += Number(o.net_amount);
  }
  const methods = h.addSheet(wb, 'Payment Methods');
  h.writeTable(methods, ['Payment Method', 'Orders', 'Revenue', 'Percentage'],
    Object.entries(byMethod).map(([k, v]) => [k, v.orders, h.inr(v.revenue), h.pct(v.revenue, gross)]));

  const byProduct = {};
  for (const o of orders) {
    const k = o.product_name;
    if (!byProduct[k]) byProduct[k] = { qty: 0, revenue: 0, category: o.product_type };
    byProduct[k].qty += Number(o.quantity);
    byProduct[k].revenue += Number(o.net_amount);
  }
  const top = h.addSheet(wb, 'Top Selling Products');
  h.writeTable(top, ['Product', 'Category', 'Quantity Sold', 'Revenue'],
    Object.entries(byProduct)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .map(([k, v]) => [k, v.category, v.qty, h.inr(v.revenue)]));

  return wb;
}

async function taxReport({ from, to, generatedBy, h = baseH }) {
  const wb = await h.newWorkbook();
  const p = [];
  const range = h.rangeClause('o.created_at', from, to, p);
  const [rows] = await pool.execute(
    `SELECT t.*, o.invoice_no, o.gateway_order_id, o.user_id, u.display_name, u.email,
            o.product_type, o.product_name, o.quantity, o.net_amount, o.gross_amount,
            o.discount_amount, o.payment_method, o.gateway, o.status AS payment_status,
            o.country, o.state_province, o.currency, o.created_at AS order_created
       FROM tax_lines t
       JOIN payment_orders o ON o.id = t.payment_order_id
       JOIN users u ON u.id = o.user_id
      WHERE ${range}
      ORDER BY o.created_at ASC`,
    p,
  );

  const taxTotal = rows.reduce((s, r) => s + Number(r.tax_amount), 0);
  const salesTotal = rows.reduce((s, r) => s + (Number(r.net_amount) - Number(r.tax_amount)), 0);

  const tx = h.addSheet(wb, 'Tax Transactions');
  h.writeTable(tx, [
    'Tax Record ID', 'Transaction ID', 'Invoice No.', 'Order ID', 'Transaction Date', 'User ID', 'Username',
    'Country', 'State/Province', 'Currency', 'Exchange Rate', 'Product Type', 'Product Name', 'Quantity',
    'Subtotal (Before Tax)', 'Tax Type', 'Tax Rate (%)', 'Tax Amount', 'Total Paid', 'Payment Gateway',
    'Payment Method', 'Payment Status', 'Filing Status', 'Filing Period', 'Created By', 'Remarks',
  ], rows.map((r) => [
    r.id, r.payment_order_id, r.invoice_no, r.gateway_order_id || '', r.order_created, r.user_id, r.display_name,
    r.country, r.state_province || '', r.currency, 1, r.product_type, r.product_name, r.quantity,
    h.inr(Number(r.net_amount) - Number(r.tax_amount)), r.tax_type, Number(r.tax_rate), h.inr(r.tax_amount),
    h.inr(r.net_amount), r.gateway, r.payment_method, r.payment_status, r.filing_status, r.filing_period || '',
    'system', '',
  ]));

  const byMonth = {};
  for (const r of rows) {
    const m = h.monthKey(r.order_created);
    if (!byMonth[m]) byMonth[m] = { sales: 0, tax: 0 };
    byMonth[m].sales += Number(r.net_amount) - Number(r.tax_amount);
    byMonth[m].tax += Number(r.tax_amount);
  }
  const summary = h.addSheet(wb, 'Tax Summary');
  summary.addRow(['Metric', 'Example']);
  summary.addRow(['Total Taxable Sales', h.inr(salesTotal)]);
  summary.addRow(['Total Tax Collected', h.inr(taxTotal)]);
  summary.addRow([]);
  summary.addRow(['Month', 'Sales', 'Tax', 'Total']);
  h.styleHeader(summary.getRow(summary.rowCount));
  for (const [m, v] of Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b))) {
    summary.addRow([m, h.inr(v.sales), h.inr(v.tax), h.inr(v.sales + v.tax)]);
  }

  const byJ = {};
  for (const r of rows) {
    const k = `${r.country}|${r.state_province || ''}|${r.currency}`;
    if (!byJ[k]) byJ[k] = { country: r.country, state: r.state_province || '', currency: r.currency, sales: 0, tax: 0, n: 0 };
    byJ[k].sales += Number(r.net_amount) - Number(r.tax_amount);
    byJ[k].tax += Number(r.tax_amount);
    byJ[k].n += 1;
  }
  const jur = h.addSheet(wb, 'Tax by Jurisdiction');
  h.writeTable(jur, ['Country', 'State', 'Currency', 'Sales', 'Tax', 'Transactions'],
    Object.values(byJ).map((v) => [v.country, v.state, v.currency, h.inr(v.sales), h.inr(v.tax), v.n]));

  const byP = {};
  for (const r of rows) {
    const k = `${r.product_type}|${r.product_name}`;
    if (!byP[k]) byP[k] = { type: r.product_type, name: r.product_name, sales: 0, tax: 0, n: 0 };
    byP[k].sales += Number(r.net_amount) - Number(r.tax_amount);
    byP[k].tax += Number(r.tax_amount);
    byP[k].n += 1;
  }
  const prod = h.addSheet(wb, 'Product Tax Summary');
  h.writeTable(prod, ['Product Type', 'Product Name', 'Sales', 'Tax', 'Transactions'],
    Object.values(byP).map((v) => [v.type, v.name, h.inr(v.sales), h.inr(v.tax), v.n]));

  const meta = h.addSheet(wb, 'Metadata');
  h.writeKvSheet(meta, 'Metadata', h.metaPairs({
    reportName: 'Tax Report', from, to, generatedBy,
  }));
  return wb;
}

async function promotionCoupon({ from, to, generatedBy, h = baseH }) {
  const wb = await h.newWorkbook();
  const p = [];
  const range = h.rangeClause('o.created_at', from, to, p);
  const [rows] = await pool.execute(
    `SELECT cr.*, o.*, u.display_name, c.name AS coupon_name, c.discount_type, c.discount_value AS coupon_discount_value,
            camp.id AS campaign_id, camp.name AS campaign_name, camp.campaign_type
       FROM coupon_redemptions cr
       JOIN payment_orders o ON o.id = cr.payment_order_id
       JOIN users u ON u.id = cr.user_id
       JOIN coupons c ON c.id = cr.coupon_id
       LEFT JOIN campaigns camp ON camp.id = c.campaign_id
      WHERE ${range}
      ORDER BY o.created_at ASC`,
    p,
  );

  const promoTx = h.addSheet(wb, 'Promotion Transactions');
  h.writeTable(promoTx, [
    'Promotion Record ID', 'Transaction ID', 'Invoice No.', 'Order ID', 'Transaction Date', 'User ID', 'Username',
    'Promotion Type', 'Promotion Name', 'Coupon Code', 'Product Type', 'Product Name', 'Original Price',
    'Discount Type', 'Discount Value', 'Discount Amount', 'Final Price', 'Tax Amount', 'Total Paid', 'Currency',
    'Payment Gateway', 'Payment Status', 'Campaign ID', 'Notes',
  ], rows.map((r) => [
    r.id, r.payment_order_id, r.invoice_no, r.gateway_order_id || '', r.created_at, r.user_id, r.display_name,
    'coupon', r.coupon_name, r.coupon_code, r.product_type, r.product_name, h.inr(r.gross_amount),
    r.discount_type, Number(r.coupon_discount_value), h.inr(r.discount_amount),
    h.inr(Number(r.gross_amount) - Number(r.discount_amount)), h.inr(r.tax_amount), h.inr(r.net_amount),
    r.currency, r.gateway, r.status, r.campaign_id || '', '',
  ]));

  const discountTotal = rows.reduce((s, r) => s + Number(r.discount_amount), 0);
  const revenueTotal = rows.reduce((s, r) => s + Number(r.net_amount), 0);
  const summary = h.addSheet(wb, 'Promotion Summary');
  summary.addRow(['KPI', 'Example']);
  summary.addRow(['Promotions Used', rows.length]);
  summary.addRow(['Total Discount Given', h.inr(discountTotal)]);
  summary.addRow(['Revenue After Discount', h.inr(revenueTotal)]);
  summary.addRow([]);
  summary.addRow(['Month', 'Orders', 'Discount', 'Revenue']);
  h.styleHeader(summary.getRow(summary.rowCount));
  const byMonth = {};
  for (const r of rows) {
    const m = h.monthKey(r.created_at);
    if (!byMonth[m]) byMonth[m] = { orders: 0, discount: 0, revenue: 0 };
    byMonth[m].orders += 1;
    byMonth[m].discount += Number(r.discount_amount);
    byMonth[m].revenue += Number(r.net_amount);
  }
  for (const [m, v] of Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b))) {
    summary.addRow([m, v.orders, h.inr(v.discount), h.inr(v.revenue)]);
  }

  const [coupons] = await pool.execute(
    `SELECT c.*,
            COUNT(cr.id) AS usage_count,
            COUNT(DISTINCT cr.user_id) AS unique_users,
            COALESCE(SUM(o.net_amount), 0) AS revenue_generated,
            COALESCE(SUM(cr.discount_amount), 0) AS discount_given
       FROM coupons c
       LEFT JOIN coupon_redemptions cr ON cr.coupon_id = c.id
       LEFT JOIN payment_orders o ON o.id = cr.payment_order_id
      GROUP BY c.id
      ORDER BY c.id DESC`,
  );
  const couponPerf = h.addSheet(wb, 'Coupon Performance');
  h.writeTable(couponPerf, [
    'Coupon Code', 'Coupon Name', 'Discount Type', 'Discount Value', 'Usage Count', 'Unique Users',
    'Revenue Generated', 'Discount Given', 'Avg Discount', 'Start Date', 'End Date', 'Status',
  ], coupons.map((c) => [
    c.code, c.name, c.discount_type, Number(c.discount_value), Number(c.usage_count), Number(c.unique_users),
    h.inr(c.revenue_generated), h.inr(c.discount_given),
    h.inr(Number(c.usage_count) ? Number(c.discount_given) / Number(c.usage_count) : 0),
    c.start_at || '', c.end_at || '', c.status,
  ]));

  const [camps] = await pool.execute(
    `SELECT camp.*,
            COUNT(cr.id) AS orders,
            COALESCE(SUM(o.gross_amount), 0) AS revenue_before,
            COALESCE(SUM(cr.discount_amount), 0) AS discount_given,
            COALESCE(SUM(o.net_amount), 0) AS revenue_after
       FROM campaigns camp
       LEFT JOIN coupons c ON c.campaign_id = camp.id
       LEFT JOIN coupon_redemptions cr ON cr.coupon_id = c.id
       LEFT JOIN payment_orders o ON o.id = cr.payment_order_id
      GROUP BY camp.id
      ORDER BY camp.id DESC`,
  );
  const campPerf = h.addSheet(wb, 'Campaign Performance');
  h.writeTable(campPerf, [
    'Campaign ID', 'Campaign Name', 'Campaign Type', 'Start Date', 'End Date', 'Orders',
    'Revenue Before Discount', 'Discount Given', 'Revenue After Discount', 'Avg Order Value',
    'Conversion Rate', 'Status',
  ], camps.map((c) => [
    c.id, c.name, c.campaign_type, c.start_at || '', c.end_at || '', Number(c.orders),
    h.inr(c.revenue_before), h.inr(c.discount_given), h.inr(c.revenue_after),
    h.inr(Number(c.orders) ? Number(c.revenue_after) / Number(c.orders) : 0),
    '', c.status,
  ]));

  const meta = h.addSheet(wb, 'Metadata');
  h.writeKvSheet(meta, 'Metadata', h.metaPairs({
    reportName: 'Promotion & Coupon Report', from, to, generatedBy,
  }));
  return wb;
}

async function reconciliationReport({ from, to, generatedBy, h = baseH }) {
  const wb = await h.newWorkbook();
  const p = [];
  const range = h.rangeClause('r.created_at', from, to, p);
  const [rows] = await pool.execute(
    `SELECT r.*, o.invoice_no, o.gateway_order_id, o.user_id, u.display_name, o.created_at AS txn_date
       FROM reconciliation_records r
       JOIN payment_orders o ON o.id = r.payment_order_id
       JOIN users u ON u.id = o.user_id
      WHERE ${range}
      ORDER BY r.created_at ASC`,
    p,
  );

  const rec = h.addSheet(wb, 'Reconciliation Records');
  h.writeTable(rec, [
    'Reconciliation ID', 'Transaction ID', 'Order ID', 'Invoice No.', 'Transaction Date', 'Settlement Date',
    'User ID', 'Username', 'Payment Gateway', 'Gateway Transaction ID', 'Gateway Settlement ID', 'Currency',
    'Gross Amount', 'Gateway Fee', 'Tax on Gateway Fee', 'Net Settlement', 'Expected Settlement',
    'Settlement Difference', 'Reconciliation Status', 'Settlement Status', 'Reconciled By', 'Reconciled On', 'Notes',
  ], rows.map((r) => [
    r.id, r.payment_order_id, r.gateway_order_id || '', r.invoice_no, r.txn_date, r.settlement_date || '',
    r.user_id, r.display_name, r.gateway, r.gateway_transaction_id || '', r.gateway_settlement_id || '', r.currency,
    h.inr(r.gross_amount), h.inr(r.gateway_fee), h.inr(r.tax_on_gateway_fee), h.inr(r.net_settlement),
    h.inr(r.expected_settlement), h.inr(r.settlement_difference), r.reconciliation_status, r.settlement_status,
    r.reconciled_by || '', r.reconciled_on || '', r.notes || '',
  ]));

  const gross = rows.reduce((s, r) => s + Number(r.gross_amount), 0);
  const net = rows.reduce((s, r) => s + Number(r.net_settlement), 0);
  const fees = rows.reduce((s, r) => s + Number(r.gateway_fee), 0);
  const pending = rows.filter((r) => r.settlement_status === 'pending').length;
  const summary = h.addSheet(wb, 'Reconciliation Summary');
  summary.addRow(['KPI', 'Example']);
  summary.addRow(['Total Transactions', rows.length]);
  summary.addRow(['Total Gross Amount', h.inr(gross)]);
  summary.addRow(['Total Net Settlement', h.inr(net)]);
  summary.addRow(['Total Fees', h.inr(fees)]);
  summary.addRow(['Pending Settlements', pending]);
  summary.addRow([]);
  summary.addRow(['Month', 'Gross', 'Net', 'Fees', 'Pending']);
  h.styleHeader(summary.getRow(summary.rowCount));
  const byMonth = {};
  for (const r of rows) {
    const m = h.monthKey(r.created_at);
    if (!byMonth[m]) byMonth[m] = { gross: 0, net: 0, fees: 0, pending: 0 };
    byMonth[m].gross += Number(r.gross_amount);
    byMonth[m].net += Number(r.net_settlement);
    byMonth[m].fees += Number(r.gateway_fee);
    if (r.settlement_status === 'pending') byMonth[m].pending += 1;
  }
  for (const [m, v] of Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b))) {
    summary.addRow([m, h.inr(v.gross), h.inr(v.net), h.inr(v.fees), v.pending]);
  }

  const byGw = {};
  for (const r of rows) {
    const g = r.gateway || 'mock';
    if (!byGw[g]) byGw[g] = { n: 0, gross: 0, fees: 0, net: 0, pending: 0, failed: 0, matched: 0 };
    byGw[g].n += 1;
    byGw[g].gross += Number(r.gross_amount);
    byGw[g].fees += Number(r.gateway_fee);
    byGw[g].net += Number(r.net_settlement);
    if (r.settlement_status === 'pending') byGw[g].pending += 1;
    if (r.settlement_status === 'failed') byGw[g].failed += 1;
    if (r.reconciliation_status === 'matched') byGw[g].matched += 1;
  }
  const gw = h.addSheet(wb, 'Gateway Settlement Summary');
  h.writeTable(gw, [
    'Gateway', 'Transactions', 'Gross Amount', 'Gateway Fees', 'Net Settlement',
    'Pending Settlements', 'Failed Settlements', 'Average Fee', 'Reconciliation Rate',
  ], Object.entries(byGw).map(([k, v]) => [
    k, v.n, h.inr(v.gross), h.inr(v.fees), h.inr(v.net), v.pending, v.failed,
    h.inr(v.n ? v.fees / v.n : 0), h.pct(v.matched, v.n),
  ]));

  const exceptions = rows.filter((r) => r.reconciliation_status === 'mismatch' || r.reconciliation_status === 'pending');
  const ex = h.addSheet(wb, 'Exceptions & Mismatches');
  h.writeTable(ex, [
    'Transaction ID', 'Gateway', 'Issue Type', 'Expected Amount', 'Actual Amount', 'Difference',
    'Status', 'Assigned To', 'Resolution Date', 'Resolution Notes',
  ], exceptions.map((r) => [
    r.payment_order_id, r.gateway, r.reconciliation_status, h.inr(r.expected_settlement),
    h.inr(r.net_settlement), h.inr(r.settlement_difference), r.reconciliation_status,
    r.reconciled_by || '', r.reconciled_on || '', r.notes || '',
  ]));

  const meta = h.addSheet(wb, 'Metadata');
  h.writeKvSheet(meta, 'Metadata', h.metaPairs({
    reportName: 'Reconciliation Report', from, to, generatedBy,
  }));
  return wb;
}

async function authorPayoutReport({ from, to, generatedBy, h = baseH }) {
  const wb = await h.newWorkbook();
  const p = [];
  const range = h.rangeClause('ap.created_at', from, to, p);
  const [payouts] = await pool.execute(
    `SELECT ap.*, u.display_name
       FROM author_payouts ap JOIN users u ON u.id = ap.author_id
      WHERE ${range}
      ORDER BY ap.created_at ASC`,
    p,
  );
  const lp = [];
  const lRange = h.rangeClause('rl.created_at', from, to, lp);
  const [lines] = await pool.execute(
    `SELECT rl.*, u.display_name, b.title AS book_title
       FROM author_royalty_lines rl
       JOIN users u ON u.id = rl.author_id
       JOIN books b ON b.id = rl.book_id
      WHERE ${lRange}
      ORDER BY rl.created_at ASC`,
    lp,
  );

  const paid = payouts.filter((p0) => p0.status === 'paid');
  const summary = h.addSheet(wb, 'Summary');
  h.writeTable(summary, ['Metric', 'Value'], [
    ['Total Authors Paid', new Set(paid.map((p0) => p0.author_id)).size],
    ['Total Payouts', h.inr(paid.reduce((s, p0) => s + Number(p0.net_amount), 0))],
    ['Draft Payouts', payouts.filter((p0) => p0.status === 'draft').length],
    ['Approved Payouts', payouts.filter((p0) => p0.status === 'approved').length],
  ]);
  summary.addRow([]);
  summary.addRow(['Status', 'Count', 'Amount']);
  h.styleHeader(summary.getRow(summary.rowCount));
  for (const status of ['draft', 'approved', 'paid', 'cancelled']) {
    const subset = payouts.filter((p0) => p0.status === status);
    summary.addRow([status, subset.length, h.inr(subset.reduce((s, p0) => s + Number(p0.net_amount), 0))]);
  }

  const ledger = h.addSheet(wb, 'Payout Ledger');
  h.writeTable(ledger, [
    'Payout ID', 'Author ID', 'Pen Name', 'Agreement Type', 'Payout Type', 'Payment Period',
    'Gross Amount', 'Deductions', 'Net Amount', 'Currency', 'Status', 'Payment Method',
    'Bank Reference', 'Created Date', 'Paid Date', 'Approved By', 'Notes',
  ], payouts.map((r) => [
    r.id, r.author_id, r.display_name, r.agreement_type, r.payout_type,
    `${r.period_start} → ${r.period_end}`, h.inr(r.gross_amount), h.inr(r.deductions), h.inr(r.net_amount),
    r.currency, r.status, r.payment_method || '', r.bank_reference || '', r.created_at, r.paid_at || '',
    r.approved_by || '', r.notes || '',
  ]));

  const royalty = h.addSheet(wb, 'Royalty Breakdown');
  h.writeTable(royalty, [
    'Royalty ID', 'Author', 'Novel', 'Reporting Period', 'Gross Novel Revenue', 'Platform Deductions',
    'Net Revenue', 'Royalty %', 'Royalty Amount', 'Settlement Status', 'Available Date', 'Paid Date',
  ], lines.map((r) => [
    r.id, r.display_name, r.book_title, `${r.period_start} → ${r.period_end}`,
    h.inr(r.gross_novel_revenue), h.inr(r.platform_deductions), h.inr(r.net_revenue),
    Number(r.royalty_percent), h.inr(r.royalty_amount), r.settlement_status,
    r.available_at || '', r.paid_at || '',
  ]));

  const contract = h.addSheet(wb, 'Contract Payments');
  h.writeTable(contract, [
    'Contract Payment ID', 'Author', 'Agreement Type', 'Novel', 'Payment Basis', 'Units', 'Rate',
    'Gross Amount', 'Status', 'Payment Date', 'Bank Reference', 'Notes',
  ], []);

  const info = h.addSheet(wb, 'Report Information');
  h.writeKvSheet(info, 'Report Information', h.metaPairs({
    reportName: 'Author Payout Report', from, to, generatedBy,
  }));
  return wb;
}

const HIGH_RISK = new Set([
  'user.tokens_add', 'user.tokens_deduct', 'finance.refund', 'finance.payout_update',
  'finance.reconciliation_update', 'user.suspend',
]);

async function financialAudit({ from, to, generatedBy, h = baseH }) {
  const wb = await h.newWorkbook();
  const p = [];
  const range = h.rangeClause('a.created_at', from, to, p);
  const [rows] = await pool.execute(
    `SELECT a.* FROM admin_audit_log a WHERE ${range} ORDER BY a.created_at ASC`,
    p,
  );

  const log = h.addSheet(wb, 'Financial Audit Log');
  h.writeTable(log, [
    'Audit ID', 'Date & Time', 'User Type', 'User ID', 'Username', 'Action Category', 'Action', 'Module',
    'Record ID', 'Previous Value', 'New Value', 'Difference', 'Reason', 'IP Address', 'Device', 'Session ID',
    'Status', 'Approval Required', 'Approved By', 'Approval Date', 'Notes',
  ], rows.map((r) => [
    r.id, r.created_at, r.actor_role, r.actor_id, r.actor_email,
    String(r.action || '').split('.')[0], r.action, r.target_type || '',
    r.target_id || '', '', '', '', r.summary, '', '', '',
    'recorded', HIGH_RISK.has(r.action) ? 'Yes' : 'No', '', '', r.summary,
  ]));

  const byMonth = {};
  for (const r of rows) {
    const m = h.monthKey(r.created_at);
    if (!byMonth[m]) byMonth[m] = { actions: 0, manual: 0, automatic: 0, high: 0 };
    byMonth[m].actions += 1;
    byMonth[m].manual += 1;
    if (HIGH_RISK.has(r.action)) byMonth[m].high += 1;
  }
  const summary = h.addSheet(wb, 'Audit Summary');
  summary.addRow(['KPI', 'Example']);
  summary.addRow(['Total Financial Actions', rows.length]);
  summary.addRow(['High Risk Actions', rows.filter((r) => HIGH_RISK.has(r.action)).length]);
  summary.addRow([]);
  summary.addRow(['Month', 'Actions', 'Manual', 'Automatic', 'High Risk']);
  h.styleHeader(summary.getRow(summary.rowCount));
  for (const [m, v] of Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b))) {
    summary.addRow([m, v.actions, v.manual, v.automatic, v.high]);
  }

  const byAdmin = {};
  for (const r of rows) {
    const k = r.actor_id;
    if (!byAdmin[k]) {
      byAdmin[k] = {
        id: r.actor_id, username: r.actor_email, total: 0, payments: 0, payouts: 0,
        wallet: 0, coupons: 0, subs: 0, high: 0, last: r.created_at,
      };
    }
    const a = byAdmin[k];
    a.total += 1;
    if (String(r.action).includes('refund') || String(r.action).includes('payment')) a.payments += 1;
    if (String(r.action).includes('payout')) a.payouts += 1;
    if (String(r.action).includes('tokens')) a.wallet += 1;
    if (String(r.action).includes('coupon') || String(r.action).includes('campaign')) a.coupons += 1;
    if (HIGH_RISK.has(r.action)) a.high += 1;
    if (new Date(r.created_at) > new Date(a.last)) a.last = r.created_at;
  }
  const admin = h.addSheet(wb, 'Admin Activity Summary');
  h.writeTable(admin, [
    'Admin ID', 'Username', 'Total Actions', 'Payments Modified', 'Payouts Approved',
    'Wallet Adjustments', 'Coupon Changes', 'Subscription Changes', 'High-Risk Actions', 'Last Activity',
  ], Object.values(byAdmin).map((a) => [
    a.id, a.username, a.total, a.payments, a.payouts, a.wallet, a.coupons, a.subs, a.high, a.last,
  ]));

  const high = h.addSheet(wb, 'High-Risk Activities');
  h.writeTable(high, [
    'Audit ID', 'Risk Level', 'Action Category', 'Action', 'Staff Member', 'Record ID',
    'Before Value', 'After Value', 'Reason', 'Approved By', 'Approval Status', 'Resolution Notes',
  ], rows.filter((r) => HIGH_RISK.has(r.action)).map((r) => [
    r.id, 'high', String(r.action).split('.')[0], r.action, r.actor_email, r.target_id || '',
    '', '', r.summary, '', 'n/a', '',
  ]));

  const meta = h.addSheet(wb, 'Metadata');
  h.writeKvSheet(meta, 'Metadata', h.metaPairs({
    reportName: 'Financial Audit Report', from, to, generatedBy,
  }));
  return wb;
}

const GENERATORS = {
  'wallet-coin': walletCoin,
  transaction: transactionReport,
  sales: salesReport,
  revenue: revenueReport,
  tax: taxReport,
  'promotion-coupon': promotionCoupon,
  reconciliation: reconciliationReport,
  'author-payout': authorPayoutReport,
  'financial-audit': financialAudit,
};

async function generate(type, { from, to, generatedBy, tabs, fields }) {
  const fn = GENERATORS[type];
  if (!fn) {
    const err = new Error('Unknown report type');
    err.status = 404;
    throw err;
  }
  const fromD = baseH.dateOnly(from);
  const toD = baseH.dateOnly(to);
  if (!fromD || !toD) {
    const err = new Error('Invalid date range');
    err.status = 400;
    throw err;
  }
  const filters = parseReportFilters(type, { tabs, fields });
  const reportH = createReportHelpers(type, filters);
  const wb = await fn({ from: fromD, to: toD, generatedBy, h: reportH });
  const buffer = await baseH.toBuffer(wb);
  const filename = `${type}-report_${fromD}_to_${toD}.xlsx`;
  return {
    buffer,
    filename,
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
}

const { preview } = require('./preview');
const { generatePdf } = require('./pdf');

module.exports = { catalog, generate, preview, generatePdf };
