'use strict';

// Normalise a DATE column value to a plain 'YYYY-MM-DD' calendar date.
// mysql2 (dateStrings: false) returns DATE columns as a Date at local
// midnight, so the calendar date must be read back with local getters —
// toISOString() would shift it by a day on servers west/east of UTC.
function dateOnly(value) {
  if (!value) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const s = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

module.exports = { dateOnly };
