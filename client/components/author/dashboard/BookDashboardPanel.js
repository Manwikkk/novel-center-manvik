'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { BookOpen, ChevronDown, Plus, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatTokens } from '@/lib/format';
import { BooksEmptyState } from '@/components/author/dashboard/BooksSection';

function StatCell({ label, description, value, changePercent, period, format = 'number' }) {
  const periodLabel =
    period === 'week' ? 'since previous week' : 'since previous day';

  const changeText = `${Number(changePercent).toFixed(1)}% ${periodLabel}`;

  const displayValue =
    format === 'tokens'
      ? formatTokens(value)
      : typeof value === 'number'
        ? value.toLocaleString()
        : value;

  return (
    <div className="flex-1 min-w-[132px] px-4 py-4 border-r border-surface-variant last:border-r-0">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant leading-snug">
        {label}
      </p>
      {description ? (
        <p className="mt-1 text-[10px] normal-case tracking-normal text-on-surface-variant/80 leading-snug line-clamp-2">
          {description}
        </p>
      ) : null}
      <p className="mt-2 text-[22px] md:text-[26px] font-semibold text-on-surface leading-none tabular-nums">
        {displayValue}
      </p>
      <p className="mt-3 inline-block text-[11px] text-studio-highlight bg-studio-highlight/10 px-2 py-1 rounded">
        {changeText}
      </p>
    </div>
  );
}

