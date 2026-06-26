'use strict';

/**
 * Shared WebNovel → Novel Centre home seeding.
 *
 * - Accepts JSON shaped like webnovel-books.json (internal keys), normalize-webnovel
 *   output (weekly_book, recommended, …), or scrape output (weekly, featured, …).
 * - Dedupes by WebNovel book id / URL.
 * - Maps every section to the `book_tags.tag` values consumed by
 *   `home.service.js`, including cross-tagging so Recommended + New Arrivals
 *   strips both stay full.
 * - Optional minimum books per rail (`enrichMinimumTags`).
 */

const fs = require('fs');
const path = require('path');

const { normalizeWebnovelHome } = require('../normalize-webnovel-json');

const INTERNAL_HOME_TAGS = [
  'weekly_featured',
  'new_arrivals',
  'potential_starlet',
  'rising_fictions',
  'cheering_reads',
  'editors_choice',
  'completed_novel',
  'originals',
];

const RANKING_ALTERNATE = '__ranking_alternate__';

function normalizeSourceKey(key) {
  return String(key || '')
    .trim()
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/** Maps a JSON section key → internal book_tags to assign (flatten ranking special). */
function mapSourceKeyToTags(sourceKey) {
  const k = normalizeSourceKey(sourceKey);
  const map = {
    weekly_book: ['weekly_featured'],
    weekly_books: ['weekly_featured'],
    meet_webnovel: ['weekly_featured'],
    meet_web_novel: ['weekly_featured'],
    weekly: ['weekly_featured'],
    featured: ['weekly_featured'],
    weekly_featured: ['weekly_featured', 'new_arrivals'],

    recommended: ['new_arrivals', 'weekly_featured'],

    new_arrival: ['new_arrivals', 'weekly_featured'],
    new_arrivals: ['new_arrivals', 'weekly_featured'],

    ranking: [RANKING_ALTERNATE],
    ranking_novels: [RANKING_ALTERNATE],

    updated_today: ['cheering_reads'],
    cheering_reads: ['cheering_reads'],

    editors_choice: ['editors_choice'],
    editorschoice: ['editors_choice'],

    completed: ['completed_novel'],
    completed_novel: ['completed_novel'],
    completed_novels: ['completed_novel'],

    gs_originals: ['originals'],
    originals: ['originals'],

    potential_starlet: ['potential_starlet'],
    rising_fictions: ['rising_fictions'],
  };
  return map[k] || ['rising_fictions'];
}

function isInternalShape(raw) {
  if (!raw || typeof raw !== 'object') return false;
  let hits = 0;
  for (const t of INTERNAL_HOME_TAGS) {
    if (Array.isArray(raw[t]) && raw[t].length) hits += 1;
  }
  return hits >= 2;
}

function isApiBlockShape(raw) {
  return Boolean(raw && raw.data && Array.isArray(raw.data.blockItems));
}

function isScrapeShape(raw) {
  return Boolean(
    raw &&
      (Array.isArray(raw.weekly) ||
        Array.isArray(raw.featured) ||
        Array.isArray(raw.ranking) ||
        Array.isArray(raw.completed)),
  );
}

/**
 * Normalize any supported JSON root into plain object: internalTag -> book[].
 */
function flattenToInternalBuckets(raw) {
  if (isApiBlockShape(raw)) {
    return normalizeWebnovelHome(raw);
  }
  if (isInternalShape(raw)) {
    const out = {};
    for (const t of INTERNAL_HOME_TAGS) {
      out[t] = Array.isArray(raw[t]) ? [...raw[t]] : [];
    }
    return out;
  }
  if (isScrapeShape(raw)) {
    const weekly = [...(raw.weekly || []), ...(raw.featured || [])];
    const ranking = raw.ranking || [];
    const pot = [];
    const ris = [];
    ranking.forEach((b, i) => {
      (i % 2 === 0 ? pot : ris).push(b);
    });
    return {
      weekly_featured: weekly,
      new_arrivals: raw.new_arrivals || [],
      potential_starlet: pot,
      rising_fictions: ris,
      cheering_reads: weekly.slice(0, Math.min(weekly.length, 12)),
      editors_choice: (raw.featured || []).slice(0, 8),
      completed_novel: raw.completed || [],
    };
  }
  // normalize-like dynamic keys (weekly_book, recommended, …)
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    if (Array.isArray(v)) out[k] = v;
  }
  return out;
}

function externalIdFromBook(b) {
  if (b == null) return '';
  if (b.book_id != null && String(b.book_id).trim()) return String(b.book_id).trim();
  const link = String(b.link || '');
  const m = link.match(/\/(?:book|comic)\/(\d+)/i);
  if (m) return m[1];
  return link.split('/').filter(Boolean).pop() || `${b.title || 'book'}-${link.slice(-12)}`;
}

/**
 * @returns {Map<string, { book: object, tags: Set<string> }>}
 */
function buildBySourceFromBuckets(buckets) {
  const bySource = new Map();

  for (const [sourceKey, list] of Object.entries(buckets)) {
    if (!Array.isArray(list)) continue;
    const templateTags = mapSourceKeyToTags(sourceKey);
    list.forEach((book, idx) => {
      const tags = new Set();
      for (const t of templateTags) {
        if (t === RANKING_ALTERNATE) tags.add(idx % 2 === 0 ? 'potential_starlet' : 'rising_fictions');
        else tags.add(t);
      }
      const ext = externalIdFromBook(book);
      if (!ext) return;
      if (!bySource.has(ext)) bySource.set(ext, { book, tags: new Set() });
      const entry = bySource.get(ext);
      for (const t of tags) entry.tags.add(t);
    });
  }

  return bySource;
}

function buildBySourceFromAnyJson(raw) {
  const buckets = flattenToInternalBuckets(raw);
  return buildBySourceFromBuckets(buckets);
}

/**
 * Ensure each internal rail has at least `minPerRail` distinct books (by external id).
 */
function enrichMinimumTags(bySource, minPerRail = 10) {
  const min = Math.max(1, Number(minPerRail) || 10);
  function counts() {
    const c = Object.fromEntries(INTERNAL_HOME_TAGS.map((t) => [t, 0]));
    for (const { tags } of bySource.values()) {
      for (const t of tags) if (Object.prototype.hasOwnProperty.call(c, t)) c[t] += 1;
    }
    return c;
  }

  const entries = [...bySource.entries()];
  let guard = 0;
  while (guard < 50000) {
    guard += 1;
    const c = counts();
    const needy = INTERNAL_HOME_TAGS.find((t) => c[t] < min);
    if (!needy) break;
    const donor = entries.find(([, v]) => !v.tags.has(needy));
    if (!donor) break;
    donor[1].tags.add(needy);
  }
}

module.exports = {
  INTERNAL_HOME_TAGS,
  normalizeSourceKey,
  mapSourceKeyToTags,
  isInternalShape,
  isApiBlockShape,
  isScrapeShape,
  flattenToInternalBuckets,
  externalIdFromBook,
  buildBySourceFromBuckets,
  buildBySourceFromAnyJson,
  enrichMinimumTags,
  normalizeWebnovelHome,
};
