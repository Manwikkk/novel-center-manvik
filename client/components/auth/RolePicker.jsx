'use client';

import { cn } from '@/lib/cn';

export default function RolePicker({ value, onChange, className }) {
  return (
    <fieldset className={className}>
      <legend className="label-sm uppercase tracking-[0.2em] text-ink-500 dark:text-neutral-400">
        I&rsquo;m here to
      </legend>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {[
          { value: 'user', label: 'Read', hint: 'Discover and read novels' },
          { value: 'author', label: 'Write', hint: 'Publish your stories' },
        ].map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange?.(opt.value)}
              className={cn(
                'rounded-lg border p-3 text-left transition-colors',
                active
                  ? 'border-ink-900 bg-ink-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-black'
                  : 'border-neutral-200 text-ink-900 hover:border-ink-400 dark:border-neutral-700 dark:text-neutral-100 dark:hover:border-neutral-500',
              )}
            >
              <span className="font-semibold uppercase tracking-wider text-[11px]">{opt.label}</span>
              <span className={cn('mt-1 block text-[11px] leading-snug', active ? 'opacity-90' : 'text-ink-500 dark:text-neutral-400')}>
                {opt.hint}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
