'use strict';

const { errors } = require('../utils/HttpError');
const { dateOnly } = require('../utils/dateOnly');
const { isMatureNotice, MATURE_MIN_AGE } = require('../constants/bookMetadata');

// Whole years between a birth date and today (UTC calendar); null when unknown.
function ageFromBirthDate(value, now = new Date()) {
  const s = dateOnly(value);
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  let age = now.getUTCFullYear() - y;
  const month = now.getUTCMonth() + 1;
  if (month < m || (month === m && now.getUTCDate() < d)) age -= 1;
  return age;
}

// Mature novels ("Restricted" / "No One 17 and Under Admitted") are only served
// to readers whose profile birth date shows they are adults. The novel's author,
// admins and staff bypass the gate so they can work on / moderate the content.
function assertMatureAccess({ warningNotice, authorId }, viewerRow) {
  if (!isMatureNotice(warningNotice)) return;
  if (viewerRow) {
    if (viewerRow.role === 'admin' || viewerRow.role === 'staff') return;
    if (authorId != null && Number(viewerRow.id) === Number(authorId)) return;
  } else {
    throw errors.ageVerificationRequired('Sign in and verify your age to read this mature novel');
  }
  const age = ageFromBirthDate(viewerRow.birth_date);
  if (age == null) {
    throw errors.ageVerificationRequired('Add your date of birth to your profile to read mature novels');
  }
  if (age < MATURE_MIN_AGE) {
    throw errors.ageRestricted(`This novel is for readers aged ${MATURE_MIN_AGE} and over`);
  }
}

module.exports = { ageFromBirthDate, assertMatureAccess };
