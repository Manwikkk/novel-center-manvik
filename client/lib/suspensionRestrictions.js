import { formatDateTime } from '@/lib/format';

export const RESTRICTION_DEFS = [
  { key: 'portal_access', label: 'Portal access', hint: 'Blocks sign-in and site access' },
  { key: 'reading', label: 'Reading', hint: 'Cannot read or unlock chapters' },
  { key: 'commenting', label: 'Commenting', hint: 'Cannot post or edit comments' },
  { key: 'reviewing', label: 'Reviewing', hint: 'Cannot post or edit reviews' },
  { key: 'publishing', label: 'Publishing', hint: 'Authors cannot publish or edit works' },
];

const ACTION_LABELS = {
  portal_access: 'Signing in',
  reading: 'Reading',
  commenting: 'Commenting',
  reviewing: 'Writing reviews',
  publishing: 'Publishing',
};

/** True when the signed-in user carries the given restriction. */
export function hasRestriction(user, key) {
  return !!user?.restrictions?.[key];
}

/**
 * Human-readable notice for a restricted action, including how long every
 * active restriction lasts (temporary bans share one expiry; permanent ones
 * stay until an admin lifts them).
 */
export function restrictionNotice(user, key) {
  if (!hasRestriction(user, key)) return null;
  const temporary = user.suspensionType === 'temporary' && user.suspendedUntil;
  const until = temporary ? formatDateTime(user.suspendedUntil) : null;
  const activeLabels = RESTRICTION_DEFS
    .filter((def) => user.restrictions?.[def.key])
    .map((def) => def.label);
  const action = ACTION_LABELS[key] || 'This action';
  return {
    title: `${action} is restricted on your account`,
    duration: until ? `Temporary ban · lifts on ${until}` : 'Permanent ban · stays until an admin lifts it',
    message: until
      ? `${action} is blocked until ${until}.`
      : `${action} is blocked permanently until an admin reinstates your account.`,
    active: activeLabels,
    until: user.suspendedUntil || null,
    permanent: !until,
  };
}

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
