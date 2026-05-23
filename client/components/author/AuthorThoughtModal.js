'use client';

import { useEffect, useState } from 'react';
import Icon from '@/components/ui/Icon';
import { cn } from '@/lib/cn';

export default function AuthorThoughtModal({
  open,
  onClose,
  initialValue = '',
  onSubmit,
}) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setText(initialValue || '');
    setBusy(false);
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, initialValue, onClose]);

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await onSubmit?.(text.trim());
      onClose?.();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-2xl rounded-lg border border-surface-variant bg-surface-container-lowest shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-variant">
          <h2 className="text-[13px] font-bold uppercase tracking-widest text-on-surface-variant">
            Add author&apos;s thought
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-on-surface-variant hover:text-on-surface rounded-lg transition-colors"
            aria-label="Close"
          >
            <Icon name="close" size={22} />
          </button>
        </div>

        <div className="px-6 py-5">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            autoFocus
            maxLength={5000}
            placeholder="Leave author's thought here..."
            className={cn(
              'w-full resize-y min-h-[220px] border-0 bg-transparent p-0 text-[16px] leading-relaxed',
              'text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-0',
            )}
          />
        </div>

        <div className="flex items-center justify-between gap-4 px-6 py-4 border-t border-surface-variant">
          <div className="flex items-center gap-2 text-on-surface-variant">
            <Icon name="auto_stories" size={20} className="opacity-70" />
            <Icon name="menu_book" size={20} className="opacity-70" />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded border border-surface-variant text-[12px] font-bold uppercase tracking-wider text-on-surface hover:bg-surface-container transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="px-6 py-2 rounded bg-studio-accent hover:bg-studio-accent-hover text-white text-[12px] font-bold uppercase tracking-wider disabled:opacity-50 transition-colors"
            >
              {busy ? 'Saving…' : 'Submit'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
