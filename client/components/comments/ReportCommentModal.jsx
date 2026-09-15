'use client';

import { useEffect, useState } from 'react';
import Icon from '@/components/ui/Icon';
import { cn } from '@/lib/cn';

const REASONS = [
  { value: 'spam', label: 'Spam or advertising' },
  { value: 'harassment', label: 'Harassment or abuse' },
  { value: 'spoilers', label: 'Unmarked spoilers' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'other', label: 'Other' },
];

export default function ReportCommentModal({
  open,
  onClose,
  onSubmit,
  reader = false,
  title = 'Report comment',
  reasons = REASONS,
}) {
  const [reason, setReason] = useState(reasons[0]?.value || 'spam');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setReason(reasons[0]?.value || 'spam');
      setDetails('');
      setBusy(false);
    }
  }, [open, reasons]);

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await onSubmit?.({ reason, details: details.trim() || null });
      onClose?.();
    } finally {
      setBusy(false);
    }
  }

  const shell = reader
    ? 'bg-[var(--reader-bg)] text-[var(--reader-fg)] border-[var(--reader-rule)]'
    : 'bg-white text-ink-900 border-neutral-200 dark:bg-neutral-950 dark:text-neutral-100 dark:border-neutral-800';

  const field = reader
    ? cn(
        'w-full rounded-lg border border-[var(--reader-rule)] bg-[var(--reader-fg)]/[0.04] px-3 py-2 text-[14px]',
        'text-[var(--reader-fg)] focus:outline-none focus:ring-2 focus:ring-[var(--reader-accent)]/40',
      )
    : cn(
        'w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-[14px]',
        'text-ink-900 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/25',
        'dark:border-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-100',
      );

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
        className={cn('relative w-full max-w-md rounded-xl border shadow-2xl', shell)}
      >
        <div className="flex items-center justify-between gap-4 border-b border-inherit px-5 py-4">
          <h2 className="font-serif text-[20px] leading-tight">{title}</h2>
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

        <div className="px-5 py-5 space-y-4">
          <label className="block">
            <span
              className={cn(
                'text-[13px] font-medium',
                reader ? 'text-[var(--reader-muted)]' : 'text-ink-600 dark:text-neutral-400',
              )}
            >
              Reason
            </span>
            <select value={reason} onChange={(e) => setReason(e.target.value)} className={cn('mt-2', field)}>
              {reasons.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span
              className={cn(
                'text-[13px] font-medium',
                reader ? 'text-[var(--reader-muted)]' : 'text-ink-600 dark:text-neutral-400',
              )}
            >
              Additional details (optional)
            </span>
            <textarea
              rows={3}
              maxLength={500}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Tell us more about the issue…"
              className={cn('mt-2 resize-y', field)}
            />
          </label>
        </div>

        <div className="flex justify-end gap-3 border-t border-inherit px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'rounded-full px-5 py-2 text-[12px] font-semibold uppercase tracking-widest',
              reader
                ? 'text-[var(--reader-muted)] hover:text-[var(--reader-fg)]'
                : 'text-ink-500 hover:text-ink-900 dark:text-neutral-400 dark:hover:text-neutral-100',
            )}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-full bg-[#2563eb] px-6 py-2 text-[12px] font-semibold uppercase tracking-widest text-white hover:bg-[#1d4ed8] disabled:opacity-50"
          >
            {busy ? 'Submitting…' : 'Submit report'}
          </button>
        </div>
      </form>
    </div>
  );
}
