'use strict';

/**
 * Developer-owned task conditions. Admin can configure these (targets, EXP,
 * schedule, enablement) but cannot invent a condition that is not listed here.
 *
 * Getting Started rows are seeded and locked to `once`. Daily reading
 * durations are alternative difficulties: at most one enabled daily
 * `read_minutes` task may be available at a time.
 */

const READ_MINUTE_CHOICES = [10, 20, 30, 60];

const TASK_CONDITIONS = {
  gs_first_chapter: {
    key: 'gs_first_chapter',
    label: 'First Chapter',
    group: 'Getting Started',
    frequencies: ['once'],
    system: true,
    params: {},
  },
  gs_first_novel: {
    key: 'gs_first_novel',
    label: 'First Novel',
    group: 'Getting Started',
    frequencies: ['once'],
    system: true,
    params: {},
  },
  gs_first_completion: {
    key: 'gs_first_completion',
    label: 'First Completion',
    group: 'Getting Started',
    frequencies: ['once'],
    system: true,
    params: {},
  },
  gs_first_library: {
    key: 'gs_first_library',
    label: 'First Library Add',
    group: 'Getting Started',
    frequencies: ['once'],
    system: true,
    params: {},
  },
  gs_first_collection: {
    key: 'gs_first_collection',
    label: 'First Collection',
    group: 'Getting Started',
    frequencies: ['once'],
    system: true,
    params: {},
  },
  gs_first_follow: {
    key: 'gs_first_follow',
    label: 'First Follow',
    group: 'Getting Started',
    frequencies: ['once'],
    system: true,
    params: {},
  },
  gs_first_rating: {
    key: 'gs_first_rating',
    label: 'First Rating',
    group: 'Getting Started',
    frequencies: ['once'],
    system: true,
    params: {},
  },
  gs_first_comment: {
    key: 'gs_first_comment',
    label: 'First Comment',
    group: 'Getting Started',
    frequencies: ['once'],
    system: true,
    params: {},
  },
  gs_first_review: {
    key: 'gs_first_review',
    label: 'First Review',
    group: 'Getting Started',
    frequencies: ['once'],
    system: true,
    params: {},
  },
  gs_first_checkin: {
    key: 'gs_first_checkin',
    label: 'First Check-In',
    group: 'Getting Started',
    frequencies: ['once'],
    system: true,
    params: {},
  },
  gs_first_achievement: {
    key: 'gs_first_achievement',
    label: 'First Achievement',
    group: 'Getting Started',
    frequencies: ['once'],
    system: true,
    params: {},
  },
  read_minutes: {
    key: 'read_minutes',
    label: 'Read for N minutes',
    group: 'Reading',
    frequencies: ['daily'],
    exclusiveGroup: 'daily_read_minutes',
    params: {
      minutes: { type: 'enum', values: READ_MINUTE_CHOICES, default: 20 },
    },
  },
  read_new_arrival: {
    key: 'read_new_arrival',
    label: 'Read a New Arrival',
    group: 'Discovery',
    frequencies: ['daily'],
    params: {
      minMinutes: { type: 'int', min: 3, max: 30, default: 5 },
    },
  },
  read_chapters: {
    key: 'read_chapters',
    label: 'Read N chapters',
    group: 'Reading',
    frequencies: ['weekly', 'monthly'],
    params: {
      target: { type: 'int', min: 1, max: 500, default: 30 },
    },
  },
  read_new_arrivals: {
    key: 'read_new_arrivals',
    label: 'Read N New Arrivals',
    group: 'Discovery',
    frequencies: ['weekly', 'monthly'],
    params: {
      target: { type: 'int', min: 1, max: 30, default: 4 },
      minMinutes: { type: 'int', min: 3, max: 30, default: 5 },
    },
  },
  review_new_arrival: {
    key: 'review_new_arrival',
    label: 'Review a New Arrival',
    group: 'Discovery',
    frequencies: ['weekly'],
    params: {
      target: { type: 'int', min: 1, max: 10, default: 1 },
    },
  },
  review_new_arrivals: {
    key: 'review_new_arrivals',
    label: 'Review N New Arrivals',
    group: 'Discovery',
    frequencies: ['monthly'],
    params: {
      target: { type: 'int', min: 1, max: 20, default: 2 },
    },
  },
  rate_new_arrivals: {
    key: 'rate_new_arrivals',
    label: 'Rate New Arrivals',
    group: 'Discovery',
    frequencies: ['weekly', 'monthly'],
    params: {
      target: { type: 'int', min: 1, max: 30, default: 3 },
    },
  },
  complete_novels: {
    key: 'complete_novels',
    label: 'Complete N novels',
    group: 'Reading',
    frequencies: ['weekly', 'monthly'],
    params: {
      target: { type: 'int', min: 1, max: 50, default: 2 },
    },
  },
};

