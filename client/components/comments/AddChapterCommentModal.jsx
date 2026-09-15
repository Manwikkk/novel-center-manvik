'use client';

import { useEffect, useState } from 'react';
import Icon from '@/components/ui/Icon';
import RestrictionNotice from './RestrictionNotice';
import { useAuthStore } from '@/stores/authStore';
import { restrictionNotice } from '@/lib/suspensionRestrictions';
import { cn } from '@/lib/cn';

/**
 * Simple chapter comment modal — text only, no ratings / media / spoiler.
 */
export default function AddChapterCommentModal({
  open,
  onClose,
  onSubmit,
  title = 'Add a Chapter Comment',
  initialBody = '',
  submitLabel = 'Add',
}) {
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const user = useAuthStore((s) => s.user);
  const restriction = restrictionNotice(user, 'commenting');
  const [noticeOpen, setNoticeOpen] = useState(false);

  useEffect(() => {
    if (!open) setNoticeOpen(false);
  }, [open]);

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
      return;
    }
    setBody(initialBody || '');
    setBusy(false);
  }, [open, initialBody]);

  if (!open) return null;

  function revealRestriction() {
    if (restriction) setNoticeOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (restriction) {
      setNoticeOpen(true);
      return;
    }
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
      {/* Reader-themed (cream / sepia / dark), like the comments panel that opens it. */}
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-lg rounded-lg border border-[var(--reader-rule)] bg-[var(--reader-bg)] text-[var(--reader-fg)] shadow-2xl overflow-hidden"
      >
        <div className="h-1 bg-[#2563eb]" aria-hidden />
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 className="font-serif text-[20px] text-[var(--reader-fg)]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[var(--reader-muted)] hover:text-[var(--reader-fg)] rounded-lg"
            aria-label="Close"
          >
            <Icon name="close" size={22} />
          </button>
        </div>
        <div className="px-5 pb-5">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onFocus={revealRestriction}
            onClick={revealRestriction}
            readOnly={!!restriction}
            rows={8}
            autoFocus
            placeholder=""
            className={cn(
              'w-full resize-y border-0 bg-transparent p-0 text-[16px] leading-relaxed',
              'text-[var(--reader-fg)] placeholder:text-[var(--reader-muted)] focus:outline-none focus:ring-0',
              restriction && 'cursor-not-allowed',
            )}
          />
          {restriction && noticeOpen ? (
            <div className="mt-3">
              <RestrictionNotice notice={restriction} reader />
            </div>
          ) : null}
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={busy || !!restriction || !body.trim()}
              className="rounded-full bg-[#2563eb] px-10 py-2.5 text-[13px] font-semibold uppercase tracking-widest text-white hover:bg-[#1d4ed8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {busy ? 'Saving…' : submitLabel}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
