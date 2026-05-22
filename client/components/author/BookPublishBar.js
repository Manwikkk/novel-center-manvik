'use client';

import Link from 'next/link';
import { api } from '@/lib/api';
import { useUiStore } from '@/stores/uiStore';
import { cn } from '@/lib/cn';

export default function BookPublishBar({ book, onUpdated }) {
  const pushToast = useUiStore((s) => s.pushToast);
  const isPublished = book?.status === 'published';
  const isArchived = book?.status === 'archived';

  async function setStatus(status) {
    try {
      const r = await api.patch(`/books/${book.id}`, { status });
      onUpdated?.(r.book);
      pushToast({
        type: 'success',
        title: status === 'published' ? 'Book published' : 'Moved to draft',
      });
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not update visibility', message: err.message });
    }
  }

  return (
    <div
      className={cn(
        'rounded-xl border px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4',
        isPublished
          ? 'border-studio-accent/40 bg-studio-accent/10'
          : 'border-surface-variant bg-surface-container-lowest',
      )}
    >
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
          Visibility
        </p>
        <p className="text-[15px] font-semibold text-on-surface mt-1">
          {isPublished && 'Published — readers can find this book'}
          {!isPublished && !isArchived && 'Draft — only you can see this book'}
          {isArchived && 'Archived — hidden from readers'}
        </p>
        <p className="text-[13px] text-on-surface-variant mt-1">
          Update details below, then add chapters. Change visibility here anytime.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        {isPublished ? (
          <button
            type="button"
            onClick={() => setStatus('draft')}
            className="px-4 py-2 rounded-lg border border-surface-variant text-on-surface text-[12px] font-bold uppercase tracking-wider hover:bg-surface-container transition-colors"
          >
            Unpublish
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setStatus('published')}
            className="px-4 py-2 rounded-lg bg-studio-accent hover:bg-studio-accent-hover text-white text-[12px] font-bold uppercase tracking-wider transition-colors"
          >
            Publish
          </button>
        )}
        {isPublished && (
          <Link
            href={`/books/${book.slug}`}
            className="px-4 py-2 rounded-lg border border-studio-accent text-studio-accent text-[12px] font-bold uppercase tracking-wider hover:bg-studio-accent/10 transition-colors"
          >
            View public page
          </Link>
        )}
      </div>
    </div>
  );
}
