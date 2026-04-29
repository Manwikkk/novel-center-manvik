'use client';

import { useEffect, useState } from 'react';
import AuthGuard from '@/components/layout/AuthGuard';
import DashboardShell from '@/components/layout/DashboardShell';
import DashboardTopbar from '@/components/layout/DashboardTopbar';
import BooksTable from '@/components/author/BooksTable';
import Button from '@/components/ui/Button';
import Chip from '@/components/ui/Chip';
import Pagination from '@/components/ui/Pagination';
import { SkeletonRow } from '@/components/ui/Skeleton';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';

const PAGE_SIZE = 20;

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Drafts' },
  { id: 'published', label: 'Published' },
  { id: 'archived', label: 'Archived' },
];

function AuthorBooks() {
  const user = useAuthStore((s) => s.user);
  const pushToast = useUiStore((s) => s.pushToast);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPage(1);
  }, [filter]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    api.get('/books', {
      query: {
        author: user.id,
        page,
        pageSize: PAGE_SIZE,
        status: filter === 'all' ? undefined : filter,
      },
    })
      .then((d) => {
        if (cancelled) return;
        setItems(d.items || []);
        setTotal(Number(d.total) || 0);
      })
      .catch((err) => {
        if (cancelled) return;
        setItems([]);
        setTotal(0);
        pushToast({ type: 'error', title: 'Could not load books', message: err.message });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [user, page, filter, pushToast]);

  async function handleDelete(book) {
    if (!confirm(`Delete "${book.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/books/${book.id}`);
      setItems((prev) => prev.filter((b) => b.id !== book.id));
      setTotal((t) => Math.max(0, t - 1));
      pushToast({ type: 'success', title: 'Book deleted' });
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not delete', message: err.message });
    }
  }

  return (
    <DashboardShell kind="author">
      <DashboardTopbar
        subtitle="Author studio"
        title="Books"
        actions={<Button href="/author/books/new" variant="primary" size="sm">New book</Button>}
      />
      <div className="px-4 md:px-edge py-8 space-y-8">
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => (
            <Chip
              key={f.id}
              as="button"
              active={filter === f.id}
              onClick={() => setFilter(f.id)}
              className="cursor-pointer"
            >
              {f.label}
            </Chip>
          ))}
          <span className="ml-auto text-[12px] text-ink-400 label-sm uppercase">
            {total} {total === 1 ? 'book' : 'books'}
          </span>
        </div>

        {loading ? (
          <div className="border border-ink-200/60 rounded-md p-6 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonRow key={i} columns={4} />
            ))}
          </div>
        ) : (
          <BooksTable items={items} onDelete={handleDelete} />
        )}

        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          onPageChange={(p) => setPage(p)}
          className="pt-2"
        />
      </div>
    </DashboardShell>
  );
}

export default function AuthorBooksPage() {
  return (
    <AuthGuard roles={['author', 'admin']}>
      <AuthorBooks />
    </AuthGuard>
  );
}
