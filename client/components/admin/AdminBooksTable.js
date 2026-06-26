'use client';

import Link from 'next/link';
import { BookOpen, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/format';
import { useAuthStore } from '@/stores/authStore';
import { hasAdminCapability } from '@/lib/adminPermissions';

export default function AdminBooksTable({ items, onRecycleBook, busyBookId }) {
  const user = useAuthStore((s) => s.user);
  const canDelete = hasAdminCapability(user, 'books.delete');

  if (!items?.length) return <p className="text-on-surface-variant">No books found.</p>;

  return (
    <div className="overflow-x-auto border border-outline-variant rounded-md">
      <table className="w-full text-left text-[14px]">
        <thead className="bg-surface-container dark:bg-neutral-900/80 border-b border-outline-variant">
          <tr className="text-on-surface-variant label-sm uppercase">
            <th className="px-4 py-3 font-medium">Title</th>
            <th className="px-4 py-3 font-medium">Author</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Chapters</th>
            <th className="px-4 py-3 font-medium">Updated</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {items.map((b) => (
            <tr key={b.id} className="border-b border-outline-variant/60 hover:bg-surface-container dark:hover:bg-neutral-900/50">
              <td className="px-4 py-4">
                <Link href={`/books/${b.slug}`} className="font-serif text-[16px] text-on-surface hover:underline decoration-gold underline-offset-4">{b.title}</Link>
                <p className="text-[12px] text-on-surface-variant">{b.category || 'Fiction'}</p>
              </td>
              <td className="px-4 py-4 text-on-surface-variant">{b.authorName}</td>
              <td className="px-4 py-4">
                <span className={
                  'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] tracking-labelTight uppercase ' +
                  (b.status === 'published'
                    ? 'bg-gold text-ink-900 dark:text-neutral-950'
                    : b.status === 'archived'
                      ? 'bg-surface-container-highest text-on-surface-variant dark:bg-neutral-700 dark:text-neutral-300'
                      : 'bg-surface-container-high text-on-surface dark:bg-neutral-800 dark:text-neutral-200')
                }>{b.status}</span>
              </td>
              <td className="px-4 py-4 text-on-surface-variant">{b.chapterCount}</td>
              <td className="px-4 py-4 text-on-surface-variant">{formatDate(b.updatedAt)}</td>
              <td className="px-4 py-4">
                <div className="flex items-center justify-end gap-2">
                  <Link
                    href={`/admin/books/${b.id}/chapters`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-outline-variant text-[11px] uppercase tracking-labelTight text-on-surface-variant hover:text-on-surface hover:border-on-surface"
                    title="View chapters"
                  >
                    <BookOpen size={14} />
                    Chapters
                  </Link>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => onRecycleBook?.(b)}
                      disabled={busyBookId === b.id}
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
  );
}
