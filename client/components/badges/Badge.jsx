'use client';

import { useId } from 'react';
import Icon from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { themeFor, tierFor } from '@/lib/badges';

/** Heights in px; the crest is 100 wide × 120 tall in viewBox units. */
const SIZES = { xs: 40, sm: 58, md: 80, lg: 112, xl: 160 };

const SHIELD = 'M50 3 L90 15 V56 C90 85 71 106 50 117 C29 106 10 85 10 56 V15 Z';
const SHIELD_INNER = 'M50 11 L83 21 V56 C83 80 67 98 50 108 C33 98 17 80 17 56 V21 Z';
const GLOSS = 'M17 21 L83 21 V50 Q50 62 17 50 Z';

const TIER_RIBBON = {
  legendary: { bg: 'linear-gradient(180deg,#f6e27a,#b8860b)', color: '#3a2a05' },
  rare: { bg: 'linear-gradient(180deg,#c4b5fd,#6d28d9)', color: '#f5f3ff' },
  common: { bg: 'linear-gradient(180deg,#f1f1f1,#b9b9b9)', color: '#2a2a2a' },
  special: { bg: 'linear-gradient(180deg,#bae6fd,#0284c7)', color: '#082f49' },
};

/** The crest artwork in one colour scheme (full colour or slate/locked). */
function Crest({ uid, theme, locked, stars, shimmer }) {
  const frameStops = locked ? ['#e4e4e4', '#9d9d9d', '#5f5f5f', '#cfcfcf', '#8a8a8a', '#e4e4e4'] : theme.ring;
  const field = locked ? ['#ececec', '#c8c8c8', '#9a9a9a'] : theme.face;
  return (
    <svg viewBox="0 0 100 120" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
      <defs>
        <linearGradient id={`${uid}-frame`} x1="0" y1="0" x2="1" y2="1">
          {frameStops.map((c, i) => (
            <stop key={i} offset={`${(i / (frameStops.length - 1)) * 100}%`} stopColor={c} />
          ))}
        </linearGradient>
        <linearGradient id={`${uid}-field`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor={field[0]} />
          <stop offset="55%" stopColor={field[1]} />
          <stop offset="100%" stopColor={field[2]} />
        </linearGradient>
        <linearGradient id={`${uid}-gloss`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${uid}-shine`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fff" stopOpacity="0" />
          <stop offset="50%" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <pattern id={`${uid}-hatch`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="5" stroke="#fff" strokeOpacity={locked ? 0.08 : 0.14} strokeWidth="1.6" />
        </pattern>
        <clipPath id={`${uid}-clip`}><path d={SHIELD_INNER} /></clipPath>
      </defs>

      {/* frame */}
      <path d={SHIELD} fill={`url(#${uid}-frame)`} stroke={locked ? '#8f8f8f' : 'rgba(0,0,0,0.25)'} strokeWidth="1" strokeDasharray={locked ? '3 2' : undefined} />
      {/* enamel field + texture + gloss */}
      <path d={SHIELD_INNER} fill={`url(#${uid}-field)`} />
      <path d={SHIELD_INNER} fill={`url(#${uid}-hatch)`} />
      <path d={GLOSS} fill={`url(#${uid}-gloss)`} clipPath={`url(#${uid}-clip)`} />
      <path d={SHIELD_INNER} fill="none" stroke="#000" strokeOpacity="0.22" strokeWidth="1.2" />
      {/* tier gems along the top edge */}
      {!locked && stars > 0 ? (
        [0, 1, 2].slice(0, stars).map((i) => {
          const x = stars === 1 ? 50 : stars === 2 ? 43 + i * 14 : 38 + i * 12;
          return (
            <polygon
              key={i}
              points={`${x},14 ${x + 3.2},18 ${x},22 ${x - 3.2},18`}
              fill="#fff"
              fillOpacity="0.95"
              stroke="rgba(0,0,0,0.2)"
              strokeWidth="0.6"
            />
          );
        })
      ) : null}
      {/* periodic shimmer */}
      {shimmer ? (
        <g clipPath={`url(#${uid}-clip)`}>
          <rect x="-60" y="0" width="40" height="120" fill={`url(#${uid}-shine)`} className="badge-shimmer" style={{ transform: 'skewX(-18deg)' }} />
        </g>
      ) : null}
    </svg>
  );
}

/**
 * Crest badge. Earned badges are enamel shields in their category colours with
 * a metallic frame, tier gems and a slow shimmer. Locked badges are slate
 * crests that fill with colour from the bottom as the reader gets closer —
 * the fill line is the progress meter — and the lock nudges on hover.
 */
export default function Badge({
  badge,
  size = 'md',
  onClick,
  showTooltip = false,
  showRibbon,
  celebrate = false,
  className,
  ariaLabel,
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  if (!badge) return null;

  const h = typeof size === 'number' ? size : SIZES[size] || SIZES.md;
  const w = Math.round(h * (100 / 120));
  const theme = themeFor(badge);
  const tier = tierFor(badge);
  const earned = badge.earned !== false;
  const pct = earned ? 100 : Math.max(0, Math.min(100, Number(badge.progress?.percent) || 0));
  const ribbon = showRibbon ?? h >= SIZES.md;
  const iconSize = Math.round(h * 0.36);
  const legendary = earned && tier.key === 'legendary';

  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      aria-label={ariaLabel || `${badge.title}${earned ? '' : ` (locked, ${pct}% complete)`}`}
      className={cn(
        'group relative inline-flex shrink-0 select-none items-center justify-center outline-none',
        onClick && 'cursor-pointer focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 dark:focus-visible:ring-offset-black',
        className,
      )}
      style={{ width: w, height: h }}
    >
      {/* aura */}
      {earned ? (
        <div
          className={cn('pointer-events-none absolute rounded-full transition-opacity duration-300', legendary ? 'badge-aura opacity-80' : 'opacity-50 group-hover:opacity-90')}
          style={{ inset: `${Math.round(h * 0.06)}px`, background: `radial-gradient(circle, ${theme.glow} 0%, transparent 68%)`, filter: `blur(${Math.round(h * 0.12)}px)` }}
          aria-hidden="true"
        />
      ) : null}

      <div className={cn('relative h-full w-full transition-transform duration-300 ease-out', onClick && earned && 'group-hover:-translate-y-1 group-hover:scale-[1.03]', celebrate && 'badge-pop')}>
        {/* slate crest: the locked look, also the base the unlock animation fills over */}
        {!earned || celebrate ? <Crest uid={`${uid}l`} theme={theme} locked stars={0} /> : null}
        {/* colour crest — clipped from the bottom by progress while locked; fills up when celebrating */}
        <div
          className={cn('absolute inset-0', celebrate && 'badge-fill-anim')}
          style={{ clipPath: earned || celebrate ? undefined : `inset(${100 - pct}% 0 0 0)`, animationDelay: celebrate ? '500ms' : undefined }}
          aria-hidden="true"
        >
          <Crest uid={`${uid}c`} theme={theme} locked={false} stars={tier.stars} shimmer={earned} />
        </div>
        {/* liquid line */}
        {!earned && pct > 0 && pct < 100 ? (
          <div
            className="badge-wave pointer-events-none absolute left-[12%] right-[12%] h-[2px] rounded-full"
            style={{ top: `${100 - pct}%`, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.95), transparent)', backgroundSize: '200% 100%' }}
            aria-hidden="true"
          />
        ) : null}

        {/* icon */}
        <div
          className="absolute inset-x-0 flex items-center justify-center"
          style={{ top: '14%', height: '52%', color: earned ? theme.ink : '#6f6f6f' }}
          aria-hidden="true"
        >
          <Icon name={badge.icon || 'emoji_events'} size={iconSize} filled className={cn(earned && 'drop-shadow-[0_2px_2px_rgba(0,0,0,0.28)]')} />
        </div>

        {/* ribbon */}
        {ribbon ? (
          <div
            className="pointer-events-none absolute left-1/2 flex -translate-x-1/2 items-center justify-center whitespace-nowrap font-sans font-bold uppercase shadow-md"
            style={{
              top: '69%',
              width: '112%',
              height: `${Math.round(h * 0.16)}px`,
              fontSize: `${Math.max(7, Math.round(h * 0.085))}px`,
              letterSpacing: '0.12em',
              clipPath: 'polygon(0 0, 100% 0, 94% 50%, 100% 100%, 0 100%, 6% 50%)',
              background: earned ? TIER_RIBBON[tier.key].bg : 'linear-gradient(180deg,#dcdcdc,#a5a5a5)',
              color: earned ? TIER_RIBBON[tier.key].color : '#3b3b3b',
            }}
            aria-hidden="true"
          >
            {earned ? tier.label : pct > 0 ? `${pct}%` : 'Locked'}
          </div>
        ) : null}

        {/* lock */}
        {!earned ? (
          <span
            className="badge-lock absolute flex items-center justify-center rounded-full bg-neutral-900 text-white shadow-md ring-2 ring-white dark:ring-neutral-900"
            style={{ width: Math.round(h * 0.26), height: Math.round(h * 0.26), right: -Math.round(h * 0.02), top: `${ribbon ? 52 : 62}%` }}
            aria-hidden="true"
          >
            <Icon name="lock" size={Math.round(h * 0.14)} filled />
          </span>
        ) : null}
      </div>

      {showTooltip ? (
        <div className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 w-44 -translate-x-1/2 rounded-md bg-neutral-900 px-2.5 py-2 text-center text-[11px] text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
          <p className="font-semibold">{badge.title}</p>
          {badge.description ? <p className="mt-0.5 text-[10px] leading-snug text-neutral-300">{badge.description}</p> : null}
          {!earned && badge.progress?.current != null ? (
            <p className="mt-1 text-[10px] font-semibold text-gold">{badge.progress.current} / {badge.progress.target}</p>
          ) : null}
        </div>
      ) : null}
    </Tag>
  );
}
