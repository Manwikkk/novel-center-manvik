'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useUiStore } from '@/stores/uiStore';
import { formatRelative } from '@/lib/format';

const STATUSES = ['visible', 'hidden', 'deleted'];

const statusBtnActive =
  'border-on-surface bg-on-surface text-surface dark:bg-neutral-100 dark:text-neutral-950 dark:border-neutral-100';
const statusBtnInactive =
  'border-outline-variant text-on-surface-variant hover:border-on-surface dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-neutral-500';

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

  if (!items?.length) return <p className="text-on-surface-variant">No comments to moderate.</p>;

  return (
    <ul className="divide-y divide-outline-variant border border-outline-variant rounded-md bg-surface-container-lowest">
      {items.map((c) => (
        <li key={c.id} className="p-5 flex flex-col md:flex-row md:items-start gap-4">
          <div className="flex-1 min-w-0">
            <p className="font-serif text-[16px] text-on-surface">{c.author?.displayName}</p>
            <p className="text-[12px] text-on-surface-variant">{c.bookTitle ? `On "${c.bookTitle}"` : 'Direct comment'} · {formatRelative(c.createdAt)}</p>
            <p className="mt-3 text-[15px] text-on-surface whitespace-pre-line">{c.body || <em className="text-on-surface-variant">[no body]</em>}</p>
          </div>
          <div className="flex flex-wrap gap-2 md:flex-col md:items-end">
            <span className={
              'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] tracking-labelTight uppercase ' +
              (c.status === 'visible'
                ? 'bg-surface-container-high text-on-surface dark:bg-neutral-800 dark:text-neutral-200'
                : c.status === 'hidden'
                  ? 'bg-surface-container-highest text-on-surface-variant dark:bg-neutral-700 dark:text-neutral-300'
                  : 'bg-danger/10 text-danger')
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
                    (c.status === s ? statusBtnActive : statusBtnInactive)
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
