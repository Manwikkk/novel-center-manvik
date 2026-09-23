'use strict';

// Calendar-day arithmetic in a named IANA timezone. The Daily Check-In counts
// "one claim per calendar day" in the platform timezone (admin configurable),
// so the same instant resolves to the same day for every user no matter where
// the API server itself runs.

const formatterCache = new Map();

function formatter(timeZone) {
  let f = formatterCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
    formatterCache.set(timeZone, f);
  }
  return f;
}

function isValidTimeZone(timeZone) {
  if (!timeZone || typeof timeZone !== 'string') return false;
  try {
    formatter(timeZone);
    return true;
  } catch (_e) {
    return false;
  }
}

function parts(timeZone, date) {
  const out = {};
  for (const p of formatter(timeZone).formatToParts(date)) {
    if (p.type !== 'literal') out[p.type] = Number(p.value);
  }
  return out;
}

/** 'YYYY-MM-DD' for `date` in `timeZone`. */
function calendarDate(timeZone, date = new Date()) {
  const p = parts(timeZone, date);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

/** Shift a 'YYYY-MM-DD' string by `days` (calendar arithmetic, no timezone). */
function shiftDateStr(dateStr, days) {
  const [y, m, d] = String(dateStr).split('-').map(Number);
  const t = Date.UTC(y, m - 1, d + days);
  const r = new Date(t);
  return `${r.getUTCFullYear()}-${String(r.getUTCMonth() + 1).padStart(2, '0')}-${String(r.getUTCDate()).padStart(2, '0')}`;
}

/** Whole days between two 'YYYY-MM-DD' strings (b - a). */
function daysBetween(a, b) {
  const [ay, am, ad] = String(a).split('-').map(Number);
  const [by, bm, bd] = String(b).split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
}

// Offset (minutes) of `timeZone` from UTC at the given instant.
function offsetMinutes(timeZone, date) {
  const p = parts(timeZone, date);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - date.getTime()) / 60000);
}

/** The instant at which the next calendar day begins in `timeZone`. */
function nextMidnight(timeZone, date = new Date()) {
  const tomorrow = shiftDateStr(calendarDate(timeZone, date), 1);
  return startOfCalendarDate(timeZone, tomorrow, date);
}

/**
 * UTC instant when the calendar date `YYYY-MM-DD` begins in `timeZone`.
 * `probe` is an instant near that civil day, used to read the UTC offset.
 */
function startOfCalendarDate(timeZone, dateStr, probe = new Date()) {
  const [y, m, d] = String(dateStr).split('-').map(Number);
  const near = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const basis = Number.isNaN(near.getTime()) ? probe : near;
  let guess = new Date(Date.UTC(y, m - 1, d) - offsetMinutes(timeZone, basis) * 60000);
  const drift = offsetMinutes(timeZone, guess) - offsetMinutes(timeZone, basis);
  if (drift !== 0) guess = new Date(guess.getTime() - drift * 60000);
  return guess;
}

module.exports = {
  isValidTimeZone,
  calendarDate,
  shiftDateStr,
  daysBetween,
  nextMidnight,
  startOfCalendarDate,
};
