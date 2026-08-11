'use strict';

const pool = require('../../db/pool');
const baseH = require('./helpers');
const { getReportSchema } = require('./schemas');
const { parseReportFilters } = require('./filters');
const { formatInr, formatPct, formatPeriod, daysInRange, sourceLabel } = require('./format');

function metric(label, value, format = 'text') {
  return { label, value, format };
}

function section(id, title, { chart, table, note } = {}) {
  return { id, title, chart: chart || null, table: table || null, note: note || null };
}

function tableDef(columns, rows) {
  return { columns, rows };
}

function filterPreview(preview, filters) {
  const { tabs, fields } = filters;
  if (!tabs?.size && !fields?.size) return preview;

  const sections = (preview.sections || []).filter((s) => {
    if (!tabs?.size) return true;
    return tabs.has(s.id);
  }).map((s) => {
    if (!fields?.get(s.id)?.size || !s.table) return s;
    const selected = fields.get(s.id);
    const cols = s.table.columns.filter((c) => selected.has(c.id));
    const rows = s.table.rows.map((row) => {
      const out = {};
      for (const col of cols) out[col.key] = row[col.key];
      return out;
    });
    return { ...s, table: { columns: cols, rows } };
  });

  return { ...preview, sections };
}

async function previewRevenue(from, to, generatedBy) {
  const p = [];
  const range = baseH.rangeClause('o.created_at', from, to, p);
  const [orders] = await pool.execute(
    `SELECT * FROM payment_orders o WHERE ${range} AND o.status = 'success' ORDER BY o.created_at ASC`,
    p,
  );
  const rp = [];
  const rRange = baseH.rangeClause('r.created_at', from, to, rp);
  const [refunds] = await pool.execute(
    `SELECT * FROM payment_refunds r WHERE ${rRange} AND r.status = 'completed'`,
    rp,
  );

  const gross = orders.reduce((s, o) => s + Number(o.net_amount), 0);
  const refundAmt = refunds.reduce((s, r) => s + Number(r.refund_amount), 0);
  const net = gross - refundAmt;
  const orderCount = orders.length;
  const aov = orderCount ? gross / orderCount : 0;

  const bySource = {};
  for (const o of orders) {
    const key = sourceLabel(o.product_type);
    if (!bySource[key]) bySource[key] = { revenue: 0, orders: 0 };
    bySource[key].revenue += Number(o.net_amount);
    bySource[key].orders += 1;
  }
  const sourceRows = Object.entries(bySource)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .map(([label, v]) => ({
      source: label,
      revenue: v.revenue,
      revenueFmt: formatInr(v.revenue),
      pct: gross ? v.revenue / gross : 0,
      pctFmt: formatPct(gross ? v.revenue / gross : 0),
    }));

  const useMonthly = daysInRange(from, to) > 90;
  const byPeriod = {};
  for (const o of orders) {
    const key = useMonthly
      ? baseH.monthKey(o.created_at)
      : new Date(o.created_at).toISOString().slice(0, 10);
    if (!byPeriod[key]) byPeriod[key] = { orders: 0, gross: 0, refunds: 0 };
    byPeriod[key].orders += 1;
    byPeriod[key].gross += Number(o.net_amount);
  }
  for (const r of refunds) {
    const key = useMonthly
      ? baseH.monthKey(r.created_at)
      : new Date(r.created_at).toISOString().slice(0, 10);
    if (!byPeriod[key]) byPeriod[key] = { orders: 0, gross: 0, refunds: 0 };
    byPeriod[key].refunds += Number(r.refund_amount);
  }
  const periodRows = Object.entries(byPeriod)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({
      date,
      orders: v.orders,
      gross: v.gross,
      grossFmt: formatInr(v.gross),
      refunds: v.refunds,
      refundsFmt: formatInr(v.refunds),
      net: v.gross - v.refunds,
      netFmt: formatInr(v.gross - v.refunds),
    }));

  const byMethod = {};
  for (const o of orders) {
    const m = o.payment_method || 'Other';
    if (!byMethod[m]) byMethod[m] = { orders: 0, revenue: 0 };
    byMethod[m].orders += 1;
    byMethod[m].revenue += Number(o.net_amount);
  }
  const methodRows = Object.entries(byMethod)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .map(([method, v]) => ({
      method,
      orders: v.orders,
      revenue: v.revenue,
      revenueFmt: formatInr(v.revenue),
    }));

  const byProduct = {};
  for (const o of orders) {
    const k = o.product_name;
    if (!byProduct[k]) byProduct[k] = { qty: 0, revenue: 0, category: o.product_type };
    byProduct[k].qty += Number(o.quantity);
    byProduct[k].revenue += Number(o.net_amount);
  }
  const productRows = Object.entries(byProduct)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 10)
    .map(([name, v]) => ({
      product: name,
      category: sourceLabel(v.category),
      quantity: v.qty,
      revenue: v.revenue,
      revenueFmt: formatInr(v.revenue),
    }));

  return {
    reportId: 'revenue',
    title: 'Revenue Report',
    brand: 'Novel Centre',
    period: { from, to, label: formatPeriod(from, to) },
    generatedAt: new Date().toISOString(),
    generatedBy,
    executiveSummary: [
      metric('Gross Revenue', gross, 'currency'),
      metric('Refunds', refundAmt, 'currency'),
      metric('Net Revenue', net, 'currency'),
      metric('Orders', orderCount, 'number'),
      metric('Average Order Value', aov, 'currency'),
    ],
    sections: [
      section('revenue-sources', 'Revenue by Source', {
        chart: { type: 'bar', labelKey: 'source', valueKey: 'revenue', items: sourceRows },
        table: tableDef(
          [
            { id: 'source', key: 'source', label: 'Source' },
            { id: 'revenue', key: 'revenueFmt', label: 'Revenue', align: 'right' },
            { id: 'pct', key: 'pctFmt', label: '%', align: 'right' },
          ],
          sourceRows,
        ),
      }),
      section('daily-revenue', useMonthly ? 'Monthly Revenue' : 'Daily Revenue', {
        chart: { type: 'line', labelKey: 'date', valueKey: 'net', items: periodRows.slice(-14) },
        table: tableDef(
          [
            { id: 'date', key: 'date', label: useMonthly ? 'Month' : 'Date' },
            { id: 'orders', key: 'orders', label: 'Orders', align: 'right' },
            { id: 'gross', key: 'grossFmt', label: 'Gross', align: 'right' },
            { id: 'refunds', key: 'refundsFmt', label: 'Refunds', align: 'right' },
            { id: 'net', key: 'netFmt', label: 'Net', align: 'right' },
          ],
          periodRows,
        ),
        note: useMonthly
          ? 'Range exceeds 90 days — revenue is summarized by month.'
          : null,
      }),
      section('payment-methods', 'Payment Method Breakdown', {
        chart: { type: 'bar', labelKey: 'method', valueKey: 'revenue', items: methodRows },
        table: tableDef(
          [
            { id: 'paymentMethod', key: 'method', label: 'Method' },
            { id: 'orders', key: 'orders', label: 'Orders', align: 'right' },
            { id: 'revenue', key: 'revenueFmt', label: 'Revenue', align: 'right' },
          ],
          methodRows,
        ),
      }),
      section('top-selling-products', 'Top Selling Products', {
        table: tableDef(
          [
            { id: 'product', key: 'product', label: 'Product' },
            { id: 'category', key: 'category', label: 'Category' },
            { id: 'quantitySold', key: 'quantity', label: 'Qty', align: 'right' },
            { id: 'revenue', key: 'revenueFmt', label: 'Revenue', align: 'right' },
          ],
          productRows,
        ),
      }),
    ],
  };
}