function BookSelector({ books, selectedId, onSelect }) {
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = books.find((b) => b.id === selectedId);
  const q = query.trim().toLowerCase();

  const filteredBooks = useMemo(() => {
    if (!q) return books;
    return books.filter((b) => b.title.toLowerCase().includes(q));
  }, [books, q]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!rootRef.current?.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
    else setQuery('');
  }, [open]);

  function pickBook(id) {
    onSelect(id);
    setOpen(false);
    setQuery('');
  }

  return (
    <div ref={rootRef} className="relative shrink-0 w-full sm:w-auto sm:min-w-[200px] sm:max-w-[280px]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          'flex w-full items-center justify-between gap-2 pl-4 pr-3 py-2.5 rounded-lg',
          'border border-surface-variant bg-surface-container text-on-surface',
          'text-[12px] font-bold uppercase tracking-wider',
          'focus:outline-none focus:ring-2 focus:ring-studio-accent/40',
        )}
      >
        <span className="truncate text-left">{selected?.title || 'Select book'}</span>
        <ChevronDown
          size={16}
          className={cn('shrink-0 text-on-surface-variant transition-transform', open && 'rotate-180')}
        />
      </button>

      {open ? (
        <div
          className="absolute right-0 top-full z-30 mt-1 w-full min-w-[260px] overflow-hidden rounded-lg border border-surface-variant bg-surface-container-lowest shadow-lg"
          role="listbox"
          aria-label="Select book"
        >
          <div className="relative border-b border-surface-variant">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
            />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search books…"
              className={cn(
                'w-full bg-transparent py-2.5 pl-9 pr-3 text-[13px] text-on-surface',
                'placeholder:text-on-surface-variant focus:outline-none',
              )}
              autoComplete="off"
              onKeyDown={(e) => {
                if (e.key === 'Escape') setOpen(false);
                if (e.key === 'Enter' && filteredBooks[0]) pickBook(filteredBooks[0].id);
              }}
            />
          </div>

          <ul className="max-h-56 overflow-y-auto py-1">
            {filteredBooks.length === 0 ? (
              <li className="px-3 py-3 text-[13px] text-on-surface-variant">No books match your search.</li>
            ) : (
              filteredBooks.map((b) => {
                const active = b.id === selectedId;
                return (
                  <li key={b.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => pickBook(b.id)}
                      className={cn(
                        'flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px]',
                        active
                          ? 'bg-studio-accent/10 text-on-surface font-semibold'
                          : 'text-on-surface hover:bg-surface-container',
                      )}
                    >
                      <span className="truncate">{b.title}</span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export default function BookDashboardPanel({ books, loading: booksLoading, className }) {
  const [selectedId, setSelectedId] = useState(null);
  const [statsData, setStatsData] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const sortedBooks = useMemo(
    () => [...(books || [])].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)),
    [books],
  );

  useEffect(() => {
    if (!sortedBooks.length) {
      setSelectedId(null);
      return;
    }
    setSelectedId((prev) => {
      if (prev && sortedBooks.some((b) => b.id === prev)) return prev;
      return sortedBooks[0].id;
    });
  }, [sortedBooks]);

  useEffect(() => {
    if (!selectedId) {
      setStatsData(null);
      return undefined;
    }
    let cancelled = false;
    setStatsLoading(true);
    api
      .get(`/author/books/${selectedId}/stats`)
      .then((d) => {
        if (!cancelled) setStatsData(d);
      })
      .catch(() => {
        if (!cancelled) setStatsData(null);
      })
      .finally(() => {
        if (!cancelled) setStatsLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedId]);

  if (booksLoading) {
    return (
      <div className={cn('rounded-xl border border-surface-variant bg-surface-container-lowest p-8', className)}>
        <div className="h-48 animate-pulse rounded-lg bg-surface-container" />
      </div>
    );
  }

  if (!sortedBooks.length) {
    return (
      <div className={className}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[13px] font-bold uppercase tracking-wider text-on-surface">Stories</h2>
        </div>
        <BooksEmptyState compact />
      </div>
    );
  }

  const book = statsData?.book || sortedBooks.find((b) => b.id === selectedId);
  const stats = statsData?.stats;

  return (
    <div className={cn(className)}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[13px] font-bold uppercase tracking-wider text-on-surface">Stories</h2>
        <Link
          href="/author/books/new"
          className="text-[11px] font-semibold uppercase tracking-wider text-studio-accent hover:underline inline-flex items-center gap-1"
        >
          <Plus size={12} /> New book
        </Link>
      </div>

      <div className="rounded-xl border border-surface-variant bg-surface-container-lowest overflow-hidden">
        {/* Header row: book info + selector */}
        <div className="p-5 md:p-6 border-b border-surface-variant">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
            <div className="flex gap-4 min-w-0 flex-1">
              <div className="w-[88px] h-[118px] shrink-0 rounded-md overflow-hidden border border-surface-variant bg-surface-container flex items-center justify-center">
                {book?.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={book.coverUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <BookOpen size={32} className="text-on-surface-variant" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-xl md:text-2xl font-semibold text-on-surface truncate">
                  {book?.title}
                </h3>
                <p className="text-[12px] text-on-surface-variant mt-2 leading-relaxed">
                  {statsData?.dataWindowLabel
                    || 'Stats update as readers discover your work.'}
                </p>
                <div className="flex flex-wrap gap-2 mt-4">
                  <Link
                    href={`/author/books/${selectedId}/chapters`}
                    className="inline-flex items-center justify-center px-5 py-2 rounded-md bg-studio-accent hover:bg-studio-accent-hover text-white text-[11px] font-bold uppercase tracking-wider transition-colors"
                  >
                    Chapters
                  </Link>
                  <Link
                    href={`/author/books/${selectedId}/edit`}
                    className="inline-flex items-center justify-center px-5 py-2 rounded-md border border-surface-variant text-on-surface text-[11px] font-bold uppercase tracking-wider hover:bg-surface-container transition-colors"
                  >
                    Detail
                  </Link>
                </div>
              </div>
            </div>
            <BookSelector
              books={sortedBooks}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </div>
        </div>

        {/* Stats row */}
        <div className="overflow-x-auto">
          {statsLoading ? (
            <div className="h-28 animate-pulse bg-surface-container/50" />
          ) : stats ? (
            <div className="flex min-w-[640px]">
              <StatCell
                label="Added to library"
                description="Readers who saved this book"
                value={stats.collections.value}
                changePercent={stats.collections.changePercent}
              />
              <StatCell
                label="Views"
                value={stats.views.value}
                changePercent={stats.views.changePercent}
              />
              <StatCell
                label="Earnings"
                value={stats.earnings.value}
                changePercent={stats.earnings.changePercent}
                format="tokens"
              />
              <StatCell
                label="Chapters"
                value={stats.chapters.value}
                changePercent={stats.chapters.changePercent}
                period="week"
              />
              <StatCell
                label="Words"
                value={stats.words.value}
                changePercent={stats.words.changePercent}
                period="week"
              />
            </div>
          ) : (
            <p className="p-6 text-[13px] text-on-surface-variant text-center">
              Could not load stats for this book.
            </p>
          )}
        </div>
      </div>

      <p className="mt-3 text-center">
        <Link
          href="/author/books"
          className="text-[11px] font-semibold uppercase tracking-wider text-studio-accent hover:underline"
        >
          View all manuscripts
        </Link>
      </p>
    </div>
  );
}
