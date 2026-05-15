'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/cn';

export default function CommentForm({
  onSubmit,
  placeholder = 'Share your thoughts…',
  compact = false,
  reader = false,
  showSpoilerOption = true,
}) {
  const [body, setBody] = useState('');
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      await onSubmit?.({ body: trimmed, isSpoiler: showSpoilerOption ? isSpoiler : false });
      setBody('');
      setIsSpoiler(false);
    } finally {
      setBusy(false);
    }
  }

  const ta = reader
    ? cn(
        'w-full rounded p-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--reader-accent)]/40',
        'bg-[var(--reader-fg)]/[0.06] border border-[var(--reader-rule)]',
        'text-[var(--reader-fg)] placeholder:text-[var(--reader-muted)]',
        'focus:border-[var(--reader-accent)]',
      )
    : cn(
        'w-full rounded p-3 text-[15px] focus:outline-none',
        'bg-cream-200/60 border border-ink-200/60 text-ink-900 placeholder-ink-400 focus:border-ink-900',
        'dark:bg-neutral-900/60 dark:border-neutral-700 dark:text-neutral-100 dark:placeholder-neutral-500 dark:focus:border-neutral-300',
      );

  const meta = reader ? 'text-[var(--reader-muted)]' : 'text-ink-400 dark:text-neutral-500';
  const chk = reader
    ? 'accent-[var(--reader-accent)] border-[var(--reader-rule)] text-[var(--reader-fg)]'
    : 'accent-ink-900 dark:accent-neutral-300 border-ink-300 dark:border-neutral-600';

  return (
    <form onSubmit={handleSubmit} className={cn('w-full')}>
      <textarea
        rows={compact ? 3 : 4}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        className={ta}
      />
      {showSpoilerOption && (
        <label
          className={cn(
            'mt-3 flex cursor-pointer items-start gap-3 text-[13px] leading-snug',
            reader ? 'text-[var(--reader-muted)]' : 'text-ink-600 dark:text-neutral-400',
          )}
        >
          <input
            type="checkbox"
            checked={isSpoiler}
            onChange={(e) => setIsSpoiler(e.target.checked)}
            className={cn('mt-0.5 h-4 w-4 shrink-0 rounded border', chk)}
          />
          <span>This comment reveals plot spoilers (hidden until readers choose to show it).</span>
        </label>
      )}
      <div className="mt-3 flex items-center justify-end gap-3">
        <span className={cn('text-[12px]', meta)}>{2000 - body.length} characters left</span>
        <Button
          type="submit"
          size="sm"
          disabled={busy || !body.trim()}
          className={
            reader
              ? cn(
                  '!bg-[var(--reader-fg)] !text-[var(--reader-bg)] border-0',
                  'hover:opacity-90 focus-visible:ring-[var(--reader-accent)]',
                )
              : undefined
          }
        >
          {busy ? 'Posting…' : 'Post'}
        </Button>
      </div>
    </form>
  );
}
