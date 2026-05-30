import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/cn';

function normalizeCover(url) {
  if (!url) return url;
  return url
    .replace('thumbnail/150x', 'thumbnail/240x')
    .replace('thumbnail/150&', 'thumbnail/240&');
}

function HomeBookTile({ book }) {
  const href = book?.slug ? `/books/${book.slug}` : '/discover';
  const cover = normalizeCover(book?.coverUrl);
  const title = book?.title || 'Untitled';
  const category = book?.category || 'Novel';

  return (
    <Link href={href} className="min-w-0 group block">
      <div className="relative w-full max-w-[120px] aspect-[2/3] rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-900 shadow-book ring-1 ring-black/5 dark:ring-white/10">
        {cover ? (
          <div className="relative h-full w-full">
            <Image
              src={cover}
              alt=""
              fill
              referrerPolicy="no-referrer"
              className="object-cover scale-110 blur-xl opacity-50 transition-transform duration-300 ease-out group-hover:scale-[1.18]"
              sizes="(max-width: 640px) 28vw, 120px"
              unoptimized
            />
            <Image
              src={cover}
              alt={title}
              fill
              referrerPolicy="no-referrer"
              className="transition-transform duration-300 ease-out group-hover:scale-[1.06]"
              sizes="(max-width: 640px) 28vw, 120px"
              unoptimized
            />
          </div>
        ) : null}
      </div>

      <p className="mt-3 font-sans text-[15px] leading-snug font-semibold text-ink-900 dark:text-neutral-100 line-clamp-2">
        {title}
      </p>
      <p className="mt-1 text-sm text-ink-500 dark:text-neutral-500 line-clamp-1">{category}</p>
    </Link>
  );
}

export default function HomeBookGrid({ books = [], className }) {
  if (!Array.isArray(books) || books.length === 0) return null;

  return (
    <div
      className={cn(
        'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-4 sm:gap-x-6 sm:gap-y-8',
        className,
      )}
    >
      {books.map((b) => (
        <HomeBookTile key={b.id ?? b.slug} book={b} />
      ))}
    </div>
  );
}
