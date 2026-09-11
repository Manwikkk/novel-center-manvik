'use strict';

/** Canonical book_tags.tag values that drive GET /api/v1/home. */
const HOME_SHELF_TAGS = [
  'weekly_featured',
  'new_arrivals',
  'potential_starlet',
  'rising_fictions',
  'cheering_reads',
  'editors_choice',
  'completed_novel',
  'originals',
];

/**
 * Admin-facing shelves. One tag can feed more than one home rail
 * (Weekly Book + New Arrivals both read weekly_featured).
 */
const HOME_SHELVES = [
  {
    tag: 'weekly_featured',
    label: 'Weekly Book / New Arrivals',
    hint: 'Hero carousel and New Arrivals strip',
  },
  {
    tag: 'new_arrivals',
    label: 'Recommended',
    hint: 'Recommended rail',
  },
  {
    tag: 'potential_starlet',
    label: 'Ranking — Most Read',
    hint: 'Ranking left column',
  },
  {
    tag: 'rising_fictions',
    label: 'Ranking — Trending',
    hint: 'Ranking middle column',
  },
  {
    tag: 'cheering_reads',
    label: 'Updated Today',
    hint: 'Updated Today rail',
  },
  {
    tag: 'completed_novel',
    label: 'Completed Novels',
    hint: 'Lower row — left',
  },
  {
    tag: 'editors_choice',
    label: "Editors' Choice",
    hint: 'Lower row — right',
  },
  {
    tag: 'originals',
    label: 'GS Originals',
    hint: 'Originals rail',
  },
];

const HOME_SHELF_TAG_SET = new Set(HOME_SHELF_TAGS);

function isHomeShelfTag(tag) {
  return HOME_SHELF_TAG_SET.has(tag);
}

module.exports = {
  HOME_SHELF_TAGS,
  HOME_SHELVES,
  HOME_SHELF_TAG_SET,
  isHomeShelfTag,
};
