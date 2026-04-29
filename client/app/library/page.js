'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import AuthGuard from '@/components/layout/AuthGuard';
import BookCard from '@/components/book/BookCard';
import Icon from '@/components/ui/Icon';
import Pagination from '@/components/ui/Pagination';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { libraryApi } from '@/lib/library';
import { useUiStore } from '@/stores/uiStore';

const PAGE_SIZE = 12;

function LibraryInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = Math.max(1, Number(searchParams.get('page') || '1') || 1);
  const pushToast = useUiStore((s) => s.pushToast);

  const [data, setData] = useState({ items: [], total: 0, pageSize: PAGE_SIZE });
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    libraryApi
      .list({ page, pageSize: PAGE_SIZE })
      .then((res) => setData({ items: res.items || [], total: res.total || 0, pageSize: res.pageSize || PAGE_SIZE }))
      .catch((err) => pushToast({ type: 'error', title: 'Could not load library', message: err.message }))
      .finally(() => setLoading(false));
  }, [page, pushToast]);

  useEffect(() => { load(); }, [load]);

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
      items: d.items.filter((it) => it.bookId !== bookId),
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

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader variant="solid" />
      <main className="flex-grow pt-[120px] pb-32 max-w-[1280px] mx-auto px-4 md:px-edge w-full">
        <header className="mb-12">
          <p className="font-ui-label-sm text-ui-label-sm uppercase tracking-widest text-on-surface-variant">
            Your library
          </p>
          <div className="mt-2 flex items-end justify-between gap-4 flex-wrap">
            <h1 className="font-display-lg text-[40px] md:text-display-lg text-on-surface leading-tight">
              Books you&rsquo;ve saved.
            </h1>
            {!loading && (
              <span className="font-ui-label-sm text-ui-label-sm uppercase tracking-widest text-on-surface-variant">
                {total} {total === 1 ? 'book' : 'books'}
              </span>
            )}
          </div>
        </header>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-gutter gap-y-12">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="border border-outline-variant rounded-lg p-16 text-center bg-surface-container-low">
            <Icon name="bookmark_add" size={36} className="text-on-surface-variant mb-4" />
            <h2 className="font-headline-md text-headline-md text-on-surface mb-2">
              Your library is empty.
            </h2>
            <p className="font-reading-body text-reading-body text-on-surface-variant max-w-md mx-auto mb-8">
              Save books from the discover page or any book detail to keep them within reach.
            </p>
            <Link
              href="/discover"
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-on-primary font-ui-label-sm text-ui-label-sm uppercase tracking-widest rounded hover:bg-on-surface-variant transition-colors"
            >
              Discover books
              <Icon name="arrow_forward" size={16} />
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-gutter gap-y-12">
              {items.map(({ book }) => (
                <div key={book.id} className="relative group">
                  <BookCard book={book} />
                  <button
                    type="button"
                    onClick={() => handleRemove(book.id, book.title)}
                    disabled={removingId === book.id}
                    className="absolute top-2 right-2 inline-flex items-center justify-center w-9 h-9 rounded-full bg-surface/90 backdrop-blur-sm border border-outline-variant text-on-surface-variant opacity-0 group-hover:opacity-100 hover:bg-error hover:text-on-error transition-all duration-200 disabled:opacity-60"
                    aria-label={`Remove ${book.title} from library`}
                    title="Remove from library"
                  >
                    <Icon name="bookmark_remove" size={18} />
                  </button>
                </div>
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
