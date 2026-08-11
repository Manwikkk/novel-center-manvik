'use client';

import Modal from '@/components/ui/Modal';
import Icon from '@/components/ui/Icon';

/**
 * Shown after a book is added to the library — asks whether to also
 * place it in a collection.
 */
export default function LibraryCollectionPrompt({ open, bookTitle, onYes, onNo }) {
  return (
    <Modal open={open} onClose={onNo} title="Added to library" size="md">
      <div className="space-y-6">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <Icon name="check" size={18} />
          </span>
          <p className="text-[15px] leading-relaxed text-ink-700 dark:text-neutral-300">
            <span className="font-medium text-ink-900 dark:text-neutral-100">
              &ldquo;{bookTitle || 'This book'}&rdquo;
            </span>
            {' '}
            is saved to your library. Do you also want to add it to a collection?
          </p>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onNo}
            className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-md px-5 text-[12px] font-semibold uppercase tracking-widest text-ink-700 hover:bg-ink-50 dark:text-neutral-300 dark:hover:bg-neutral-900 transition-colors"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={onYes}
            className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-md bg-ink-900 px-5 text-[12px] font-semibold uppercase tracking-widest text-white hover:opacity-90 dark:bg-white dark:text-black transition-opacity"
          >
            Add to collection
          </button>
        </div>
      </div>
    </Modal>
  );
}
