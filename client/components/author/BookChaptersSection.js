'use client';

import Link from 'next/link';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { formatDate, formatDateTime } from '@/lib/format';

export default function BookChaptersSection({
  bookId,
  bookTitle,
  chapters,
  onDeleteChapter,
  showBookLink = true,
}) {
  return (
    <section className="rounded-xl border border-surface-variant bg-surface-container-lowest p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5 pb-4 border-b border-surface-variant">
        <div>
          <h2 className="text-[13px] font-bold uppercase tracking-wider text-on-surface">Chapters</h2>
          {bookTitle ? (
            <p className="text-[13px] text-on-surface-variant mt-1 truncate max-w-md">{bookTitle}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {showBookLink ? (
            <Link
              href={`/author/books/${bookId}/edit`}
              className="inline-flex items-center px-4 py-2 rounded-lg border border-surface-variant text-on-surface text-[12px] font-bold uppercase tracking-wider hover:bg-surface-container transition-colors"
            >
              Book details
            </Link>
          ) : null}
          <Link
            href={`/author/books/${bookId}/chapters/new`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-studio-accent hover:bg-studio-accent-hover text-white text-[12px] font-bold uppercase tracking-wider transition-colors"
          >
            <Plus size={14} />
            New chapter
          </Link>
        </div>
      </div>

      {chapters.length === 0 ? (
        <p className="text-[14px] text-on-surface-variant py-6 text-center">
          No chapters yet. Click <span className="text-on-surface font-semibold">New chapter</span> to start writing.
        </p>
      ) : (
        <ul className="divide-y divide-surface-variant border border-surface-variant rounded-lg overflow-hidden">
          {chapters.map((c) => (
            <li
              key={c.id}
              className="px-4 py-3 flex items-center gap-4 bg-surface-container-lowest hover:bg-surface-container/50 transition-colors"
            >
              <span className="label-sm tabular-nums w-10 text-on-surface-variant shrink-0">
                {String(c.idx).padStart(2, '0')}
              </span>
              <Link
                href={`/author/books/${bookId}/chapters/${c.id}/edit`}
                className="flex-1 min-w-0 group"
              >
                <p className="font-semibold text-[15px] text-on-surface truncate group-hover:text-studio-accent transition-colors">
                  {c.title}
                </p>
                <p className="text-[12px] text-on-surface-variant mt-0.5">
                  {c.isPaid && c.tokenPrice > 0 ? `Paid · ${c.tokenPrice} tokens` : 'Free'}
                  {' · '}
                  {c.scheduledPublishAt
                    ? `Scheduled · ${formatDateTime(c.scheduledPublishAt)}`
                    : <span className="capitalize">{c.status}</span>}
                  {' · '}
                  {formatDate(c.updatedAt)}
                </p>
              </Link>
              <Link
                href={`/author/books/${bookId}/chapters/${c.id}/edit`}
                className="p-2 text-on-surface-variant hover:text-studio-accent transition-colors"
                title="Edit"
              >
                <Pencil size={16} />
              </Link>
              <button
                type="button"
                onClick={() => onDeleteChapter?.(c)}
                className="p-2 text-on-surface-variant hover:text-error transition-colors"
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
