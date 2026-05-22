'use client';

import Link from 'next/link';
import { BookOpen, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';
import BookDashboardPanel from '@/components/author/dashboard/BookDashboardPanel';

export function BooksEmptyState({ compact }) {
  return (
    <div
      className={cn(
        'rounded-lg border border-surface-variant bg-surface-container-lowest flex flex-col items-center text-center',
        compact ? 'px-5 py-8' : 'px-6 py-12',
      )}
    >
      <div
        className={cn(
          'rounded-xl bg-surface-container border border-surface-variant flex items-center justify-center mb-4',
          compact ? 'w-14 h-14' : 'w-16 h-16',
        )}
      >
        <BookOpen size={compact ? 28 : 32} strokeWidth={1.25} className="text-on-surface-variant" />
      </div>
      <h2 className={cn('font-semibold text-on-surface mb-2', compact ? 'text-lg' : 'text-xl')}>No Books Yet!</h2>
      <p className="text-[13px] text-on-surface-variant max-w-md leading-relaxed">
        <span className="text-studio-highlight font-semibold">59,034</span>
        {' '}authors are writing here!
      </p>
      <p className="text-[13px] text-on-surface-variant max-w-md mt-1.5 leading-relaxed">
        We will help your novels reach out{' '}
        <span className="text-studio-highlight font-semibold">500,000</span>
        {' '}readers.
      </p>
      <Link
        href="/author/books/new"
        className="mt-5 inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-studio-accent hover:bg-studio-accent-hover text-white text-[12px] font-bold uppercase tracking-wider transition-colors"
      >
        <Plus size={16} />
        Create new
      </Link>
    </div>
  );
}

/** Stories section: book selector + per-book stats (dashboard). */
export default function BooksSection({ books, loading, className }) {
  return (
    <BookDashboardPanel books={books} loading={loading} className={className} />
  );
}
