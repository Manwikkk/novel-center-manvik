'use strict';

const {
  calendarDate,
  shiftDateStr,
  startOfCalendarDate,
} = require('../utils/calendarDay');

/** ISO week key (Monday-based) for a 'YYYY-MM-DD' calendar date. */
function isoWeekKey(dateStr) {
  const [y, m, d] = String(dateStr).split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const isoYear = date.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const week = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  return `${isoYear}-W${String(week).padStart(2, '0')}`;
}

function monthEnd(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Period window in the platform timezone.
 * Weeks run Monday–Sunday. `once` is lifetime and does not reset.
 */
function periodBounds(frequency, timeZone, date = new Date()) {
  const day = calendarDate(timeZone, date);
  if (frequency === 'once') {
    return { key: 'once', start: '1970-01-01', end: '9999-12-31', resetsAt: null };
  }
  if (frequency === 'daily') {
    const resetsAt = startOfCalendarDate(timeZone, shiftDateStr(day, 1));
    return { key: day, start: day, end: day, resetsAt };
  }
  if (frequency === 'monthly') {
    const [y, m] = day.split('-').map(Number);
    const mm = String(m).padStart(2, '0');
    const start = `${y}-${mm}-01`;
    const end = `${y}-${mm}-${String(monthEnd(y, m)).padStart(2, '0')}`;
    const resetsAt = startOfCalendarDate(timeZone, shiftDateStr(end, 1));
    return { key: `${y}-${mm}`, start, end, resetsAt };
  }
  if (frequency === 'weekly') {
    const [y, m, d] = day.split('-').map(Number);
    const utc = new Date(Date.UTC(y, m - 1, d));
    const dow = utc.getUTCDay() || 7;
    const start = shiftDateStr(day, 1 - dow);
    const end = shiftDateStr(start, 6);
    const resetsAt = startOfCalendarDate(timeZone, shiftDateStr(end, 1));
    return { key: isoWeekKey(day), start, end, resetsAt };
  }
  throw new Error(`Unknown frequency: ${frequency}`);
}

function inDayRange(dayKey, start, end) {
  if (!dayKey) return false;
  const day = String(dayKey).slice(0, 10);
  return day >= start && day <= end;
}

module.exports = { isoWeekKey, periodBounds, inDayRange };
