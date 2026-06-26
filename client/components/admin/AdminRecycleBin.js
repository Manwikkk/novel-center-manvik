'use client';

import { useCallback, useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { api } from '@/lib/api';
import { useUiStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { hasAdminCapability } from '@/lib/adminPermissions';
import { formatDateTime } from '@/lib/format';
import Pagination from '@/components/ui/Pagination';
import Chip from '@/components/ui/Chip';
import { SkeletonRow } from '@/components/ui/Skeleton';

const PAGE_SIZE = 20;
const FILTERS = ['All', 'book', 'chapter'];

export default function AdminRecycleBin() {
  const pushToast = useUiStore((s) => s.pushToast);
  const user = useAuthStore((s) => s.user);
  const canRestore = hasAdminCapability(user, 'books.delete');
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => { setPage(1); }, [q, filter]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get('/admin/recycle', {
        query: {
          q: q || undefined,
          entityType: filter === 'All' ? undefined : filter,
          page,
          pageSize: PAGE_SIZE,
        },
      });
      setItems(data.items || []);
      setTotal(Number(data.total) || 0);
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not load recycle bin', message: err.message });
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [q, filter, page, pushToast]);

  useEffect(() => { load(); }, [load]);

  async function restore(item) {
    setBusyId(item.id);
    try {
      await api.post(`/admin/recycle/${item.id}/restore`);
      pushToast({ type: 'success', title: 'Restored', message: `${item.title} is back in the catalog.` });
      await load();
    } catch (err) {
      pushToast({ type: 'error', title: 'Restore failed', message: err.message });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-[14px] text-on-surface-variant normal-case tracking-normal font-sans">
        Deleted books and chapters are kept here. Restore them to bring content back to the site.
      </p>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search recycle bin"
        className="w-full md:max-w-md bg-transparent border-b border-outline-variant focus:border-on-surface focus:outline-none py-2 text-[16px] text-on-surface placeholder:text-on-surface-variant"
      />
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)} className="inline-flex">
            <Chip active={filter === f}>{f === 'All' ? 'All' : f}</Chip>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="border border-outline-variant rounded-md p-6 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonRow key={i} columns={4} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-on-surface-variant">Recycle bin is empty.</p>
      ) : (
        <div className="overflow-x-auto border border-outline-variant rounded-md">
          <table className="w-full text-left text-[14px]">
            <thead className="bg-surface-container border-b border-outline-variant">
              <tr className="text-on-surface-variant label-sm uppercase">
                <th className="px-4 py-3 font-medium">Item</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Deleted by</th>
                <th className="px-4 py-3 font-medium">Deleted</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-outline-variant/60">
                  <td className="px-4 py-4">
                    <p className="font-serif text-[16px] text-on-surface">{item.title}</p>
                    {item.entityType === 'chapter' && item.bookId && (
                      <p className="text-[12px] text-on-surface-variant">Book ID {item.bookId}</p>
                    )}
                  </td>
                  <td className="px-4 py-4 capitalize text-on-surface-variant">{item.entityType}</td>
                  <td className="px-4 py-4 text-on-surface-variant">{item.deletedBy?.displayName}</td>
                  <td className="px-4 py-4 text-on-surface-variant whitespace-nowrap">
                    {formatDateTime(item.deletedAt)}
                  </td>
                  <td className="px-4 py-4 text-right">
                    {canRestore && (
                      <button
                        type="button"
                        onClick={() => restore(item)}
                        disabled={busyId === item.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-outline-variant text-[11px] uppercase tracking-labelTight text-on-surface-variant hover:text-on-surface disabled:opacity-50"
                      >
                        <RotateCcw size={14} />
                        Restore
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
    </div>
  );
}