async function previewTransaction(from, to, generatedBy) {
  const p = [];
  const range = baseH.rangeClause('o.created_at', from, to, p);
  const [orders] = await pool.execute(
    `SELECT o.* FROM payment_orders o WHERE ${range} ORDER BY o.created_at ASC`, p,
  );
  const success = orders.filter((o) => o.status === 'success');
  const failed = orders.filter((o) => o.status === 'failed');
  const totalAmt = success.reduce((s, o) => s + Number(o.net_amount), 0);

  const byGw = {};
  for (const o of orders) {
    const g = o.gateway || 'mock';
    if (!byGw[g]) byGw[g] = { total: 0, success: 0, amount: 0 };
    byGw[g].total += 1;
    if (o.status === 'success') {
      byGw[g].success += 1;
      byGw[g].amount += Number(o.net_amount);
    }
  }
  const gwRows = Object.entries(byGw).map(([gateway, v]) => ({
    gateway,
    transactions: v.total,
    success: v.success,
    amount: v.amount,
    amountFmt: formatInr(v.amount),
  }));

  return {
    reportId: 'transaction',
    title: 'Transaction Report',
    brand: 'Novel Centre',
    period: { from, to, label: formatPeriod(from, to) },
    generatedAt: new Date().toISOString(),
    generatedBy,
    executiveSummary: [
      metric('Total Transactions', orders.length, 'number'),
      metric('Successful', success.length, 'number'),
      metric('Failed', failed.length, 'number'),
      metric('Successful Amount', totalAmt, 'currency'),
    ],
    sections: [
      section('payment-gateway-summary', 'Payment Gateway Summary', {
        chart: { type: 'bar', labelKey: 'gateway', valueKey: 'amount', items: gwRows },
        table: tableDef(
          [
            { id: 'gateway', key: 'gateway', label: 'Gateway' },
            { id: 'transactions', key: 'transactions', label: 'Transactions', align: 'right' },
            { id: 'success', key: 'success', label: 'Success', align: 'right' },
            { id: 'amount', key: 'amountFmt', label: 'Amount', align: 'right' },
          ],
          gwRows,
        ),
      }),
    ],
  };
}

