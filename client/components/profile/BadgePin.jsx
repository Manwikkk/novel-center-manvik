'use client';

import { useState } from 'react';
import Icon from '@/components/ui/Icon';
import { cn } from '@/lib/cn';

/** Visual themes for enamel-style tombstone badges */
const THEMES = {
  gold: {
    rim: 'from-[#f6e27a] via-[#d4af37] to-[#8a6a12]',
    face: 'from-[#fff6c8] via-[#f0d36a] to-[#c9a227]',
    ink: 'text-[#5c4208]',
    glow: 'shadow-[0_6px_14px_rgba(180,130,20,0.35)]',
  },
  ruby: {
    rim: 'from-[#ffb3c1] via-[#e11d48] to-[#7f1d1d]',
    face: 'from-[#fecdd3] via-[#fb7185] to-[#be123c]',
    ink: 'text-[#4c0519]',
    glow: 'shadow-[0_6px_14px_rgba(190,40,70,0.35)]',
  },
  sapphire: {
    rim: 'from-[#93c5fd] via-[#2563eb] to-[#1e3a8a]',
    face: 'from-[#dbeafe] via-[#60a5fa] to-[#1d4ed8]',
    ink: 'text-[#172554]',
    glow: 'shadow-[0_6px_14px_rgba(37,99,235,0.35)]',
  },
  emerald: {
    rim: 'from-[#86efac] via-[#16a34a] to-[#14532d]',
    face: 'from-[#dcfce7] via-[#4ade80] to-[#15803d]',
    ink: 'text-[#052e16]',
    glow: 'shadow-[0_6px_14px_rgba(22,163,74,0.35)]',
  },
  amethyst: {
    rim: 'from-[#d8b4fe] via-[#7c3aed] to-[#4c1d95]',
    face: 'from-[#ede9fe] via-[#a78bfa] to-[#6d28d9]',
    ink: 'text-[#2e1065]',
    glow: 'shadow-[0_6px_14px_rgba(124,58,237,0.35)]',
  },
  copper: {
    rim: 'from-[#fdba74] via-[#ea580c] to-[#7c2d12]',
    face: 'from-[#ffedd5] via-[#fb923c] to-[#c2410c]',
    ink: 'text-[#431407]',
    glow: 'shadow-[0_6px_14px_rgba(234,88,12,0.35)]',
  },
  slate: {
    rim: 'from-[#cbd5e1] via-[#64748b] to-[#334155]',
    face: 'from-[#f1f5f9] via-[#94a3b8] to-[#475569]',
    ink: 'text-[#0f172a]',
    glow: 'shadow-[0_6px_14px_rgba(71,85,105,0.35)]',
  },
  midnight: {
    rim: 'from-[#a5b4fc] via-[#312e81] to-[#0f172a]',
    face: 'from-[#c7d2fe] via-[#4338ca] to-[#1e1b4b]',
    ink: 'text-[#e0e7ff]',
    glow: 'shadow-[0_6px_14px_rgba(49,46,129,0.4)]',
  },
  rose: {
    rim: 'from-[#fbcfe8] via-[#db2777] to-[#831843]',
    face: 'from-[#fce7f3] via-[#f472b6] to-[#be185d]',
    ink: 'text-[#500724]',
    glow: 'shadow-[0_6px_14px_rgba(219,39,119,0.35)]',
  },
  frost: {
    rim: 'from-[#e0f2fe] via-[#38bdf8] to-[#0c4a6e]',
    face: 'from-[#f0f9ff] via-[#7dd3fc] to-[#0284c7]',
    ink: 'text-[#082f49]',
    glow: 'shadow-[0_6px_14px_rgba(14,165,233,0.35)]',
  },
};

