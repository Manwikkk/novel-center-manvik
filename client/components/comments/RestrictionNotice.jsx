'use client';

import Icon from '@/components/ui/Icon';
import { cn } from '@/lib/cn';

/**
 * Inline notice shown inside comment / review composers when the signed-in
 * user is restricted from that action. `notice` comes from
 * restrictionNotice() and carries the duration for every active restriction.
 */
export default function RestrictionNotice({ notice, reader = false, className }) {
  if (!notice) return null;

  return (
    <div
      role="alert"
      className={cn(
        'rounded-lg border px-4 py-3 text-[13px] leading-relaxed',
        reader
          ? 'border-danger/40 bg-danger/10 text-[var(--reader-fg)]'
          : 'border-danger/40 bg-danger/5 text-ink-800 dark:text-neutral-200',
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <Icon name="block" size={18} className="mt-0.5 shrink-0 text-danger" />
        <div className="min-w-0">
          <p className="font-semibold text-danger">{notice.title}</p>
          <p className="mt-0.5">{notice.message}</p>
          <p className={cn('mt-1.5 text-[12px]', reader ? 'text-[var(--reader-muted)]' : 'text-ink-500 dark:text-neutral-400')}>
            {notice.duration}
            {notice.active.length ? ` · Active restrictions: ${notice.active.join(', ')}` : ''}
          </p>
        </div>
      </div>
    </div>
  );
}
