'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useUiStore } from '@/stores/uiStore';
import { formatRelative } from '@/lib/format';

const STATUSES = ['visible', 'hidden', 'deleted'];

export default function CommentsModeration({ items, onChange }) {
  const pushToast = useUiStore((s) => s.pushToast);
  const [busy, setBusy] = useState(null);

  async function set(id, status) {
    setBusy(id);
    try {
      const r = await api.patch(`/admin/comments/${id}/status`, { status });
      onChange?.(r.comment);
      pushToast({ type: 'success', title: `Marked ${status}` });
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not update', message: err.message });
    } finally {
      setBusy(null);
    }
  }

  if (!items?.length) return <p className="text-ink-400">No comments to moderate.</p>;

  return (
    <ul className="divide-y divide-ink-200/60 border border-ink-200/60 rounded-md bg-cream-100">
      {items.map((c) => (
        <li key={c.id} className="p-5 flex flex-col md:flex-row md:items-start gap-4">
          <div className="flex-1 min-w-0">
            <p className="font-serif text-[16px] text-ink-900">{c.author?.displayName}</p>
            <p className="text-[12px] text-ink-400">{c.bookTitle ? `On "${c.bookTitle}"` : 'Direct comment'} · {formatRelative(c.createdAt)}</p>
            <p className="mt-3 text-[15px] text-ink-700 whitespace-pre-line">{c.body || <em className="text-ink-400">[no body]</em>}</p>
          </div>
          <div className="flex flex-wrap gap-2 md:flex-col md:items-end">
            <span className={
              'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] tracking-labelTight uppercase ' +
              (c.status === 'visible' ? 'bg-cream-300 text-ink-700' : c.status === 'hidden' ? 'bg-ink-200 text-ink-700' : 'bg-danger/10 text-danger')
            }>
              {c.status}
            </span>
            <div className="flex gap-1">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={busy === c.id || c.status === s}
                  onClick={() => set(c.id, s)}
                  className={
                    'px-2 py-1 text-[11px] tracking-labelTight uppercase border rounded ' +
                    (c.status === s ? 'border-ink-900 bg-ink-900 text-cream-100' : 'border-ink-200 text-ink-700 hover:border-ink-700')
                  }
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