const CODE_THEME = {
  first_read: 'sapphire',
  books_read_5: 'sapphire',
  books_read_25: 'midnight',
  streak_7: 'copper',
  streak_30: 'ruby',
  streak_365: 'gold',
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

const CATEGORY_THEME = {
  reading: 'sapphire',
  social: 'rose',
  author: 'gold',
  milestones: 'copper',
  events: 'amethyst',
  genre: 'emerald',
};

function shortLabel(title = '') {
  const t = String(title).trim();
  if (t.length <= 10) return t.toUpperCase();
  const words = t.split(/\s+/);
  if (words.length === 1) return t.slice(0, 8).toUpperCase();
  return words
    .slice(0, 2)
    .map((w) => w.slice(0, 5))
    .join(' ')
    .toUpperCase();
}

function themeFor(badge) {
  return (
    THEMES[CODE_THEME[badge?.code]]
    || THEMES[CATEGORY_THEME[badge?.category]]
    || THEMES.gold
  );
}

/**
 * Enamel / tombstone badge pin inspired by WebNovel profile badges.
 */
export default function BadgePin({
  badge,
  size = 'md',
  showTooltip = true,
  className,
}) {
  const [hover, setHover] = useState(false);
  if (!badge) return null;

  const theme = themeFor(badge);
  const earned = badge.earned !== false;
  const dims = size === 'lg'
    ? { w: 'w-[72px]', h: 'h-[92px]', icon: 30, text: 'text-[8px]' }
    : size === 'sm'
      ? { w: 'w-[48px]', h: 'h-[62px]', icon: 20, text: 'text-[7px]' }
      : { w: 'w-[58px]', h: 'h-[76px]', icon: 26, text: 'text-[7.5px]' };

  return (
    <div
      className={cn('relative shrink-0', dims.w, className)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div
        className={cn(
          'relative mx-auto overflow-hidden transition-transform duration-200',
          dims.w,
          dims.h,
          earned ? theme.glow : 'opacity-40 grayscale',
          hover && earned && '-translate-y-1 rotate-[-2deg]',
        )}
        style={{
          borderRadius: '28px 28px 10px 10px / 34px 34px 10px 10px',
        }}
      >
        {/* Metallic rim */}
        <div className={cn('absolute inset-0 bg-gradient-to-br', theme.rim)} />
        {/* Inner face */}
        <div
          className={cn(
            'absolute inset-[3px] flex flex-col items-center justify-between bg-gradient-to-b pb-1.5 pt-3',
            theme.face,
          )}
          style={{
            borderRadius: '25px 25px 7px 7px / 30px 30px 7px 7px',
          }}
        >
          <div className={cn('flex flex-1 items-center justify-center drop-shadow-sm', theme.ink)}>
            <Icon name={badge.icon || 'emoji_events'} size={dims.icon} filled />
          </div>
          <div
            className={cn(
              'mx-1 w-[calc(100%-8px)] rounded-sm bg-black/25 px-0.5 py-0.5 text-center font-bold leading-tight tracking-wide text-white backdrop-blur-[1px]',
              dims.text,
            )}
          >
            <span className="line-clamp-2">{shortLabel(badge.title)}</span>
          </div>
        </div>
        {/* Shine */}
        <div className="pointer-events-none absolute inset-x-2 top-1 h-4 rounded-full bg-white/35 blur-[2px]" />
      </div>

      {showTooltip && hover ? (
        <div className="absolute left-1/2 top-full z-30 mt-2 w-44 -translate-x-1/2 rounded-md bg-neutral-900 px-2.5 py-2 text-center text-[11px] text-white shadow-lg">
          <p className="font-semibold">{badge.title}</p>
          {badge.description ? (
            <p className="mt-0.5 text-[10px] leading-snug text-neutral-300">{badge.description}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function BadgePinRow({ badges = [], emptyText = 'No badges yet.' }) {
  if (!badges.length) {
    return <p className="mt-3 text-[14px] text-ink-500 dark:text-neutral-500">{emptyText}</p>;
  }
  return (
    <div className="mt-4 flex flex-wrap gap-x-3 gap-y-4">
      {badges.map((b) => (
        <BadgePin key={b.id || b.code} badge={b} />
      ))}
    </div>
  );
}
