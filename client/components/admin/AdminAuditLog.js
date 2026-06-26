'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useUiStore } from '@/stores/uiStore';
import { formatDateTime } from '@/lib/format';
import Pagination from '@/components/ui/Pagination';
import { SkeletonRow } from '@/components/ui/Skeleton';

const PAGE_SIZE = 25;

export default function AdminAuditLog() {
  const pushToast = useUiStore((s) => s.pushToast);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setPage(1); }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get('/admin/audit-logs', {
        query: { q: q || undefined, page, pageSize: PAGE_SIZE },
      });
      setItems(data.items || []);
      setTotal(Number(data.total) || 0);
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not load audit log', message: err.message });
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [q, page, pushToast]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-5">
      <p className="text-[14px] text-on-surface-variant normal-case tracking-normal font-sans">
        Every staff action — token adjustments, suspensions, comment moderation, and account changes — is recorded here.
      </p>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search action, summary, or actor email"
        className="w-full md:max-w-md bg-transparent border-b border-outline-variant focus:border-on-surface focus:outline-none py-2 text-[16px] text-on-surface placeholder:text-on-surface-variant"
      />
      {loading ? (
        <div className="border border-outline-variant rounded-md p-6 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonRow key={i} columns={4} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-on-surface-variant text-[14px]">No audit entries yet.</p>
      ) : (
        <div className="overflow-x-auto border border-outline-variant rounded-md">
          <table className="w-full text-left text-[14px]">
            <thead className="bg-surface-container border-b border-outline-variant">
              <tr className="text-on-surface-variant label-sm uppercase">
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Actor</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Summary</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-b border-outline-variant/60">
                  <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">
                    {formatDateTime(row.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-on-surface">{row.actorEmail}</p>
                    <p className="text-[11px] text-on-surface-variant normal-case tracking-normal font-sans">
                      {row.staffRole ? row.staffRole.replace(/_/g, ' ') : row.actorRole}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-0.5 rounded-full bg-surface-container-high text-[11px] uppercase tracking-labelTight text-on-surface-variant">
                      {row.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-on-surface normal-case tracking-normal font-sans">
                    {row.summary}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
      />
    </div>
  );
}
