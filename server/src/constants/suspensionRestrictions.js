'use strict';

const RESTRICTION_KEYS = ['portal_access', 'reading', 'commenting', 'reviewing', 'publishing'];

const RESTRICTION_DEFS = [
  { key: 'portal_access', label: 'Portal access', hint: 'Blocks sign-in and refresh' },
  { key: 'reading', label: 'Reading', hint: 'Cannot read or unlock chapters' },
  { key: 'commenting', label: 'Commenting', hint: 'Cannot post or edit comments' },
  { key: 'reviewing', label: 'Reviewing', hint: 'Cannot post or edit reviews' },
  { key: 'publishing', label: 'Publishing', hint: 'Authors cannot publish or edit works' },
];

const RESTRICTION_KEY_SET = new Set(RESTRICTION_KEYS);

function emptyRestrictions() {
  return RESTRICTION_KEYS.reduce((acc, k) => {
    acc[k] = false;
    return acc;
  }, {});
}

function sanitizeRestrictions(input) {
  const out = emptyRestrictions();
  if (!input || typeof input !== 'object') return out;
  for (const k of RESTRICTION_KEYS) {
    if (Object.prototype.hasOwnProperty.call(input, k)) {
      out[k] = !!input[k];
    }
  }
  return out;
}

function hasAnyRestriction(restrictions) {
  return RESTRICTION_KEYS.some((k) => restrictions?.[k]);
}

module.exports = {
  RESTRICTION_KEYS,
  RESTRICTION_DEFS,
  RESTRICTION_KEY_SET,
  emptyRestrictions,
  sanitizeRestrictions,
  hasAnyRestriction,
};
