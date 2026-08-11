/** Mirror server rules in chapters.service.js for UI fallbacks. */

export function isStaffFreeReader(user) {
  return user?.role === 'admin' || user?.role === 'staff';
}

export function isChapterLocked(chapter, user) {
  if (!chapter) return true;
  // Avoid unlock-UI flash: admin/staff read free even before authenticated
  // chapter payloads (canRead/contentHtml) arrive from the API.
  if (isStaffFreeReader(user)) return false;
  if (chapter.canRead === true) return false;
  if (chapter.canRead === false) return true;
  const paid = !!chapter.isPaid && Number(chapter.tokenPrice) > 0;
  if (!paid) return false;
  return !chapter.isUnlocked;
}

export function isChapterReadable(chapter, user) {
  return !isChapterLocked(chapter, user);
}
