'use strict';

function formatInr(n) {
  const v = Number(n) || 0;
  // U+20B9 Rupee Sign — keep as escape so source encoding cannot strip it
  return `\u20B9${v.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function formatPct(n) {
  const v = Number(n) || 0;
  return `${Math.round(v * 100)}%`;
}

function formatPeriod(from, to) {
  const f = new Date(`${from}T00:00:00Z`);
  const t = new Date(`${to}T00:00:00Z`);
  const fStr = f.toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' });
  const tStr = t.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  return `${fStr} – ${tStr}`;
}

function formatGeneratedDate(d = new Date()) {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysInRange(from, to) {
  const f = new Date(`${from}T00:00:00Z`);
  const t = new Date(`${to}T00:00:00Z`);
  return Math.max(1, Math.round((t - f) / 86400000) + 1);
}

function sourceLabel(productType) {
  const map = {
    coin_pack: 'Coin Top-ups',
    membership: 'Memberships',
    subscription: 'Subscriptions',
  };
  return map[productType] || String(productType || 'Other').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

module.exports = {
  formatInr,
  formatPct,
  formatPeriod,
  formatGeneratedDate,
  daysInRange,
  sourceLabel,
};
