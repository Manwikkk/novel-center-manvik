'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const rules = require('../src/services/taskRules');
const { periodBounds, isoWeekKey } = require('../src/services/taskCalendar');
const { calendarDate } = require('../src/utils/calendarDay');

test('jumping to the final chapter does not complete a novel', () => {
  const published = [
    { id: 1, idx: 1 },
    { id: 2, idx: 2 },
    { id: 3, idx: 3 },
    { id: 4, idx: 4 },
    { id: 5, idx: 5 },
  ];
  const onlyLast = rules.genuineCompletion(published, { 5: 100 }, {});
  assert.equal(onlyLast.ok, false);
  assert.equal(onlyLast.reason, 'opening_unread');

  const firstAndLast = rules.genuineCompletion(published, { 1: 90, 5: 100 }, {});
  assert.equal(firstAndLast.ok, false);
  assert.equal(firstAndLast.reason, 'coverage');
  assert.equal(firstAndLast.need, 4);
});

test('genuine completion requires the opening, the ending, and 80% coverage', () => {
  const published = [
    { id: 1, idx: 1 },
    { id: 2, idx: 2 },
    { id: 3, idx: 3 },
    { id: 4, idx: 4 },
    { id: 5, idx: 5 },
  ];
  const enough = rules.genuineCompletion(published, { 1: 80, 2: 100, 3: 90, 5: 80 }, {});
  assert.equal(enough.ok, true);
  assert.equal(enough.readCount, 4);

  const skippedOpening = rules.genuineCompletion(published, { 2: 100, 3: 100, 4: 100, 5: 100 }, {});
  assert.equal(skippedOpening.ok, false);
  assert.equal(skippedOpening.reason, 'opening_unread');
});

test('a one-chapter novel needs real reading time, not a tap on the final chapter', () => {
  const published = [{ id: 7, idx: 1 }];
  assert.equal(rules.genuineCompletion(published, { 7: 100 }, { 7: 179 }).ok, false);
  assert.equal(rules.genuineCompletion(published, { 7: 100 }, { 7: 180 }).ok, true);
  assert.equal(rules.genuineCompletion(published, { 7: 79 }, { 7: 600 }).ok, false);
});

test('first novel is more than one chapter and less than full completion', () => {
  assert.equal(rules.hasReadFirstNovel([{ readCount: 1, publishedCount: 12, seconds: 0 }]), false);
  assert.equal(rules.hasReadFirstNovel([{ readCount: 2, publishedCount: 12, seconds: 0 }]), true);
  assert.equal(rules.hasReadFirstNovel([{ readCount: 1, publishedCount: 1, seconds: 599 }]), false);
  assert.equal(rules.hasReadFirstNovel([{ readCount: 1, publishedCount: 1, seconds: 600 }]), true);
});

test('task rewards reject coins', () => {
  assert.doesNotThrow(() => rules.assertTaskRewardExpOnly({ exp: 20 }));
  assert.equal(rules.assertExpAmount(5), 5);
  assert.throws(() => rules.assertTaskRewardExpOnly({ type: 'COINS', amount: 10 }), /cannot include coins/);
  assert.throws(() => rules.assertTaskRewardExpOnly({ coins: 1 }), /cannot include coins/);
  assert.throws(() => rules.assertTaskRewardExpOnly({ params: { coins: 5 } }), /cannot include coins/);
});

test('admin cannot invent unsupported conditions or illegal frequencies', () => {
  assert.throws(() => rules.normalizeTaskParams('library_reading', {}), /Unsupported task condition/);
  assert.throws(() => rules.normalizeTaskParams('read_minutes', { minutes: 15, coins: 5 }), /cannot include coins|Unsupported parameter/);
  assert.throws(() => rules.assertTaskConfigurable('review_new_arrival', 'daily'), /cannot be a daily/);
  assert.throws(() => rules.assertTaskConfigurable('gs_first_chapter', 'once'), /fixed/);
  assert.deepEqual(rules.normalizeTaskParams('read_minutes', { minutes: 30 }), { minutes: 30 });
  assert.deepEqual(rules.normalizeTaskParams('read_new_arrival', {}), { minMinutes: 5 });
});

