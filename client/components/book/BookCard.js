import Link from 'next/link';
import { cn } from '@/lib/cn';

/**
 * Stitch book card primitive.
 *
 * Layouts:
 *   • `vertical`   (default) — 2/3 cover above metadata, used in the
 *     "Trending Now", "For You", and library grids.  Idle state desaturates
 *     the cover; hover restores colour and gently scales the artwork.
 *   • `horizontal` — small 12-tall cover with title/author on the right,
 *     used in the Reader Home "Recently Opened" rail.
 *   • `scroll`     — wider card with strong shadow, used in the horizontal
 *     "For You" snap-scroll on Reader Home.
 */
export default function BookCard({ book, layout = 'vertical', className, kicker }) {
  if (!book) return null;
  const href = `/books/${book.slug}`;
  const cover = book.coverUrl || '/stitch/book-architecture-silence.jpg';

  if (layout === 'horizontal') {
    return (
      <Link
        href={href}
        className={cn(
          'flex items-center gap-4 p-4 rounded-lg hover:bg-surface-container-low dark:hover:bg-neutral-900 transition-colors cursor-pointer group border border-transparent hover:border-surface-container-high dark:hover:border-neutral-700',
          className,
        )}
      >
        <img
          alt={book.title}
          src={cover}
          className="w-12 aspect-[2/3] object-cover rounded-[2px] shadow-sm group-hover:shadow-md transition-shadow"
        />
        <div className="min-w-0">
          <h5 className="font-ui-label-lg text-ui-label-lg text-on-surface dark:text-neutral-100 group-hover:text-primary dark:group-hover:text-neutral-100 transition-colors truncate">
            {book.title}
          </h5>
          <p className="font-ui-label-sm text-ui-label-sm text-on-surface-variant dark:text-neutral-400 truncate">
            {book.authorName}
          </p>
        </div>
        {typeof kicker === 'string' && (
          <div className="ml-auto text-right">
            <span className="font-ui-label-sm text-ui-label-sm text-on-surface-variant dark:text-neutral-400">{kicker}</span>
          </div>
        )}
      </Link>
    );
  }

  if (layout === 'scroll') {
    return (
      <Link
        href={href}
        className={cn(
          'flex-none w-[200px] md:w-[240px] snap-start group cursor-pointer',
          className,
        )}
      >
        <div className="relative mb-6">
          <img
            alt={book.title}
            src={cover}
            className="w-full aspect-[2/3] object-cover rounded shadow-book group-hover:-translate-y-2 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-colors rounded" />
        </div>
        <div>
          <h4 className="font-ui-label-lg text-ui-label-lg text-on-surface dark:text-neutral-100 mb-1 truncate">
            {book.title}
          </h4>
          <p className="font-ui-label-sm text-ui-label-sm text-on-surface-variant dark:text-neutral-400 mb-2 truncate">
            {book.authorName}
          </p>
          {kicker && (
            <p className="font-ui-label-sm text-ui-label-sm text-on-surface-variant/70 dark:text-neutral-500 italic">
              {kicker}
            </p>
          )}
        </div>
      </Link>
    );
  }

  return (
    <Link href={href} className={cn('group cursor-pointer flex flex-col gap-4', className)}>
      <div className="aspect-[2/3] bg-surface-container border border-surface-variant dark:bg-neutral-900 dark:border-neutral-800 p-1 shadow-sm overflow-hidden">
        <img
          alt={book.title}
          src={cover}
          className="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all duration-700 scale-100 group-hover:scale-105"
        />
      </div>
      <div>
        {book.category && (
          <p className="font-ui-label-sm text-ui-label-sm text-on-surface-variant dark:text-neutral-400 uppercase mb-1">
            {book.category}
          </p>
        )}
        <h3 className="font-headline-md text-on-surface dark:text-neutral-100 text-[24px] leading-tight mb-1">
          {book.title}
        </h3>
        <p className="font-reading-body text-[16px] text-on-surface-variant dark:text-neutral-400">
          by {book.authorName}
        </p>
      </div>
    </Link>
  );
}
