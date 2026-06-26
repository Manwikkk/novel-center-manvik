export const READING_RESTRICTED_TITLE = 'Account restricted';
export const READING_RESTRICTED_MESSAGE =
  'Reading is restricted on your account. Contact support if you believe this is a mistake.';

export function hasReadingRestriction(user) {
  return !!user?.restrictions?.reading;
}

export function notifyReadingRestricted(pushToast) {
  pushToast({
    type: 'error',
    title: READING_RESTRICTED_TITLE,
    message: READING_RESTRICTED_MESSAGE,
  });
}

/** True when chapter content is withheld due to a reading suspension (not a token lock). */
export function isReadingSuspensionBlock(chapter, user) {
  if (!hasReadingRestriction(user)) return false;
  return chapter?.canRead === false;
}