test('daily reading durations cannot be active together', () => {
  const alwaysOn = [{
    id: 1,
    title: 'Read for 20 minutes',
    condition_key: 'read_minutes',
    frequency: 'daily',
    enabled: 1,
    starts_at: null,
    ends_at: null,
  }];
  const clash = rules.findReadMinutesConflict(alwaysOn, {
    id: 2,
    conditionKey: 'read_minutes',
    frequency: 'daily',
    enabled: true,
  });
  assert.equal(clash.id, 1);

  const scheduled = [{
    id: 3,
    title: 'Read for 10 minutes',
    condition_key: 'read_minutes',
    frequency: 'daily',
    enabled: 1,
    starts_at: '2026-09-01T00:00:00.000Z',
    ends_at: '2026-09-15T00:00:00.000Z',
  }];
  const separated = rules.findReadMinutesConflict(scheduled, {
    id: 4,
    conditionKey: 'read_minutes',
    frequency: 'daily',
    enabled: true,
    startsAt: '2026-10-01T00:00:00.000Z',
    endsAt: '2026-10-07T00:00:00.000Z',
  });
  assert.equal(separated, null);

  const disabled = rules.findReadMinutesConflict(alwaysOn, {
    conditionKey: 'read_minutes',
    frequency: 'daily',
    enabled: false,
  });
  assert.equal(disabled, null);
});

test('completed tasks sink below active ones in the same group', () => {
  const ordered = rules.sortTasksForDisplay([
    { id: 2, sortOrder: 20, completed: true, title: 'done later' },
    { id: 3, sortOrder: 5, completed: false, title: 'still open' },
    { id: 1, sortOrder: 10, completed: true, title: 'done earlier' },
  ]);
  assert.deepEqual(ordered.map((task) => task.id), [3, 1, 2]);
});

test('eligible comments and reviews stay distinct', () => {
  assert.equal(rules.isEligibleComment({ body: 'Nice chapter today' }), true);
  assert.equal(rules.isEligibleComment({ body: 'hi' }), false);
  assert.equal(rules.isEligibleReview({
    body: 'A careful look at the opening arc of this novel.',
    reviewRatings: { writingQuality: 5 },
  }), true);
  assert.equal(rules.isEligibleReview({
    body: 'Too short to be a review.',
    reviewRatings: { writingQuality: 5 },
  }), false);
  assert.equal(rules.isEligibleComment({
    body: 'A careful look at the opening arc of this novel.',
    reviewRatings: { writingQuality: 5 },
  }), false);
});

test('period windows follow the platform timezone and reset on the boundary', () => {
  const zone = 'Asia/Kolkata';
  const beforeMidnight = new Date('2026-09-23T18:29:00.000Z');
  const afterMidnight = new Date('2026-09-23T18:30:00.000Z');
  assert.equal(calendarDate(zone, beforeMidnight), '2026-09-23');
  assert.equal(calendarDate(zone, afterMidnight), '2026-09-24');

  const wed = periodBounds('daily', zone, new Date('2026-09-23T08:00:00.000Z'));
  assert.equal(wed.key, '2026-09-23');
  assert.equal(wed.resetsAt.toISOString(), '2026-09-23T18:30:00.000Z');

  const week = periodBounds('weekly', zone, new Date('2026-09-23T08:00:00.000Z'));
  assert.equal(week.start, '2026-09-21');
  assert.equal(week.end, '2026-09-27');
  assert.equal(week.key, isoWeekKey('2026-09-23'));
  const nextWeek = periodBounds('weekly', zone, new Date('2026-09-28T08:00:00.000Z'));
  assert.equal(nextWeek.start, '2026-09-28');
  assert.notEqual(nextWeek.key, week.key);

  const month = periodBounds('monthly', zone, new Date('2026-09-23T08:00:00.000Z'));
  assert.equal(month.key, '2026-09');
  assert.equal(month.start, '2026-09-01');
  assert.equal(month.end, '2026-09-30');
  const october = periodBounds('monthly', zone, new Date('2026-10-01T08:00:00.000Z'));
  assert.equal(october.key, '2026-10');
});
