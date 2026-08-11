'use strict';

/** Cumulative XP required to reach each level (index = level). Max level 15. */
const XP_THRESHOLDS = [
  0, // unused
  0, 50, 120, 220, 350, 500, 700, 950, 1250, 1600, 2000, 2500, 3100, 3800, 4600,
];

const MAX_LEVEL = 15;

function levelFromXp(xp) {
  const n = Math.max(0, Number(xp) || 0);
  let level = 1;
  for (let i = 1; i <= MAX_LEVEL; i += 1) {
    if (n >= XP_THRESHOLDS[i]) level = i;
    else break;
  }
  return level;
}

function xpProgress(xp) {
  const n = Math.max(0, Number(xp) || 0);
  const level = levelFromXp(n);
  const currentFloor = XP_THRESHOLDS[level] || 0;
  const nextFloor = level >= MAX_LEVEL ? currentFloor : XP_THRESHOLDS[level + 1];
  const span = Math.max(1, nextFloor - currentFloor);
  const into = Math.max(0, n - currentFloor);
  return {
    level,
    xp: n,
    xpIntoLevel: level >= MAX_LEVEL ? span : into,
    xpForNextLevel: level >= MAX_LEVEL ? span : span,
    progress: level >= MAX_LEVEL ? 1 : Math.min(1, into / span),
    maxLevel: MAX_LEVEL,
    isMax: level >= MAX_LEVEL,
  };
}

module.exports = { XP_THRESHOLDS, MAX_LEVEL, levelFromXp, xpProgress };
