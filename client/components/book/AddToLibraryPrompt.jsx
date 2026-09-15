'use client';

import Modal from '@/components/ui/Modal';
import Icon from '@/components/ui/Icon';

/**
 * Shown when a reader leaves the reading page for a book that is not yet
 * in their library — offers to save it before navigating away.
 */
export default function AddToLibraryPrompt({ open, bookTitle, busy, onAdd, onSkip }) {
  return (
    <Modal open={open} onClose={busy ? undefined : onSkip} title="Save to your library?" size="md">
      <div className="space-y-6">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-900/10 text-ink-900 dark:bg-white/10 dark:text-neutral-100">
            <Icon name="bookmark_add" size={18} />
          </span>
          <p className="text-[15px] leading-relaxed text-ink-700 dark:text-neutral-300">
            Keep{' '}
            <span className="font-medium text-ink-900 dark:text-neutral-100">
              &ldquo;{bookTitle || 'this book'}&rdquo;
            </span>
            {' '}
            in your library so you can pick up where you left off.
          </p>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onSkip}
            disabled={busy}
            className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-md px-5 text-[12px] font-semibold uppercase tracking-widest text-ink-700 hover:bg-ink-50 dark:text-neutral-300 dark:hover:bg-neutral-900 transition-colors disabled:opacity-60"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={onAdd}
            disabled={busy}
            className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-md bg-ink-900 px-5 text-[12px] font-semibold uppercase tracking-widest text-white hover:opacity-90 dark:bg-white dark:text-black transition-opacity disabled:opacity-60"
          >
            {busy ? 'Saving…' : 'Add to library'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
