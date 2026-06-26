'use client';

import { useEffect, useState } from 'react';
import AdminPageGuard from '@/components/layout/AdminPageGuard';
import DashboardShell from '@/components/layout/DashboardShell';
import DashboardTopbar from '@/components/layout/DashboardTopbar';
import TransactionsTable from '@/components/admin/TransactionsTable';
import Chip from '@/components/ui/Chip';
import Pagination from '@/components/ui/Pagination';
import { SkeletonRow } from '@/components/ui/Skeleton';
import { api } from '@/lib/api';
import { useUiStore } from '@/stores/uiStore';

const TYPES = ['All', 'purchase', 'unlock', 'admin_adjust'];
const PAGE_SIZE = 20;

function Inner() {
  const pushToast = useUiStore((s) => s.pushToast);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [type, setType] = useState('All');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setPage(1); }, [type]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get('/admin/transactions', {
      query: { type: type === 'All' ? undefined : type, page, pageSize: PAGE_SIZE },
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
        pushToast({ type: 'error', title: 'Could not load transactions', message: err.message });
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [type, page, pushToast]);

  return (
    <DashboardShell kind="admin">
      <DashboardTopbar subtitle="Administration" title="Transactions" />
      <div className="px-4 md:px-edge py-8 space-y-6">
        <div className="flex flex-wrap gap-2 items-center">
          {TYPES.map((t) => (
            <button key={t} type="button" onClick={() => setType(t)} className="inline-flex">
              <Chip active={type === t}>{t.replace('_', ' ')}</Chip>
            </button>
          ))}
          <span className="ml-auto text-[12px] text-on-surface-variant label-sm uppercase">
            {total} {total === 1 ? 'entry' : 'entries'}
          </span>
        </div>
        {loading ? (
          <div className="border border-outline-variant rounded-md p-6 space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonRow key={i} columns={6} />
            ))}
          </div>
        ) : (
          <TransactionsTable items={items} />
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

export default function AdminTransactionsPage() {
  return <AdminPageGuard permission="transactions"><Inner /></AdminPageGuard>;
}
