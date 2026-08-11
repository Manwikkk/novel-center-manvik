'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AdminPageGuard from '@/components/layout/AdminPageGuard';
import DashboardShell from '@/components/layout/DashboardShell';
import DashboardTopbar from '@/components/layout/DashboardTopbar';
import CompactBookTile from '@/components/book/CompactBookTile';
import LiveSearchBar from '@/components/search/LiveSearchBar';
import Pagination from '@/components/ui/Pagination';
import Icon from '@/components/ui/Icon';
import { api } from '@/lib/api';
import { useUiStore } from '@/stores/uiStore';

const PAGE_SIZE = 48;

function Inner() {
  const pushToast = useUiStore((s) => s.pushToast);
  const searchParams = useSearchParams();
  const q = (searchParams.get('q') || '').trim();
  const page = Math.max(1, Number(searchParams.get('page')) || 1);

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get('/books', {
        query: {
          q: q || undefined,
          status: 'published',
          page,
          pageSize: PAGE_SIZE,
        },
      })
      .then((d) => {
        if (cancelled) return;
        setItems((d.items || []).filter((b) => b && b.slug));
        setTotal(Number(d.total) || 0);
      })
      .catch((err) => {
        if (cancelled) return;
        setItems([]);
        setTotal(0);
        pushToast({ type: 'error', title: 'Could not load novels', message: err.message });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [q, page, pushToast]);

  const countLabel = useMemo(() => {
    if (loading) return 'Loading…';
    if (total > 0) return `${total} title${total !== 1 ? 's' : ''}${q ? ` · "${q}"` : ''}`;
    if (q) return `No results for "${q}"`;
    return 'No novels yet';
  }, [loading, total, q]);

  return (
    <DashboardShell kind="admin">
      <DashboardTopbar subtitle="Administration" title="Novels" />
      <div className="px-4 md:px-edge py-8 max-w-[1280px] mx-auto w-full">
        <p className="text-sm text-on-surface-variant dark:text-neutral-400 max-w-2xl">
          Browse and read every published novel. Admin and staff access is free — no coins required.
        </p>

        <div className="mt-6">
          <LiveSearchBar
            basePath="/admin/novels"
            placeholder="Search novels by title or author…"
          />
        </div>

        <div className="mt-8 mb-6 flex items-center gap-4">
          <div className="flex-1 h-px bg-surface-variant dark:bg-neutral-800" />
          <p className="font-ui-label-sm text-ui-label-sm text-on-surface-variant dark:text-neutral-500 whitespace-nowrap">
            {countLabel}
          </p>
          <div className="flex-1 h-px bg-surface-variant dark:bg-neutral-800" />
        </div>

        {loading ? (
          <div className="grid grid-cols-3 min-[400px]:grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-x-4 gap-y-10">
            {Array.from({ length: 14 }).map((_, i) => (
              <div key={i} className="min-w-0">
                <div className="w-full max-w-[120px] aspect-[2/3] rounded-xl bg-neutral-200 dark:bg-neutral-900 animate-pulse" />
                <div className="mt-3 h-4 w-20 rounded bg-neutral-200 dark:bg-neutral-900 animate-pulse" />
                <div className="mt-2 h-3 w-14 rounded bg-neutral-200 dark:bg-neutral-900 animate-pulse" />
              </div>
            ))}
          </div>
        ) : null}

        {!loading && items.length > 0 ? (
          <>
            <div className="grid grid-cols-3 min-[400px]:grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-x-4 gap-y-10 sm:gap-x-5 sm:gap-y-11">
              {items.map((book) => (
                <CompactBookTile
                  key={book.id}
                  book={book}
                  href={`/books/${book.slug}`}
                  subtitle={book.category || book.authorName || 'Novel'}
                />
              ))}
            </div>
            <div className="mt-10">
              <Pagination
                page={page}
                pageSize={PAGE_SIZE}
                total={total}
                pathname="/admin/novels"
                extraQuery={{ q: q || undefined }}
              />
            </div>
          </>
        ) : null}

        {!loading && items.length === 0 ? (
          <div className="mt-16 flex flex-col items-center gap-3 text-center">
            <Icon name="menu_book" size={40} className="text-on-surface-variant/40 dark:text-neutral-700" />
            <p className="font-ui-label-lg text-ui-label-lg text-on-surface-variant dark:text-neutral-500">
              No novels match that search yet.
            </p>
          </div>
        ) : null}
      </div>
    </DashboardShell>
  );
}

export default function AdminNovelsPage() {
  return (
    <AdminPageGuard permission="novels">
      <Suspense fallback={
        <DashboardShell kind="admin">
          <DashboardTopbar subtitle="Administration" title="Novels" />
          <div className="px-4 md:px-edge py-8 text-sm text-on-surface-variant">Loading novels…</div>
        </DashboardShell>
      }
      >
        <Inner />
      </Suspense>
    </AdminPageGuard>
  );
}
