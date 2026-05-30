/** Mirror server rules in chapters.service.js for UI fallbacks. */
export function isChapterLocked(chapter) {
  if (!chapter) return true;
  if (chapter.canRead === true) return false;
  if (chapter.canRead === false) return true;
  const paid = !!chapter.isPaid && Number(chapter.tokenPrice) > 0;
  if (!paid) return false;
  return !chapter.isUnlocked;
}

export function isChapterReadable(chapter) {
  return !isChapterLocked(chapter);
}
