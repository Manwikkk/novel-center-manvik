export const RESTRICTION_DEFS = [
  { key: 'portal_access', label: 'Portal access', hint: 'Blocks sign-in and site access' },
  { key: 'reading', label: 'Reading', hint: 'Cannot read or unlock chapters' },
  { key: 'commenting', label: 'Commenting', hint: 'Cannot post or edit comments' },
  { key: 'publishing', label: 'Publishing', hint: 'Authors cannot publish or edit works' },
];

export function emptyRestrictions() {
  return RESTRICTION_DEFS.reduce((acc, { key }) => {
    acc[key] = false;
    return acc;
  }, {});
}

export function hasAnyRestriction(restrictions) {
  return RESTRICTION_DEFS.some(({ key }) => restrictions?.[key]);
}

/** Active restriction defs for a user row (includes legacy full suspend). */
export function activeRestrictionDefs(user) {
  if (user?.restrictions && hasAnyRestriction(user.restrictions)) {
    return RESTRICTION_DEFS.filter(({ key }) => user.restrictions[key]);
  }
  if (user?.status === 'suspended') {
    return RESTRICTION_DEFS.filter(({ key }) => key === 'portal_access');
  }
  return [];
}

export function restrictionSummary(user) {
  if (!user?.restrictions) {
    if (user?.status === 'suspended') return 'Portal blocked';
    return null;
  }
  const labels = RESTRICTION_DEFS
    .filter(({ key }) => user.restrictions[key])
    .map(({ label }) => label);
  return labels.length ? labels.join(', ') : null;
}

export function suspensionStatusLabel(user) {
  if (user?.status !== 'suspended' && !user?.restrictions) return 'active';
  const type = user?.suspensionType === 'temporary' ? 'Temporary' : 'Permanent';
  const summary = restrictionSummary(user);
  if (user?.status === 'suspended' && user?.suspensionType) {
    return `${type}${summary ? ` · ${summary}` : ''}`;
  }
  if (user?.restrictions && hasAnyRestriction(user.restrictions)) {
    return `Restricted · ${summary}`;
  }
  return user?.status || 'active';
}
