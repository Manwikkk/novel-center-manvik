'use client';

import { useEffect, useMemo, useState } from 'react';
import Icon from '@/components/ui/Icon';
import SpoilerToggle from './SpoilerToggle';
import StarRatingInput, { REVIEW_CATEGORIES, StarRatingDisplay, averageRating } from './StarRatingInput';
import { cn } from '@/lib/cn';

const EMPTY_RATINGS = Object.fromEntries(REVIEW_CATEGORIES.map((c) => [c.key, 0]));

export default function WriteReviewModal({
  open,
  onClose,
  onSubmit,
  reader = false,
  initialReview = null,
  title = 'Write a review',
  submitLabel = 'Post',
}) {
  const [ratings, setRatings] = useState(EMPTY_RATINGS);
  const [body, setBody] = useState('');
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [busy, setBusy] = useState(false);

  const total = useMemo(() => averageRating(ratings), [ratings]);
  const ratedCount = REVIEW_CATEGORIES.filter((c) => ratings[c.key] >= 1).length;

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setRatings(EMPTY_RATINGS);
      setBody('');
      setIsSpoiler(false);
      setBusy(false);
      return;
    }
    if (initialReview) {
      setRatings({ ...EMPTY_RATINGS, ...(initialReview.reviewRatings || {}) });
      setBody(initialReview.body || '');
      setIsSpoiler(Boolean(initialReview.isSpoiler));
    } else {
      setRatings(EMPTY_RATINGS);
      setBody('');
      setIsSpoiler(false);
    }
    setBusy(false);
  }, [open, initialReview]);

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    if (ratedCount < REVIEW_CATEGORIES.length) return;
    setBusy(true);
    try {
      const payload = {
        body: trimmed,
        isSpoiler,
        reviewRatings: Object.fromEntries(
          REVIEW_CATEGORIES.map((c) => [c.key, ratings[c.key]]),
        ),
      };
      await onSubmit?.(payload);
      onClose?.();
    } finally {
      setBusy(false);
    }
  }

  const shell = reader
    ? 'bg-[var(--reader-bg)] text-[var(--reader-fg)] border-[var(--reader-rule)]'
    : 'bg-white text-ink-900 border-neutral-200 dark:bg-neutral-950 dark:text-neutral-100 dark:border-neutral-800';

  const ta = reader
    ? cn(
        'w-full min-h-[140px] resize-y rounded-lg border border-[var(--reader-rule)] bg-[var(--reader-fg)]/[0.04] p-4 text-[15px]',
        'text-[var(--reader-fg)] placeholder:text-[var(--reader-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--reader-accent)]/40',
      )
    : cn(
        'w-full min-h-[140px] resize-y rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-[15px]',
        'text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/25',
        'dark:border-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-100 dark:placeholder:text-neutral-500',
      );

  const scoreBox = reader
    ? 'border-[var(--reader-rule)] bg-[var(--reader-fg)]/[0.04]'
    : 'border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900/50';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <form
        onSubmit={handleSubmit}
        className={cn(
          'relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border shadow-2xl',
          shell,
        )}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-inherit bg-inherit px-5 py-4 md:px-6">
          <h2 className="font-serif text-[22px] md:text-[26px] leading-tight">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'p-2 rounded-lg transition-colors',
              reader ? 'hover:bg-[var(--reader-fg)]/10' : 'hover:bg-neutral-100 dark:hover:bg-neutral-800',
            )}
            aria-label="Close"
          >
            <Icon name="close" size={22} />
          </button>
        </div>

        <div className="px-5 py-5 md:px-6 md:py-6">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 md:gap-8">
            <StarRatingInput ratings={ratings} onChange={setRatings} reader={reader} />
            <div
              className={cn(
                'flex flex-col items-center justify-center rounded-lg border px-6 py-5 min-w-[140px] text-center',
                scoreBox,
              )}
            >
              <p
                className={cn(
                  'text-xs uppercase tracking-wider mb-2',
                  reader ? 'text-[var(--reader-muted)]' : 'text-ink-500 dark:text-neutral-400',
                )}
              >
                The total score
              </p>
              <p className="text-[32px] font-bold tabular-nums leading-none">{total.toFixed(1)}</p>
              <div className="mt-3">
                <StarRatingDisplay value={total} size={16} />
              </div>
            </div>
          </div>

          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            placeholder="Type your review here. Please write your review as detailed as you can. Your reviews would be very important to the story (at least 140 characters)."
            className={cn('mt-6', ta)}
          />

          <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
            <SpoilerToggle checked={isSpoiler} onChange={setIsSpoiler} reader={reader} />
            <div className="flex items-center gap-4 ml-auto">
              <span
                className={cn(
                  'text-[12px] tabular-nums',
                  reader ? 'text-[var(--reader-muted)]' : 'text-ink-400 dark:text-neutral-500',
                )}
              >
                {2000 - body.length} characters left
              </span>
              <button
                type="submit"
                disabled={busy || !body.trim() || ratedCount < REVIEW_CATEGORIES.length}
                className={cn(
                  'rounded-full px-8 py-2.5 text-[12px] font-semibold uppercase tracking-widest transition-colors',
                  'bg-[#2563eb] text-white hover:bg-[#1d4ed8] disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              >
                {busy ? 'Saving…' : submitLabel}
              </button>
            </div>
          </div>
          {ratedCount < REVIEW_CATEGORIES.length ? (
            <p className={cn('mt-2 text-[12px]', reader ? 'text-[var(--reader-muted)]' : 'text-ink-500 dark:text-neutral-400')}>
              Rate all five categories before posting.
            </p>
          ) : null}
        </div>
      </form>
    </div>
  );
}
