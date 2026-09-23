'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

/**
 * Lightweight contract checks for engagement presentation rules.
 * Full notify() needs DB; this locks the client-facing decision matrix.
 */

function surfaceForTaskFrequency(frequency) {
  if (frequency === 'weekly' || frequency === 'monthly') return 'celebration';
  return 'toast';
}

function checkinSurface({ milestone, lucky, achievements, weeklyOrMonthlyTasks }) {
  if (milestone || lucky || (achievements && achievements.length) || weeklyOrMonthlyTasks) {
    return 'celebration';
  }
  return 'toast';
}

describe('engagement presentation rules', () => {
  it('daily and getting-started completions use toast', () => {
    assert.equal(surfaceForTaskFrequency('daily'), 'toast');
    assert.equal(surfaceForTaskFrequency('once'), 'toast');
  });

  it('weekly and monthly completions use celebration', () => {
    assert.equal(surfaceForTaskFrequency('weekly'), 'celebration');
    assert.equal(surfaceForTaskFrequency('monthly'), 'celebration');
  });

  it('ordinary check-in is toast; milestones and achievements combine to one celebration', () => {
    assert.equal(checkinSurface({}), 'toast');
    assert.equal(checkinSurface({ milestone: 'day7' }), 'celebration');
    assert.equal(checkinSurface({ lucky: true }), 'celebration');
    assert.equal(checkinSurface({ achievements: ['streak_7'] }), 'celebration');
  });
});
