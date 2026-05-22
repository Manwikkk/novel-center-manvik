'use client';

import { useEffect, useState } from 'react';
import Icon from '@/components/ui/Icon';
import { cn } from '@/lib/cn';

/**
 * Simple chapter comment modal — text only, no ratings / media / spoiler.
 */
export default function AddChapterCommentModal({
  open,
  onClose,
  onSubmit,
  title = 'Add a Chapter Comment',
}) {
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

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
      setBody('');
      setBusy(false);
    }
  }, [open]);

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      await onSubmit?.({ body: trimmed });
      onClose?.();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-lg rounded-lg bg-white shadow-2xl overflow-hidden dark:bg-neutral-950"
      >
        <div className="h-1 bg-[#2563eb]" aria-hidden />
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 className="font-serif text-[20px] text-ink-900 dark:text-neutral-100">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-ink-400 hover:text-ink-900 dark:hover:text-neutral-200 rounded-lg"
            aria-label="Close"
          >
            <Icon name="close" size={22} />
          </button>
        </div>
        <div className="px-5 pb-5">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            autoFocus
            placeholder=""
            className={cn(
              'w-full resize-y border-0 bg-transparent p-0 text-[16px] leading-relaxed',
              'text-ink-800 placeholder:text-ink-300 focus:outline-none focus:ring-0',
              'dark:text-neutral-200 dark:placeholder:text-neutral-600',
            )}
          />
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={busy || !body.trim()}
              className="rounded-full bg-[#2563eb] px-10 py-2.5 text-[13px] font-semibold uppercase tracking-widest text-white hover:bg-[#1d4ed8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {busy ? 'Adding…' : 'Add'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
