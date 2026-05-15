'use client';

import { useEffect, useState } from 'react';
import AuthGuard from '@/components/layout/AuthGuard';
import DashboardShell from '@/components/layout/DashboardShell';
import DashboardTopbar from '@/components/layout/DashboardTopbar';
import AdminBooksTable from '@/components/admin/AdminBooksTable';
import Chip from '@/components/ui/Chip';
import Pagination from '@/components/ui/Pagination';
import { SkeletonRow } from '@/components/ui/Skeleton';
import { api } from '@/lib/api';
import { useUiStore } from '@/stores/uiStore';

const STATUS = ['All', 'draft', 'published', 'archived'];
const PAGE_SIZE = 20;

function Inner() {
  const pushToast = useUiStore((s) => s.pushToast);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('All');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setPage(1); }, [status]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get('/admin/books', {
      query: { status: status === 'All' ? undefined : status, page, pageSize: PAGE_SIZE },
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
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [status, page, pushToast]);

  return (
    <DashboardShell kind="admin">
      <DashboardTopbar subtitle="Administration" title="Books" />
      <div className="px-4 md:px-edge py-8 space-y-6">
        <div className="flex flex-wrap gap-2 items-center">
          {STATUS.map((s) => (
            <button key={s} type="button" onClick={() => setStatus(s)} className="inline-flex">
              <Chip active={status === s}>{s}</Chip>
            </button>
          ))}
          <span className="ml-auto text-[12px] text-ink-400 label-sm uppercase">
            {total} {total === 1 ? 'book' : 'books'}
          </span>
        </div>
        {loading ? (
          <div className="border border-ink-200/60 rounded-md p-6 space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonRow key={i} columns={5} />
            ))}
          </div>
        ) : (
          <AdminBooksTable items={items} />
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

export default function AdminBooksPage() {
  return <AuthGuard roles={['admin']}><Inner /></AuthGuard>;
}
