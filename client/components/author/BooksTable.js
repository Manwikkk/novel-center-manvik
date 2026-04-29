'use client';

import Link from 'next/link';
import { Pencil, Trash2, ExternalLink } from 'lucide-react';
import Button from '@/components/ui/Button';
import { formatDate } from '@/lib/format';

export default function BooksTable({ items, onDelete }) {
  if (!items || items.length === 0) {
    return (
      <div className="border border-dashed border-ink-200 rounded-md p-10 text-center">
        <p className="label-sm uppercase text-ink-400">Empty shelf</p>
        <p className="mt-2 font-serif text-[20px] text-ink-700">You haven&rsquo;t created a book yet.</p>
        <Button href="/author/books/new" variant="primary" size="sm" className="mt-6">Start a new book</Button>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto border border-ink-200/60 rounded-md">
      <table className="w-full text-left text-[14px]">
        <thead className="bg-cream-200/40 border-b border-ink-200/60">
          <tr className="text-ink-400 label-sm uppercase">
            <th className="px-4 py-3 font-medium">Title</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Chapters</th>
            <th className="px-4 py-3 font-medium">Updated</th>
            <th className="px-4 py-3" aria-label="actions" />
          </tr>
        </thead>
        <tbody>
          {items.map((b) => (
            <tr key={b.id} className="border-b border-ink-200/40 hover:bg-cream-200/40">
              <td className="px-4 py-4">
                <p className="font-serif text-[16px] text-ink-900">{b.title}</p>
                <p className="text-[12px] text-ink-400">{b.category || 'Fiction'}</p>
              </td>
              <td className="px-4 py-4">
                <span className={
                  'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] tracking-labelTight uppercase ' +
                  (b.status === 'published' ? 'bg-gold text-ink-900'
                    : b.status === 'archived' ? 'bg-ink-200 text-ink-700'
                    : 'bg-cream-300 text-ink-700')
                }>
                  {b.status}
                </span>
              </td>
              <td className="px-4 py-4 text-ink-700">{b.chapterCount ?? '—'}</td>
              <td className="px-4 py-4 text-ink-400">{formatDate(b.updatedAt)}</td>
              <td className="px-4 py-4">
                <div className="flex items-center gap-2 justify-end">
                  <Link href={`/books/${b.slug}`} className="p-2 text-ink-400 hover:text-ink-900" aria-label="View public page" title="View public page">
                    <ExternalLink size={16} />
                  </Link>
                  <Link href={`/author/books/${b.id}/edit`} className="p-2 text-ink-400 hover:text-ink-900" aria-label="Edit" title="Edit">
                    <Pencil size={16} />
                  </Link>
                  <button onClick={() => onDelete?.(b)} className="p-2 text-ink-400 hover:text-danger" aria-label="Delete" title="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
