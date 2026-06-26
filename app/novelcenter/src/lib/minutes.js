const WPM = 220;

export function minutesFromWords(words, percentRemaining = 100) {
  const remaining = Math.max(0, (Number(words) || 0) * (percentRemaining / 100));
  if (remaining < 1) return 0;
  return Math.max(1, Math.round(remaining / WPM));
}
