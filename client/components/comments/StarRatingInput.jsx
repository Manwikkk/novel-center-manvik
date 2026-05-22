'use client';

import Icon from '@/components/ui/Icon';
import { cn } from '@/lib/cn';

export const REVIEW_CATEGORIES = [
  { key: 'writingQuality', label: 'Writing Quality' },
  { key: 'stabilityOfUpdates', label: 'Stability of Updates' },
  { key: 'storyDevelopment', label: 'Story Development' },
  { key: 'characterDesign', label: 'Character Design' },
  { key: 'worldBackground', label: 'World Background' },
];

export function averageRating(ratings) {
  const vals = REVIEW_CATEGORIES.map((c) => ratings[c.key]).filter((n) => n >= 1 && n <= 5);
  if (!vals.length) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function StarRow({ value, onChange, size = 22 }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => {
        const star = i + 1;
        const filled = star <= value;
        return (
          <button
            key={star}
            type="button"
            aria-label={`${star} star${star !== 1 ? 's' : ''}`}
            onClick={() => onChange(star === value ? 0 : star)}
            className="p-0.5 rounded transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]/40"
          >
            <Icon
              name="star"
              filled={filled}
              size={size}
              className={filled ? 'text-[#ff8a00]' : 'text-[#ff8a00]/25'}
            />
          </button>
        );
      })}
    </div>
  );
}

export function StarRatingDisplay({ value = 0, size = 18 }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  const out = [];
  for (let i = 0; i < full; i += 1) {
    out.push(<Icon key={`f${i}`} name="star" filled size={size} className="text-[#ff8a00]" />);
  }
  if (half) out.push(<Icon key="h" name="star_half" size={size} className="text-[#ff8a00]" />);
  while (out.length < 5) {
    out.push(<Icon key={`e${out.length}`} name="star" size={size} className="text-[#ff8a00]/30" />);
  }
  return <div className="flex items-center gap-0.5">{out}</div>;
}

export default function StarRatingInput({ ratings, onChange, reader = false }) {
  return (
    <ul className="space-y-3">
      {REVIEW_CATEGORIES.map(({ key, label }) => (
        <li key={key} className="flex items-center justify-between gap-4">
          <span
            className={cn(
              'text-sm shrink-0',
              reader ? 'text-[var(--reader-muted)]' : 'text-ink-600 dark:text-neutral-400',
            )}
          >
            {label}
          </span>
          <StarRow
            value={ratings[key] || 0}
            onChange={(v) => onChange({ ...ratings, [key]: v })}
          />
        </li>
      ))}
    </ul>
  );
}
