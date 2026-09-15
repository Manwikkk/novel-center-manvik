'use client';

import Icon from '@/components/ui/Icon';
import { EXPERIENCE_OPTIONS } from '@/lib/experience';
import { cn } from '@/lib/cn';

/**
 * "I'm here to…" choice: read, write, or both. The value is an experience
 * (`reader` | `creator` | `both`); callers map it to the account role.
 *
 * `surface="light"` is for the auth cards, which stay light in site dark mode —
 * there the dark-mode variants would paint the selected option white-on-white.
 */
export default function RolePicker({ value, onChange, className, surface = 'auto' }) {
  const light = surface === 'light';
  return (
    <fieldset className={className}>
      <legend className={cn('label-sm uppercase tracking-[0.2em] text-ink-500', !light && 'dark:text-neutral-400')}>
        I&rsquo;m here to
      </legend>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {EXPERIENCE_OPTIONS.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange?.(opt.value)}
              aria-pressed={active}
              title={opt.hint}
              className={cn(
                'flex min-h-[92px] flex-col items-start gap-1.5 rounded-lg border p-3 text-left transition-colors',
                active
                  ? cn('border-ink-900 bg-ink-900 text-white', !light && 'dark:border-neutral-100 dark:bg-neutral-100 dark:text-black')
                  : cn('border-neutral-200 text-ink-900 hover:border-ink-400', !light && 'dark:border-neutral-700 dark:text-neutral-100 dark:hover:border-neutral-500'),
              )}
            >
              <Icon name={opt.icon} size={20} className={active ? 'opacity-90' : cn('text-ink-500', !light && 'dark:text-neutral-400')} />
              <span className="font-semibold uppercase tracking-wider text-[11px]">{opt.label}</span>
              <span className={cn('block text-[11px] leading-snug', active ? 'opacity-90' : cn('text-ink-500', !light && 'dark:text-neutral-400'))}>
                {opt.hint}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