/** Conditions an event activity may track. Independent of the task catalogue. */
const EVENT_CONDITIONS = {
  read_minutes: {
    key: 'read_minutes',
    label: 'Read for N minutes',
    params: { minutes: { type: 'int', min: 5, max: 600, default: 30 } },
  },
  read_chapters: {
    key: 'read_chapters',
    label: 'Read N chapters',
    params: { target: { type: 'int', min: 1, max: 500, default: 5 } },
  },
  read_new_arrivals: {
    key: 'read_new_arrivals',
    label: 'Read N New Arrivals',
    params: {
      target: { type: 'int', min: 1, max: 30, default: 2 },
      minMinutes: { type: 'int', min: 3, max: 30, default: 5 },
    },
  },
  review_new_arrivals: {
    key: 'review_new_arrivals',
    label: 'Review N New Arrivals',
    params: { target: { type: 'int', min: 1, max: 20, default: 1 } },
  },
  rate_new_arrivals: {
    key: 'rate_new_arrivals',
    label: 'Rate N New Arrivals',
    params: { target: { type: 'int', min: 1, max: 30, default: 3 } },
  },
  complete_novels: {
    key: 'complete_novels',
    label: 'Complete N novels',
    params: { target: { type: 'int', min: 1, max: 50, default: 1 } },
  },
  checkins: {
    key: 'checkins',
    label: 'Daily Check-Ins during the event',
    params: { target: { type: 'int', min: 1, max: 60, default: 3 } },
  },
  comments: {
    key: 'comments',
    label: 'Post N eligible comments',
    params: { target: { type: 'int', min: 1, max: 50, default: 1 } },
  },
  reviews: {
    key: 'reviews',
    label: 'Submit N eligible reviews',
    params: { target: { type: 'int', min: 1, max: 20, default: 1 } },
  },
};

const EVENT_REWARD_TYPES = [
  'COINS',
  'EXP',
  'CHAPTER_DISCOUNT',
  'BUNDLE_DISCOUNT',
  'NOVEL_PASS',
  'PLATFORM_WIDE_PASS',
  'BADGE',
  'TITLE',
  'COSMETIC',
];

const FREQUENCIES = ['once', 'daily', 'weekly', 'monthly'];

function conditionDef(key) {
  return TASK_CONDITIONS[key] || null;
}

function publicCatalog() {
  return Object.values(TASK_CONDITIONS).map((c) => ({
    key: c.key,
    label: c.label,
    group: c.group,
    frequencies: c.frequencies,
    system: !!c.system,
    exclusiveGroup: c.exclusiveGroup || null,
    params: c.params,
  }));
}

function publicEventCatalog() {
  return {
    conditions: Object.values(EVENT_CONDITIONS).map((c) => ({
      key: c.key,
      label: c.label,
      params: c.params,
    })),
    rewardTypes: EVENT_REWARD_TYPES,
  };
}

module.exports = {
  READ_MINUTE_CHOICES,
  TASK_CONDITIONS,
  EVENT_CONDITIONS,
  EVENT_REWARD_TYPES,
  FREQUENCIES,
  conditionDef,
  publicCatalog,
  publicEventCatalog,
};
