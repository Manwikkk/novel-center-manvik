'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, ExternalLink, Trash2 } from 'lucide-react';
import AdminPageGuard from '@/components/layout/AdminPageGuard';
import DashboardShell from '@/components/layout/DashboardShell';
import DashboardTopbar from '@/components/layout/DashboardTopbar';
import ConfirmRecycleModal from '@/components/admin/ConfirmRecycleModal';
import { SkeletonRow } from '@/components/ui/Skeleton';
import { api } from '@/lib/api';
import { useUiStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { hasAdminCapability } from '@/lib/adminPermissions';
import { formatDate, formatDateTime } from '@/lib/format';

function Inner() {
  const { id } = useParams();
  const bookId = Number(id);
  const pushToast = useUiStore((s) => s.pushToast);
  const user = useAuthStore((s) => s.user);
  const canDelete = hasAdminCapability(user, 'books.delete');
  const [book, setBook] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [target, setTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get(`/admin/books/${bookId}/chapters`);
      setBook(data.book || null);
      setItems(data.items || []);
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not load chapters', message: err.message });
      setBook(null);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [bookId, pushToast]);

  useEffect(() => { load(); }, [load]);

  async function confirmRecycle() {
    if (!target) return;
    setBusyId(target.id);
    try {
      await api.post(`/admin/chapters/${target.id}/recycle`);
      pushToast({ type: 'success', title: 'Chapter moved to recycle bin' });
      setTarget(null);
      await load();
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not recycle chapter', message: err.message });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <DashboardShell kind="admin">
      <DashboardTopbar subtitle="Administration" title={book?.title || 'Chapters'} />
      <div className="px-4 md:px-edge py-8 space-y-6">
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/admin/books"
            className="inline-flex items-center gap-2 text-[12px] uppercase tracking-widest text-on-surface-variant hover:text-on-surface"
          >
            <ArrowLeft size={16} />
            Back to books
          </Link>
          {book?.slug && (
            <Link
              href={`/books/${book.slug}`}
              className="inline-flex items-center gap-2 text-[12px] uppercase tracking-widest text-on-surface-variant hover:text-on-surface"
            >
              <ExternalLink size={14} />
              Public page
            </Link>
          )}
        </div>

        {book && (
          <p className="text-[14px] text-on-surface-variant normal-case tracking-normal font-sans">
            by {book.authorName} · {items.length} chapter{items.length === 1 ? '' : 's'}
          </p>
        )}

        {loading ? (
          <div className="border border-outline-variant rounded-md p-6 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonRow key={i} columns={4} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-on-surface-variant">No chapters in this book.</p>
        ) : (
          <div className="overflow-x-auto border border-outline-variant rounded-md">
            <table className="w-full text-left text-[14px]">
              <thead className="bg-surface-container border-b border-outline-variant">
                <tr className="text-on-surface-variant label-sm uppercase">
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id} className="border-b border-outline-variant/60 hover:bg-surface-container/50">
                    <td className="px-4 py-4 text-on-surface-variant tabular-nums">{c.idx}</td>
                    <td className="px-4 py-4">
                      <p className="font-serif text-[16px] text-on-surface">{c.title}</p>
                      <p className="text-[12px] text-on-surface-variant">
                        {c.isPaid && c.tokenPrice > 0 ? `${c.tokenPrice} tokens` : 'Free'}
                      </p>
                    </td>
                    <td className="px-4 py-4 capitalize text-on-surface-variant">
                      {c.scheduledPublishAt
                        ? `Scheduled · ${formatDateTime(c.scheduledPublishAt)}`
                        : c.status}
                    </td>
                    <td className="px-4 py-4 text-on-surface-variant">{formatDate(c.updatedAt)}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/read/${c.id}`}
                          className="px-3 py-1.5 rounded border border-outline-variant text-[11px] uppercase tracking-labelTight text-on-surface-variant hover:text-on-surface"
                        >
                          Read
                        </Link>
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => setTarget(c)}
                            disabled={busyId === c.id}
                            className="p-2 text-on-surface-variant hover:text-danger disabled:opacity-50"
                            title="Move to recycle bin"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmRecycleModal
        open={Boolean(target)}
        title="Move chapter to recycle bin?"
        message={`"${target?.title}" will be hidden from the site. You can restore it later from the Recycle bin tab.`}
        busy={target != null && busyId === target.id}
        onClose={() => { if (busyId !== target?.id) setTarget(null); }}
        onConfirm={confirmRecycle}
      />
    </DashboardShell>
  );
}

export default function AdminBookChaptersPage() {
  return (
    <AdminPageGuard permission="books">
      <Inner />
    </AdminPageGuard>
  );
}