async function previewSales(from, to, generatedBy) {
  const p = [];
  const range = baseH.rangeClause('o.created_at', from, to, p);
  const [orders] = await pool.execute(
    `SELECT o.* FROM payment_orders o WHERE ${range} AND o.status IN ('success','refunded','partially_refunded') ORDER BY o.created_at ASC`,
    p,
  );
  const total = orders.reduce((s, o) => s + Number(o.net_amount), 0);
  const buyers = new Set(orders.map((o) => o.user_id));

  const byProduct = {};
  for (const o of orders) {
    const k = o.product_name;
    if (!byProduct[k]) byProduct[k] = { units: 0, revenue: 0 };
    byProduct[k].units += Number(o.quantity);
    byProduct[k].revenue += Number(o.net_amount);
  }
  const productRows = Object.entries(byProduct)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 10)
    .map(([product, v]) => ({
      product,
      units: v.units,
      revenue: v.revenue,
      revenueFmt: formatInr(v.revenue),
    }));

  return {
    reportId: 'sales',
    title: 'Sales Report',
    brand: 'Novel Centre',
    period: { from, to, label: formatPeriod(from, to) },
    generatedAt: new Date().toISOString(),
    generatedBy,
    executiveSummary: [
      metric('Total Sales', total, 'currency'),
      metric('Orders', orders.length, 'number'),
      metric('Unique Buyers', buyers.size, 'number'),
      metric('Avg Order Value', orders.length ? total / orders.length : 0, 'currency'),
    ],
    sections: [
      section('monetization-performance', 'Monetization Performance', {
        chart: { type: 'bar', labelKey: 'product', valueKey: 'revenue', items: productRows },
        table: tableDef(
          [
            { id: 'product', key: 'product', label: 'Product' },
            { id: 'unitsSold', key: 'units', label: 'Units', align: 'right' },
            { id: 'revenue', key: 'revenueFmt', label: 'Revenue', align: 'right' },
          ],
          productRows,
        ),
      }),
    ],
  };
}

