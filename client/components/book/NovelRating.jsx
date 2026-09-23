'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { openAuthModal } from '@/lib/authModal';
import { cn } from '@/lib/cn';

/** A star score on the novel. This is not a review and does not award coins. */
export default function NovelRating({ bookId }) {
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const [score, setScore] = useState(null);
  const [hover, setHover] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!hydrated || !user || !bookId) {
      setScore(null);
      return undefined;
    }
    let cancelled = false;
    api.get(`/books/${bookId}/rating`)
      .then((data) => {
        if (!cancelled) setScore(data.rating?.score || null);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [hydrated, user, bookId]);

  async function choose(next) {
    if (!user) {
      openAuthModal({ tab: 'login' });
      return;
    }
    setBusy(true);
    setError('');
    try {
      const data = await api.put(`/books/${bookId}/rating`, { score: next });
      setScore(data.rating?.score || next);
    } catch (err) {
      setError(err.message || 'Could not save your rating');
    } finally {
      setBusy(false);
    }
  }

  const shown = hover || score || 0;

  return (
    <div className="mt-4">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-500 dark:text-neutral-500">Your rating</p>
      <div className="mt-1 flex items-center gap-1" role="radiogroup" aria-label="Rate this novel">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={score === value}
            disabled={busy}
            onMouseEnter={() => setHover(value)}
            onMouseLeave={() => setHover(0)}
            onClick={() => choose(value)}
            className={cn(
              'text-[22px] leading-none disabled:opacity-50',
              value <= shown ? 'text-gold-dim dark:text-gold' : 'text-neutral-300 dark:text-neutral-700',
            )}
          >
            ★
          </button>
        ))}
        <span className="ml-2 text-[12px] text-ink-500 dark:text-neutral-500">
          {score ? `${score}/5` : 'Not rated'}
        </span>
      </div>
      {error ? <p className="mt-1 text-[12px] text-red-600">{error}</p> : null}
    </div>
  );
}
