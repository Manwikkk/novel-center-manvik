'use strict';

const BOOK_TYPES = ['novel', 'fan_fic'];
const LEADING_GENDERS = ['male', 'female'];
const GENRE_SLUGS = ['urban', 'fantasy', 'history', 'horror', 'sci_fi', 'sports', 'games'];
const BOOK_LENGTHS = ['novels', 'short_stories'];
const WARNING_NOTICES = [
  'general_audiences',
  'parental_guidance',
  'parents_cautioned',
  'restricted',
  'no_one_17',
];

// Warning notices that classify a novel as mature: readers must be verified adults.
const MATURE_WARNING_NOTICES = ['restricted', 'no_one_17'];
const MATURE_MIN_AGE = 18;

function isMatureNotice(notice) {
  return MATURE_WARNING_NOTICES.includes(notice);
}

const GENRE_LABELS = {
  male: {
    urban: 'Urban(-Male Oriented)',
    fantasy: 'Fantasy(-Male Oriented)',
    history: 'History(-Male Oriented)',
    horror: 'Horror(-Male Oriented)',
    sci_fi: 'Sci-fi(-Male Oriented)',
    sports: 'Sports(-Male Oriented)',
    games: 'Games(-Male Oriented)',
  },
  female: {
    urban: 'Urban(-Female Oriented)',
    fantasy: 'Fantasy(-Female Oriented)',
    history: 'History(-Female Oriented)',
    horror: 'Horror(-Female Oriented)',
    sci_fi: 'Sci-fi(-Female Oriented)',
    sports: 'Sports(-Female Oriented)',
    games: 'Games(-Female Oriented)',
  },
};

function assertGenreForGender(genre, leadingGender) {
  if (!genre) return;
  if (!LEADING_GENDERS.includes(leadingGender)) return;
  if (!GENRE_SLUGS.includes(genre)) {
    throw new Error('Invalid genre');
  }
}

module.exports = {
  BOOK_TYPES,
  LEADING_GENDERS,
  GENRE_SLUGS,
  BOOK_LENGTHS,
  WARNING_NOTICES,
  MATURE_WARNING_NOTICES,
  MATURE_MIN_AGE,
  GENRE_LABELS,
  assertGenreForGender,
  isMatureNotice,
};
