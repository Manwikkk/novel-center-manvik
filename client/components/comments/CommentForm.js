'use client';

import { useState } from 'react';
import SpoilerToggle from './SpoilerToggle';
import { cn } from '@/lib/cn';

/**
 * Inline comment composer: bordered textarea with footer row (spoiler toggle + post).
 */
export default function CommentForm({
  onSubmit,
  placeholder = 'Share your thoughts…',
  compact = false,
  reader = false,
  showSpoilerOption = true,
  initialBody = '',
  initialIsSpoiler = false,
  submitLabel = 'Post',
}) {
  const [body, setBody] = useState(initialBody);
  const [isSpoiler, setIsSpoiler] = useState(initialIsSpoiler);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      await onSubmit?.({ body: trimmed, isSpoiler: showSpoilerOption ? isSpoiler : false });
      if (!initialBody) {
        setBody('');
        setIsSpoiler(false);
      }
    } finally {
      setBusy(false);
    }
  }

  const box = reader
    ? 'rounded-lg border border-[var(--reader-rule)] bg-[var(--reader-fg)]/[0.03] overflow-hidden'
    : 'rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 overflow-hidden';

  const ta = reader
    ? cn(
        'w-full resize-y bg-transparent px-4 py-3 text-[15px] focus:outline-none',
        'text-[var(--reader-fg)] placeholder:text-[var(--reader-muted)]',
      )
    : cn(
        'w-full resize-y bg-transparent px-4 py-3 text-[15px] focus:outline-none',
        'text-ink-900 placeholder:text-ink-400 dark:text-neutral-100 dark:placeholder:text-neutral-500',
      );

  const footer = reader
    ? 'border-t border-[var(--reader-rule)] bg-[var(--reader-fg)]/[0.02]'
    : 'border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-900/40';

  const meta = reader ? 'text-[var(--reader-muted)]' : 'text-ink-400 dark:text-neutral-500';

  const postBtn = cn(
    'rounded-md px-5 py-2 text-[12px] font-semibold uppercase tracking-widest transition-colors',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    reader
      ? 'bg-[var(--reader-fg)] text-[var(--reader-bg)] hover:opacity-90'
      : 'bg-ink-900 text-white hover:opacity-90 dark:bg-white dark:text-black',
  );

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className={box}>
        <textarea
          rows={compact ? 3 : 4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={placeholder}
          className={ta}
        />
        <div className={cn('flex flex-wrap items-center justify-between gap-3 px-4 py-3', footer)}>
          {showSpoilerOption ? (
            <SpoilerToggle checked={isSpoiler} onChange={setIsSpoiler} reader={reader} />
          ) : (
            <span />
          )}
          <div className="flex items-center gap-3 ml-auto">
            <span className={cn('text-[12px] tabular-nums', meta)}>
              {2000 - body.length} characters left
            </span>
            <button type="submit" disabled={busy || !body.trim()} className={postBtn}>
              {busy ? 'Saving…' : submitLabel}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