async function previewWalletCoin(from, to, generatedBy) {
  const params = [];
  const range = baseH.rangeClause('t.created_at', from, to, params);
  const [ledger] = await pool.execute(
    `SELECT t.* FROM transactions t WHERE ${range} ORDER BY t.created_at ASC`, params,
  );
  const [wallets] = await pool.execute(`SELECT w.* FROM wallets w ORDER BY w.user_id`);

  let purchasedIn = 0;
  let unlockOut = 0;
  for (const r of ledger) {
    const d = Number(r.tokens_delta);
    if (r.type === 'purchase') purchasedIn += d;
    else if (r.type === 'unlock') unlockOut += Math.abs(d);
  }
  const outstanding = wallets.reduce((s, w) => s + Number(w.balance), 0);

  return {
    reportId: 'wallet-coin',
    title: 'Wallet & Coin Report',
    brand: 'Novel Centre',
    period: { from, to, label: formatPeriod(from, to) },
    generatedAt: new Date().toISOString(),
    generatedBy,
    executiveSummary: [
      metric('Purchased Coins Issued', purchasedIn, 'number'),
      metric('Coins Spent (Unlocks)', unlockOut, 'number'),
      metric('Outstanding Liability', outstanding, 'number'),
      metric('Ledger Entries', ledger.length, 'number'),
    ],
    sections: [
      section('coin-sources-usage', 'Coin Sources & Usage', {
        chart: {
          type: 'bar',
          labelKey: 'source',
          valueKey: 'coins',
          items: [
            { source: 'Purchases', coins: purchasedIn },
            { source: 'Unlocks', coins: unlockOut },
          ],
        },
        table: tableDef(
          [
            { id: 'source', key: 'source', label: 'Source' },
            { id: 'coins', key: 'coins', label: 'Coins', align: 'right' },
          ],
          [
            { source: 'Coin Packs', coins: purchasedIn },
            { source: 'Chapter Unlocks', coins: unlockOut },
          ],
        ),
      }),
    ],
  };
}

async function previewFinancialAudit(from, to, generatedBy) {
  const p = [];
  const range = baseH.rangeClause('a.created_at', from, to, p);
  const [rows] = await pool.execute(
    `SELECT a.* FROM admin_audit_log a WHERE ${range} ORDER BY a.created_at ASC`, p,
  );
  const HIGH_RISK = new Set([
    'user.tokens_add', 'user.tokens_deduct', 'finance.refund', 'finance.payout_update',
    'finance.reconciliation_update', 'user.suspend',
  ]);
  const highCount = rows.filter((r) => HIGH_RISK.has(r.action)).length;

  const byCat = {};
  for (const r of rows) {
    const cat = String(r.action || '').split('.')[0] || 'other';
    byCat[cat] = (byCat[cat] || 0) + 1;
  }
  const catRows = Object.entries(byCat)
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => ({ category, count }));

  return {
    reportId: 'financial-audit',
    title: 'Financial Audit Report',
    brand: 'Novel Centre',
    period: { from, to, label: formatPeriod(from, to) },
    generatedAt: new Date().toISOString(),
    generatedBy,
    executiveSummary: [
      metric('Total Actions', rows.length, 'number'),
      metric('High-Risk Actions', highCount, 'number'),
      metric('Unique Admins', new Set(rows.map((r) => r.actor_id)).size, 'number'),
    ],
    sections: [
      section('admin-activity-summary', 'Activity by Category', {
        chart: { type: 'bar', labelKey: 'category', valueKey: 'count', items: catRows },
        table: tableDef(
          [
            { id: 'actionCategory', key: 'category', label: 'Category' },
            { id: 'count', key: 'count', label: 'Actions', align: 'right' },
          ],
          catRows,
        ),
      }),
    ],
  };
}

async function previewGeneric(reportId, title, from, to, generatedBy, summaryMetrics, sections) {
  return {
    reportId,
    title,
    brand: 'Novel Centre',
    period: { from, to, label: formatPeriod(from, to) },
    generatedAt: new Date().toISOString(),
    generatedBy,
    executiveSummary: summaryMetrics,
    sections,
  };
}

