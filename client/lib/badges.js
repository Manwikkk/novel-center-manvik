/**
 * Badge visuals: colour themes per badge / category, tiers by XP value and
 * category metadata. Pure data — shared by every badge component.
 */

export const BADGE_THEMES = {
  gold: { ring: ['#fff3b0', '#d4af37', '#7a5a0e', '#f6e27a', '#b8860b', '#fff3b0'], face: ['#fff8d6', '#f1d15f', '#b8891c'], ink: '#4a3306', glow: 'rgba(212,175,55,0.45)' },
  ruby: { ring: ['#ffd1da', '#e11d48', '#6b0f22', '#ff8fa3', '#be123c', '#ffd1da'], face: ['#ffe4e9', '#fb6f8c', '#a80f34'], ink: '#4c0519', glow: 'rgba(225,29,72,0.45)' },
  sapphire: { ring: ['#dbeafe', '#2563eb', '#172554', '#93c5fd', '#1d4ed8', '#dbeafe'], face: ['#e6f0ff', '#5b9cf6', '#1a47c2'], ink: '#0f1f5c', glow: 'rgba(37,99,235,0.45)' },
  emerald: { ring: ['#d1fae5', '#16a34a', '#0d3d22', '#86efac', '#15803d', '#d1fae5'], face: ['#e7fbef', '#4cd07a', '#12793a'], ink: '#052e16', glow: 'rgba(22,163,74,0.45)' },
  amethyst: { ring: ['#ede9fe', '#7c3aed', '#3b1a75', '#c4b5fd', '#6d28d9', '#ede9fe'], face: ['#f1edff', '#a385f8', '#5b21b6'], ink: '#2e1065', glow: 'rgba(124,58,237,0.45)' },
  copper: { ring: ['#ffe4c7', '#ea580c', '#6b2a0d', '#fdba74', '#c2410c', '#ffe4c7'], face: ['#fff0e1', '#fb8f3f', '#b93d0a'], ink: '#431407', glow: 'rgba(234,88,12,0.45)' },
  slate: { ring: ['#e2e8f0', '#64748b', '#1e293b', '#cbd5e1', '#475569', '#e2e8f0'], face: ['#f1f5f9', '#94a3b8', '#3f4c5f'], ink: '#0f172a', glow: 'rgba(71,85,105,0.4)' },
  midnight: { ring: ['#c7d2fe', '#4338ca', '#0b1030', '#818cf8', '#312e81', '#c7d2fe'], face: ['#d5dcff', '#5b57d8', '#1c1a5e'], ink: '#e0e7ff', glow: 'rgba(67,56,202,0.5)' },
  rose: { ring: ['#fce7f3', '#db2777', '#6b0f3a', '#f9a8d4', '#be185d', '#fce7f3'], face: ['#ffe9f4', '#f06aae', '#a8145a'], ink: '#500724', glow: 'rgba(219,39,119,0.45)' },
  frost: { ring: ['#e0f2fe', '#38bdf8', '#0b3a56', '#bae6fd', '#0284c7', '#e0f2fe'], face: ['#eaf7ff', '#67cbf9', '#0a6ea3'], ink: '#082f49', glow: 'rgba(56,189,248,0.45)' },
};

export const CODE_THEME = {
  first_read: 'sapphire',
  books_read_5: 'sapphire',
  books_read_25: 'midnight',
  streak_7: 'copper',
  streak_30: 'ruby',
  streak_100: 'amethyst',
  streak_365: 'gold',
  checkins_100: 'emerald',
  checkins_500: 'gold',
  first_review: 'amethyst',
  first_comment: 'frost',
  first_follow: 'rose',
  followers_10: 'rose',
  followers_100: 'ruby',
  first_novel: 'gold',
  library_10: 'emerald',
  library_50: 'emerald',
  genre_fantasy: 'amethyst',
  genre_eastern: 'copper',
  genre_romance: 'rose',
  genre_horror: 'midnight',
  genre_scifi: 'frost',
  event_new_year: 'gold',
  event_halloween: 'copper',
  event_anniversary: 'sapphire',
  event_winter: 'frost',
  premium_member: 'gold',
  verified_reader: 'sapphire',
  night_owl: 'midnight',
  critic: 'amethyst',
  social_butterfly: 'rose',
};

export const CATEGORY_META = {
  reading: { label: 'Reading', icon: 'auto_stories', theme: 'sapphire' },
  social: { label: 'Community', icon: 'forum', theme: 'rose' },
  author: { label: 'Author', icon: 'edit', theme: 'gold' },
  milestones: { label: 'Milestones', icon: 'local_fire_department', theme: 'copper' },
  events: { label: 'Events', icon: 'celebration', theme: 'amethyst' },
  genre: { label: 'Genres', icon: 'category', theme: 'emerald' },
};

export const CATEGORY_ORDER = ['reading', 'milestones', 'social', 'genre', 'events', 'author'];

export function categoryMeta(category) {
  return CATEGORY_META[category] || { label: category || 'Badge', icon: 'emoji_events', theme: 'gold' };
}

export function themeFor(badge) {
  return BADGE_THEMES[CODE_THEME[badge?.code]]
    || BADGE_THEMES[categoryMeta(badge?.category).theme]
    || BADGE_THEMES.gold;
}

/** Rarity tier from the badge's XP value. */
export function tierFor(badge) {
  const xp = Number(badge?.xpReward) || 0;
  if (xp >= 300) return { key: 'legendary', label: 'Legendary', stars: 3 };
  if (xp >= 100) return { key: 'rare', label: 'Rare', stars: 2 };
  if (xp > 0) return { key: 'common', label: 'Common', stars: 1 };
  return { key: 'special', label: 'Special', stars: 0 };
}

export function formatEarnedDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
