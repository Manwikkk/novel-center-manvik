import Link from 'next/link';
import BookCard from './BookCard';

export default function BookRow({ title, kicker, books, viewAllHref }) {
  return (
    <section className="mt-16">
      <div className="flex items-end justify-between mb-8 gap-4">
        <div>
          {kicker && <p className="label-sm uppercase text-ink-400">{kicker}</p>}
          <h2 className="mt-2 font-serif text-[28px] md:text-[36px] leading-[1.2] text-ink-900">{title}</h2>
        </div>
        {viewAllHref && (
          <Link href={viewAllHref} className="label-sm uppercase text-ink-700 hover:text-ink-900 hidden md:inline">
            View all
          </Link>
        )}
      </div>
      {books && books.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-gutter gap-y-12">
          {books.map((b) => <BookCard key={b.id} book={b} />)}
        </div>
      ) : (
        <p className="text-ink-400">No books to show yet.</p>
      )}
    </section>
  );
}