const PREVIEWERS = {
  revenue: previewRevenue,
  transaction: previewTransaction,
  sales: previewSales,
  'wallet-coin': previewWalletCoin,
  'financial-audit': previewFinancialAudit,
  tax: async (from, to, generatedBy) => {
    const p = [];
    const range = baseH.rangeClause('o.created_at', from, to, p);
    const [rows] = await pool.execute(
      `SELECT t.tax_amount, o.net_amount, o.created_at FROM tax_lines t
       JOIN payment_orders o ON o.id = t.payment_order_id WHERE ${range}`, p,
    );
    const taxTotal = rows.reduce((s, r) => s + Number(r.tax_amount), 0);
    const salesTotal = rows.reduce((s, r) => s + (Number(r.net_amount) - Number(r.tax_amount)), 0);
    return previewGeneric('tax', 'Tax Report', from, to, generatedBy, [
      metric('Taxable Sales', salesTotal, 'currency'),
      metric('Tax Collected', taxTotal, 'currency'),
      metric('Tax Lines', rows.length, 'number'),
    ], []);
  },
  'promotion-coupon': async (from, to, generatedBy) => {
    const p = [];
    const range = baseH.rangeClause('o.created_at', from, to, p);
    const [rows] = await pool.execute(
      `SELECT cr.discount_amount, o.net_amount FROM coupon_redemptions cr
       JOIN payment_orders o ON o.id = cr.payment_order_id WHERE ${range}`, p,
    );
    const discount = rows.reduce((s, r) => s + Number(r.discount_amount), 0);
    const revenue = rows.reduce((s, r) => s + Number(r.net_amount), 0);
    return previewGeneric('promotion-coupon', 'Promotion & Coupon Report', from, to, generatedBy, [
      metric('Promotions Used', rows.length, 'number'),
      metric('Total Discount', discount, 'currency'),
      metric('Revenue After Discount', revenue, 'currency'),
    ], []);
  },
  reconciliation: async (from, to, generatedBy) => {
    const p = [];
    const range = baseH.rangeClause('r.created_at', from, to, p);
    const [rows] = await pool.execute(
      `SELECT r.gross_amount, r.net_settlement, r.gateway_fee, r.reconciliation_status
       FROM reconciliation_records r WHERE ${range}`, p,
    );
    const gross = rows.reduce((s, r) => s + Number(r.gross_amount), 0);
    const net = rows.reduce((s, r) => s + Number(r.net_settlement), 0);
    const mismatches = rows.filter((r) => r.reconciliation_status === 'mismatch').length;
    return previewGeneric('reconciliation', 'Reconciliation Report', from, to, generatedBy, [
      metric('Records', rows.length, 'number'),
      metric('Gross Amount', gross, 'currency'),
      metric('Net Settlement', net, 'currency'),
      metric('Mismatches', mismatches, 'number'),
    ], []);
  },
  'author-payout': async (from, to, generatedBy) => {
    const p = [];
    const range = baseH.rangeClause('ap.created_at', from, to, p);
    const [payouts] = await pool.execute(
      `SELECT ap.* FROM author_payouts ap WHERE ${range}`, p,
    );
    const paid = payouts.filter((p0) => p0.status === 'paid');
    const totalPaid = paid.reduce((s, p0) => s + Number(p0.net_amount), 0);
    return previewGeneric('author-payout', 'Author Payout Report', from, to, generatedBy, [
      metric('Authors Paid', new Set(paid.map((p0) => p0.author_id)).size, 'number'),
      metric('Total Payouts', totalPaid, 'currency'),
      metric('Payout Records', payouts.length, 'number'),
    ], []);
  },
};

async function preview(type, { from, to, generatedBy, tabs, fields }) {
  const fromD = baseH.dateOnly(from);
  const toD = baseH.dateOnly(to);
  if (!fromD || !toD) {
    const err = new Error('Invalid date range');
    err.status = 400;
    throw err;
  }
  const fn = PREVIEWERS[type];
  if (!fn) {
    const err = new Error('Unknown report type');
    err.status = 404;
    throw err;
  }
  const filters = parseReportFilters(type, { tabs, fields });
  const raw = await fn(fromD, toD, generatedBy || 'Admin');
  const filtered = filterPreview(raw, filters);

  if (filters.tabs?.size && !filtered.sections.length) {
    filtered.sections = (raw.sections || []).filter((s) => filters.tabs.has(s.id));
  }

  return {
    ...filtered,
    meta: {
      reportType: type,
      schema: getReportSchema(type),
      selection: {
        tabs: filters.tabs ? [...filters.tabs] : null,
        fields: filters.fields
          ? Object.fromEntries([...filters.fields.entries()].map(([k, v]) => [k, [...v]]))
          : null,
      },
    },
  };
}

function formatMetricValue(m) {
  if (m.format === 'currency') return formatInr(m.value);
  if (m.format === 'number') return Number(m.value || 0).toLocaleString('en-IN');
  return String(m.value ?? '');
}

module.exports = { preview, formatMetricValue };
