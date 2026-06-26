'use strict';

// Builds the home page payload: every book grouped by its book_tags.tag.
// Returns { weekly_featured: [...], new_arrivals: [...], ... } so the home
// page can drive every section from one round trip.

const pool = require('../db/pool');
const pageSectionsSvc = require('./pageSections.service');

const SECTION_TAGS = [
  'weekly_featured',
  'new_arrivals',
  'potential_starlet',
  'rising_fictions',
  'cheering_reads',
  'editors_choice',
  'completed_novel',
  'originals',
];

const PER_SECTION_LIMIT = 24;

function rowToCard(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    coverUrl: row.cover_url,
    category: row.category,
    score: row.score == null ? null : Number(row.score),
    chapterNum: Number(row.chapter_num) || 0,
    synopsis: row.synopsis,
    externalLink: row.external_link,
    authorName: row.author_name || null,
  };
}

async function getHomeSections() {
  // One query, group in JS. Each book may carry multiple tags.
  const [rows] = await pool.execute(
    `SELECT b.id, b.slug, b.title, b.cover_url, b.category, b.score,
            b.chapter_num, b.synopsis, b.external_link,
            u.display_name AS author_name,
            bt.tag
       FROM book_tags bt
       JOIN books b ON b.id = bt.book_id
       JOIN users u ON u.id = b.author_id
      WHERE b.status = 'published' AND b.recycled_at IS NULL
      ORDER BY bt.tag ASC, b.id ASC`,
  );

  const result = {};
  for (const tag of SECTION_TAGS) result[tag] = [];

  for (const row of rows) {
    const tag = row.tag;
    if (!result[tag]) continue;
    if (result[tag].length >= PER_SECTION_LIMIT) continue;
    result[tag].push(rowToCard(row));
  }

  let pageSections;
  try {
    pageSections = await pageSectionsSvc.getPageSections();
  } catch (_e) {
    pageSections = { ...pageSectionsSvc.DEFAULT_SECTIONS };
  }
  return { ...result, pageSections };
}

module.exports = { getHomeSections, SECTION_TAGS };
