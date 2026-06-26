'use client';

import { useEffect, useState } from 'react';
import AdminPageGuard from '@/components/layout/AdminPageGuard';
import DashboardShell from '@/components/layout/DashboardShell';
import DashboardTopbar from '@/components/layout/DashboardTopbar';
import AdminBooksTable from '@/components/admin/AdminBooksTable';
import AdminRecycleBin from '@/components/admin/AdminRecycleBin';
import ConfirmRecycleModal from '@/components/admin/ConfirmRecycleModal';
import Chip from '@/components/ui/Chip';
import Pagination from '@/components/ui/Pagination';
import { SkeletonRow } from '@/components/ui/Skeleton';
import { api } from '@/lib/api';
import { useUiStore } from '@/stores/uiStore';
import { cn } from '@/lib/cn';

const STATUS = ['All', 'draft', 'published', 'archived'];
const PAGE_SIZE = 20;
const TABS = [
  { key: 'active', label: 'Active books' },
  { key: 'recycle', label: 'Recycle bin' },
];

function Inner() {
  const pushToast = useUiStore((s) => s.pushToast);
  const [tab, setTab] = useState('active');
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('All');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busyBookId, setBusyBookId] = useState(null);
  const [recycleTarget, setRecycleTarget] = useState(null);

  useEffect(() => { setPage(1); }, [status]);

  useEffect(() => {
    if (tab !== 'active') return undefined;
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
  }, [tab, status, page, pushToast]);

  async function confirmRecycleBook() {
    if (!recycleTarget) return;
    setBusyBookId(recycleTarget.id);
    try {
      await api.post(`/admin/books/${recycleTarget.id}/recycle`);
      pushToast({
        type: 'success',
        title: 'Book moved to recycle bin',
        message: `${recycleTarget.title} and its chapters were archived.`,
      });
      setRecycleTarget(null);
      setItems((prev) => prev.filter((b) => b.id !== recycleTarget.id));
      setTotal((t) => Math.max(0, t - 1));
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not recycle book', message: err.message });
    } finally {
      setBusyBookId(null);
    }
  }

  return (
    <DashboardShell kind="admin">
      <DashboardTopbar subtitle="Administration" title="Books" />
      <div className="px-4 md:px-edge py-8 space-y-6">
        <div className="flex flex-wrap gap-2 border-b border-outline-variant pb-1">
          {TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={cn(
                'px-4 py-2 text-[12px] uppercase tracking-widest border-b-2 -mb-px transition-colors',
                tab === item.key
                  ? 'border-on-surface text-on-surface'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === 'active' && (
          <>
            <div className="flex flex-wrap gap-2 items-center">
              {STATUS.map((s) => (
                <button key={s} type="button" onClick={() => setStatus(s)} className="inline-flex">
                  <Chip active={status === s}>{s}</Chip>
                </button>
              ))}
              <span className="ml-auto text-[12px] text-on-surface-variant label-sm uppercase">
                {total} {total === 1 ? 'book' : 'books'}
              </span>
            </div>
            {loading ? (
              <div className="border border-outline-variant rounded-md p-6 space-y-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <SkeletonRow key={i} columns={5} />
                ))}
              </div>
            ) : (
              <AdminBooksTable
                items={items}
                busyBookId={busyBookId}
                onRecycleBook={setRecycleTarget}
              />
            )}
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              onPageChange={(p) => setPage(p)}
              className="pt-2"
            />
          </>
        )}

        {tab === 'recycle' && <AdminRecycleBin />}
      </div>

      <ConfirmRecycleModal
        open={Boolean(recycleTarget)}
        title="Move book to recycle bin?"
        message={`"${recycleTarget?.title}" and all its chapters will be hidden from the site. Nothing is permanently deleted — restore from the Recycle bin anytime.`}
        busy={recycleTarget != null && busyBookId === recycleTarget.id}
        onClose={() => { if (busyBookId !== recycleTarget?.id) setRecycleTarget(null); }}
        onConfirm={confirmRecycleBook}
      />
    </DashboardShell>
  );
}

export default function AdminBooksPage() {
  return <AdminPageGuard permission="books"><Inner /></AdminPageGuard>;
}
