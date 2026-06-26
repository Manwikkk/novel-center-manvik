'use client';

import { useEffect, useState } from 'react';
import AdminPageGuard from '@/components/layout/AdminPageGuard';
import DashboardShell from '@/components/layout/DashboardShell';
import DashboardTopbar from '@/components/layout/DashboardTopbar';
import UsersTable from '@/components/admin/UsersTable';
import Pagination from '@/components/ui/Pagination';
import { SkeletonRow } from '@/components/ui/Skeleton';
import { api } from '@/lib/api';
import { useUiStore } from '@/stores/uiStore';

const PAGE_SIZE = 20;

function Inner() {
  const pushToast = useUiStore((s) => s.pushToast);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setPage(1); }, [q]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(() => {
      api.get('/admin/users', { query: { q, page, pageSize: PAGE_SIZE } })
        .then((d) => {
          if (cancelled) return;
          setItems(d.items || []);
          setTotal(Number(d.total) || 0);
        })
        .catch((err) => {
          if (cancelled) return;
          setItems([]);
          setTotal(0);
          pushToast({ type: 'error', title: 'Could not load users', message: err.message });
        })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 200);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q, page, pushToast]);

  function applyChange(updated) {
    setItems((prev) => prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)));
  }

  return (
    <DashboardShell kind="admin">
      <DashboardTopbar subtitle="Administration" title="Members" />
      <div className="px-4 md:px-edge py-8 space-y-6">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or email"
          className="w-full md:max-w-md bg-transparent border-b border-outline-variant focus:border-on-surface focus:outline-none py-2 text-[16px] text-on-surface placeholder:text-on-surface-variant"
        />
        {loading ? (
          <div className="border border-outline-variant rounded-md p-6 space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonRow key={i} columns={5} />
            ))}
          </div>
        ) : (
          <UsersTable items={items} onChange={applyChange} />
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

export default function AdminUsersPage() {
  return <AdminPageGuard permission="users"><Inner /></AdminPageGuard>;
}
