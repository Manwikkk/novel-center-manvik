'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FolderOpen } from 'lucide-react';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import AuthGuard from '@/components/layout/AuthGuard';
import CompactBookTile from '@/components/book/CompactBookTile';
import LiveSearchBar from '@/components/search/LiveSearchBar';
import Icon from '@/components/ui/Icon';
import Pagination from '@/components/ui/Pagination';
import { Skeleton } from '@/components/ui/Skeleton';
import { libraryApi } from '@/lib/library';
import { collectionsApi } from '@/lib/collections';
import { readingApi } from '@/lib/reading';
import { useUiStore } from '@/stores/uiStore';
import { cn } from '@/lib/cn';

const PAGE_SIZE = 12;

const TABS = [
  { key: 'active', label: 'Library', readingStatus: 'active' },
  { key: 'continue', label: 'Continue Reading' },
  { key: 'on_hold', label: 'On Hold', readingStatus: 'on_hold' },
  { key: 'archive', label: 'Archive', readingStatus: 'archive' },
  { key: 'dropped', label: 'Dropped', readingStatus: 'dropped' },
  { key: 'collections', label: 'Collections' },
];

const EMPTY_COPY = {
  active: {
    title: 'Your library is empty.',
    body: 'Save books from the discover page or any book detail to keep them within reach.',
  },
  on_hold: {
    title: 'No books on hold.',
    body: 'Use the menu on any book page to mark stories you want to resume later.',
  },
  archive: {
    title: 'Archive is empty.',
    body: 'Finished or set-aside books you archive will appear here.',
  },
  dropped: {
    title: 'No dropped books.',
    body: 'Books you drop from your reading list will show up in this tab.',
  },
  collections: {
    title: 'No collections yet.',
    body: 'Create collections from any book page using Add to Collection.',
  },
  continue: {
    title: 'Nothing in progress.',
    body: 'Open any chapter and your place is saved here so you can pick up where you left off.',
  },
};

function LibraryInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') || 'active';
  const page = Math.max(1, Number(searchParams.get('page') || '1') || 1);
  const q = (searchParams.get('q') || '').trim();
  const pushToast = useUiStore((s) => s.pushToast);

  const activeTab = TABS.some((t) => t.key === tab) ? tab : 'active';
  const isCollections = activeTab === 'collections';
  const isContinue = activeTab === 'continue';
  const readingStatus = TABS.find((t) => t.key === activeTab)?.readingStatus || 'active';

  const [data, setData] = useState({ items: [], total: 0, pageSize: PAGE_SIZE });
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    const req = isCollections
      ? collectionsApi.list({ page, pageSize: PAGE_SIZE })
      : isContinue
        ? readingApi.recentPage({ page, pageSize: PAGE_SIZE })
        : libraryApi.list({ page, pageSize: PAGE_SIZE, q: q || undefined, readingStatus });

    req
      .then((res) => setData({ items: res.items || [], total: res.total || 0, pageSize: res.pageSize || PAGE_SIZE }))
      .catch((err) => pushToast({ type: 'error', title: 'Could not load', message: err.message }))
      .finally(() => setLoading(false));
  }, [page, q, pushToast, isCollections, isContinue, readingStatus]);

  useEffect(() => {
    setData({ items: [], total: 0, pageSize: PAGE_SIZE });
    setLoading(true);
  }, [activeTab]);

  useEffect(() => { load(); }, [load]);

  function setTab(nextTab) {
    const params = new URLSearchParams();
    if (nextTab !== 'active') params.set('tab', nextTab);
    if (q) params.set('q', q);
    const qs = params.toString();
    router.push(qs ? `/library?${qs}` : '/library');
  }

  const goPage = (p) => {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (p <= 1) params.delete('page'); else params.set('page', String(p));
    const qs = params.toString();
    router.push(qs ? `/library?${qs}` : '/library');
  };

  async function handleRemove(bookId, title) {
    if (removingId) return;
    setRemovingId(bookId);
    const prev = data;
    setData((d) => ({
      ...d,
      items: d.items.filter((it) => Number(it.book?.id ?? it.bookId) !== Number(bookId)),
      total: Math.max(0, d.total - 1),
    }));
    try {
      await libraryApi.remove(bookId);
      pushToast({ type: 'success', title: 'Removed from library', message: `${title} is no longer saved.` });
    } catch (err) {
      setData(prev);
      pushToast({ type: 'error', title: 'Could not remove', message: err.message });
    } finally {
      setRemovingId(null);
    }
  }

  const items = data.items;
  const total = data.total;
  const bookEntries = isCollections ? [] : items.filter((entry) => entry?.book?.id);
  const countNoun = isCollections
    ? (total === 1 ? 'collection' : 'collections')
    : isContinue
      ? (total === 1 ? 'book in progress' : 'books in progress')
      : (total === 1 ? 'book' : 'books');
  const empty = EMPTY_COPY[activeTab] || EMPTY_COPY.active;

  return (
    <div className="min-h-screen flex flex-col bg-background dark:bg-black">
      <SiteHeader variant="solid" />
      <main className="flex-grow pt-[120px] pb-32 max-w-[1280px] mx-auto px-4 md:px-edge w-full">
        <header className="mb-8">
          <p className="font-ui-label-sm text-ui-label-sm uppercase tracking-widest text-on-surface-variant dark:text-neutral-400">
            Your library
          </p>
          <div className="mt-2 flex items-end justify-between gap-4 flex-wrap">
            <h1 className="font-display-lg text-[40px] md:text-display-lg text-on-surface dark:text-neutral-100 leading-tight">
              Books you&rsquo;ve saved.
            </h1>
            {!loading && (
              <span className="font-ui-label-sm text-ui-label-sm uppercase tracking-widest text-on-surface-variant dark:text-neutral-400">
                {total} {countNoun}
              </span>
            )}
          </div>
        </header>

        <div className="flex flex-wrap gap-2 border-b border-outline-variant pb-1 mb-8">
          {TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={cn(
                'px-4 py-2 text-[12px] uppercase tracking-widest border-b-2 -mb-px transition-colors',
                activeTab === item.key
                  ? 'border-on-surface text-on-surface'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {!isCollections && !isContinue ? (
          <LiveSearchBar
            basePath="/library"
            placeholder="Search library…"
            className="mb-8 flex w-full max-w-md flex-wrap items-center gap-3"
          />
        ) : null}

        {!loading && q && !isCollections && !isContinue ? (
          <div className="mb-8 flex items-center gap-4">
            <div className="flex-1 h-px bg-surface-variant dark:bg-neutral-800" />
            <p className="font-ui-label-sm text-ui-label-sm text-on-surface-variant dark:text-neutral-500 whitespace-nowrap">
              {total > 0
                ? `${total} match${total === 1 ? '' : 'es'} · “${q}”`
                : `No matches for “${q}”`}
            </p>
            <div className="flex-1 h-px bg-surface-variant dark:bg-neutral-800" />
          </div>
        ) : null}

        {loading ? (
          <div className={cn(
            isCollections
              ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4'
              : 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-4 sm:gap-x-6 sm:gap-y-8',
          )}
          >
            {Array.from({ length: isCollections ? 6 : 12 }).map((_, i) => (
              <div key={i} className="min-w-0">
                <Skeleton className={isCollections ? 'h-24 w-full rounded-xl' : 'aspect-[2/3] w-full max-w-[120px] rounded-xl'} />
                <Skeleton className="mt-3 h-4 w-full max-w-[120px]" />
              </div>
            ))}
          </div>
        ) : (isCollections ? items.length === 0 : bookEntries.length === 0) ? (
          <div className="border border-outline-variant rounded-lg p-16 text-center bg-surface-container-low">
            <Icon name={q && !isCollections && !isContinue ? 'search' : isCollections ? 'folder' : isContinue ? 'auto_stories' : 'bookmark_add'} size={36} className="text-on-surface-variant mb-4" />
            <h2 className="font-headline-md text-headline-md text-on-surface mb-2">
              {q && !isCollections && !isContinue ? 'No books match your search.' : empty.title}
            </h2>
            <p className="font-reading-body text-reading-body text-on-surface-variant max-w-md mx-auto mb-8">
              {q && !isCollections && !isContinue
                ? 'Try a different title, author, or category — or clear the search to see everything in this tab.'
                : empty.body}
            </p>
            {q && !isCollections && !isContinue ? (
              <Link
                href={`/library${activeTab !== 'active' ? `?tab=${activeTab}` : ''}`}
                className="inline-flex items-center gap-2 px-8 py-4 border border-outline-variant text-on-surface font-ui-label-sm text-ui-label-sm uppercase tracking-widest rounded hover:bg-surface-container transition-colors"
              >
                Clear search
              </Link>
            ) : activeTab === 'active' || isContinue ? (
              <Link
                href="/discover"
                className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-on-primary font-ui-label-sm text-ui-label-sm uppercase tracking-widest rounded hover:bg-on-surface-variant transition-colors"
              >
                Discover books
                <Icon name="arrow_forward" size={16} />
              </Link>
            ) : null}
          </div>
        ) : isCollections ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
              {items.map((c) => (
                <Link
                  key={c.id}
                  href={`/library/collections/${c.id}`}
                  className="group block rounded-xl border border-outline-variant p-5 hover:border-on-surface hover:bg-surface-container-low transition-colors"
                >
                  <FolderOpen size={28} className="text-on-surface-variant group-hover:text-on-surface mb-4" />
                  <p className="font-serif text-[18px] text-on-surface line-clamp-2">{c.name}</p>
                  <p className="mt-2 text-[12px] uppercase tracking-widest text-on-surface-variant">
                    {c.bookCount} {c.bookCount === 1 ? 'book' : 'books'} · {c.visibility}
                  </p>
                </Link>
              ))}
            </div>
            <div className="mt-16">
              <Pagination
                page={page}
                pageSize={data.pageSize || PAGE_SIZE}
                total={total}
                onPageChange={goPage}
              />
            </div>
          </>
        ) : isContinue ? (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-4 sm:gap-x-6 sm:gap-y-8">
              {bookEntries.map((entry) => {
                const pct = Math.max(0, Math.min(100, Math.round(entry.percent || 0)));
                return (
                  <CompactBookTile
                    key={entry.book.id}
                    book={entry.book}
                    href={entry.chapter?.id ? `/read/${entry.chapter.id}` : undefined}
                    subtitle={entry.chapter ? `Ch. ${entry.chapter.idx} · ${pct}%` : undefined}
                  />
                );
              })}
            </div>
            <div className="mt-16">
              <Pagination
                page={page}
                pageSize={data.pageSize || PAGE_SIZE}
                total={total}
                onPageChange={goPage}
              />
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-4 sm:gap-x-6 sm:gap-y-8">
              {bookEntries.map((entry) => {
                const { book } = entry;
                return (
                  <CompactBookTile
                    key={book.id}
                    book={book}
                    action={(
                      <button
                        type="button"
                        onClick={() => handleRemove(book.id, book.title)}
                        disabled={removingId === book.id}
                        className="absolute top-1.5 right-1.5 inline-flex items-center justify-center w-7 h-7 rounded-full bg-surface/90 backdrop-blur-sm border border-outline-variant text-on-surface-variant dark:bg-neutral-900/90 dark:border-neutral-700 dark:text-neutral-300 opacity-0 group-hover:opacity-100 hover:bg-error hover:text-on-error transition-all duration-200 disabled:opacity-60"
                        aria-label={`Remove ${book.title} from library`}
                        title="Remove from library"
                      >
                        <Icon name="bookmark_remove" size={16} />
                      </button>
                    )}
                  />
                );
              })}
            </div>
            <div className="mt-16">
              <Pagination
                page={page}
                pageSize={data.pageSize || PAGE_SIZE}
                total={total}
                onPageChange={goPage}
              />
            </div>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

export default function LibraryPage() {
  return (
    <AuthGuard>
      <LibraryInner />
    </AuthGuard>
  );
}
