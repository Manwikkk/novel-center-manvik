'use strict';

const pool = require('../db/pool');

const KEYS = [
  'weekly_book',
  'meet_webnovel',
  'recommended',
  'new_arrivals',
  'ranking_novels',
  'updated_today',
  'completed_novels',
  'editors_choice',
  'gs_originals',
];

const DEFAULT_SECTIONS = KEYS.reduce((acc, k) => {
  acc[k] = true;
  return acc;
}, {});

function rowToSections(row) {
  const out = { ...DEFAULT_SECTIONS };
  if (!row) return out;
  for (const k of KEYS) {
    if (Object.prototype.hasOwnProperty.call(row, k)) {
      out[k] = Number(row[k]) === 1;
    }
  }
  return out;
}

async function getPageSections() {
  try {
    const [rows] = await pool.execute(
      `SELECT weekly_book, meet_webnovel, recommended, new_arrivals, ranking_novels,
              updated_today, completed_novels, editors_choice, gs_originals
         FROM site_home_page_config WHERE id = 1 LIMIT 1`,
    );
    return rowToSections(rows[0]);
  } catch (e) {
    if (e && e.code === 'ER_NO_SUCH_TABLE') return { ...DEFAULT_SECTIONS };
    throw e;
  }
}

async function updatePageSections(patch) {
  const current = await getPageSections();
  const next = { ...current };
  for (const k of KEYS) {
    if (Object.prototype.hasOwnProperty.call(patch, k)) {
      next[k] = !!patch[k];
    }
  }
  const vals = KEYS.map((k) => (next[k] ? 1 : 0));
  const dup = KEYS.map((k) => `${k} = VALUES(${k})`).join(', ');
  await pool.execute(
    `INSERT INTO site_home_page_config (id, ${KEYS.join(', ')})
     VALUES (1, ${KEYS.map(() => '?').join(', ')})
     ON DUPLICATE KEY UPDATE ${dup}`,
    vals,
  );
  return next;
}

module.exports = {
  KEYS,
  DEFAULT_SECTIONS,
  getPageSections,
  updatePageSections,
};
