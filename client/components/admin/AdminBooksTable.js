import Link from 'next/link';
import { formatDate } from '@/lib/format';

export default function AdminBooksTable({ items }) {
  if (!items?.length) return <p className="text-ink-400">No books found.</p>;
  return (
    <div className="overflow-x-auto border border-ink-200/60 rounded-md">
      <table className="w-full text-left text-[14px]">
        <thead className="bg-cream-200/40 border-b border-ink-200/60">
          <tr className="text-ink-400 label-sm uppercase">
            <th className="px-4 py-3 font-medium">Title</th>
            <th className="px-4 py-3 font-medium">Author</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Chapters</th>
            <th className="px-4 py-3 font-medium">Updated</th>
          </tr>
        </thead>
        <tbody>
          {items.map((b) => (
            <tr key={b.id} className="border-b border-ink-200/40 hover:bg-cream-200/40">
              <td className="px-4 py-4">
                <Link href={`/books/${b.slug}`} className="font-serif text-[16px] text-ink-900 hover:underline decoration-gold underline-offset-4">{b.title}</Link>
                <p className="text-[12px] text-ink-400">{b.category || 'Fiction'}</p>
              </td>
              <td className="px-4 py-4 text-ink-700">{b.authorName}</td>
              <td className="px-4 py-4">
                <span className={
                  'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] tracking-labelTight uppercase ' +
                  (b.status === 'published' ? 'bg-gold text-ink-900'
                    : b.status === 'archived' ? 'bg-ink-200 text-ink-700'
                    : 'bg-cream-300 text-ink-700')
                }>{b.status}</span>
              </td>
              <td className="px-4 py-4 text-ink-700">{b.chapterCount}</td>
              <td className="px-4 py-4 text-ink-400">{formatDate(b.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
