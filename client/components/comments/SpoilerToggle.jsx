'use client';

import { cn } from '@/lib/cn';

/**
 * Pill toggle for marking a comment/review as containing spoilers.
 */
export default function SpoilerToggle({ checked, onChange, disabled = false, reader = false, className }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-semibold uppercase tracking-wider transition-colors',
        checked
          ? reader
            ? 'border-[var(--reader-accent)] bg-[var(--reader-accent)]/20 text-[var(--reader-fg)]'
            : 'border-[#2563eb] bg-[#2563eb]/10 text-ink-900 dark:border-[#3b82f6] dark:bg-[#2563eb]/20 dark:text-neutral-100'
          : reader
            ? 'border-[var(--reader-rule)] text-[var(--reader-muted)] hover:border-[var(--reader-fg)]/30'
            : 'border-neutral-300 text-ink-500 hover:border-ink-400 dark:border-neutral-600 dark:text-neutral-400 dark:hover:border-neutral-500',
        disabled && 'opacity-50 cursor-not-allowed',
        className,
      )}
    >
      <span
        className={cn(
          'relative h-5 w-9 shrink-0 rounded-full transition-colors',
          checked
            ? 'bg-[#2563eb]'
            : reader
              ? 'bg-[var(--reader-rule)]'
              : 'bg-neutral-300 dark:bg-neutral-600',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-4' : 'translate-x-0',
          )}
        />
      </span>
      <span>Spoiler</span>
    </button>
  );
}
