'use strict';

/**
 * Daily Check-In defaults. Everything here is the fallback for the admin
 * configuration stored in `checkin_config`; the service merges the stored
 * document over these values, so a partially-saved config never breaks a
 * claim.
 */

const REWARD_TYPES = ['COINS', 'CHAPTER_DISCOUNT', 'BUNDLE_DISCOUNT', 'NOVEL_PASS', 'PLATFORM_WIDE_PASS'];

const DISPLAY_CYCLE_DAYS = 14;
const MILESTONE_DAYS = [7, 14];

// Display day → EXP (index 0 = Day 1). 170 EXP per full cycle.
const DEFAULT_DAILY_EXP = [5, 5, 10, 10, 15, 15, 25, 5, 5, 10, 10, 15, 20, 35];

const DEFAULT_CONFIG = {
  enabled: true,
  timezone: 'Asia/Kolkata',
  dailyExp: DEFAULT_DAILY_EXP,
  milestones: {
    day7: {
      title: 'Day 7 milestone',
      options: [
        { key: 'coins', type: 'COINS', enabled: true, amount: 5 },
        {
          key: 'chapter_discount', type: 'CHAPTER_DISCOUNT', enabled: true,
          percent: 10, maxDiscountCoins: 5, validDays: 30,
        },
        { key: 'novel_pass', type: 'NOVEL_PASS', enabled: true, hours: 12 },
      ],
    },
    day14: {
      title: 'Day 14 major milestone',
      options: [
        { key: 'coins', type: 'COINS', enabled: true, amount: 15 },
        {
          key: 'bundle_discount', type: 'BUNDLE_DISCOUNT', enabled: true,
          percent: 25, maxDiscountCoins: 30, validDays: 30, bundleSize: 5,
        },
        { key: 'novel_pass', type: 'NOVEL_PASS', enabled: true, hours: 24 },
      ],
    },
  },
  luckyPass: {
    enabled: true,
    hours: 72,
    // Chance (percent) that a successful daily claim drops a platform-wide pass.
    dropProbabilityPercent: 1,
    // Chance (percent) that a chosen Novel Pass is upgraded to the platform-wide pass.
    upgradeProbabilityPercent: 5,
    minStreak: 7,
  },
  passRules: {
    excludeOriginals: false,
    excludedBookIds: [],
  },
};

function cycleDay(streak) {
  const n = Math.max(1, Number(streak) || 1);
  return ((n - 1) % DISPLAY_CYCLE_DAYS) + 1;
}

function cycleNumber(streak) {
  const n = Math.max(1, Number(streak) || 1);
  return Math.floor((n - 1) / DISPLAY_CYCLE_DAYS) + 1;
}

function isMilestoneDay(displayDay) {
  return MILESTONE_DAYS.includes(Number(displayDay));
}

module.exports = {
  REWARD_TYPES,
  DISPLAY_CYCLE_DAYS,
  MILESTONE_DAYS,
  DEFAULT_DAILY_EXP,
  DEFAULT_CONFIG,
  cycleDay,
  cycleNumber,
  isMilestoneDay,
};
