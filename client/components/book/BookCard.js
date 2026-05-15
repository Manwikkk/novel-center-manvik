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
 *   • `compact`    — dense grid (Discover): larger cover ratio, type scales with breakpoints.
 */
export default function BookCard({ book, layout = 'vertical', className, kicker }) {
  if (!book) return null;
  const href = `/books/${book.slug}`;
  const cover = book.coverUrl || '/stitch/book-architecture-silence.jpg';

  if (layout === 'compact') {
    return (
      <Link href={href} className={cn('group flex min-w-0 flex-col gap-2.5', className)}>
        <div className="relative w-full aspect-[2/3] overflow-hidden rounded-xl bg-surface-container dark:bg-neutral-900 shadow-book ring-1 ring-black/[0.06] dark:ring-white/10 transition-shadow duration-300 group-hover:shadow-lg group-hover:ring-black/10 dark:group-hover:ring-white/15">
          <img
            alt=""
            src={cover}
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover grayscale-[0.35] transition-all duration-500 group-hover:scale-[1.04] group-hover:grayscale-0"
          />
        </div>
        <div className="min-w-0 px-0.5">
          {book.category ? (
            <p className="mb-0.5 font-ui-label-sm text-[9px] uppercase leading-none tracking-wider text-on-surface-variant dark:text-neutral-500 sm:text-[10px]">
              {book.category}
            </p>
          ) : null}
          <h3 className="line-clamp-2 font-semibold leading-snug tracking-tight text-on-surface dark:text-neutral-100 text-[12px] sm:text-[13px] md:text-[14px] group-hover:text-ink-700 dark:group-hover:text-white">
            {book.title}
          </h3>
          {book.authorName ? (
            <p className="mt-1 line-clamp-1 text-on-surface-variant dark:text-neutral-500 text-[10px] sm:text-[11px] md:text-xs leading-tight">
              {book.authorName}
            </p>
          ) : null}
        </div>
      </Link>
    );
  }

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
          referrerPolicy="no-referrer"
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
            referrerPolicy="no-referrer"
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
    <Link href={href} className={cn('group flex cursor-pointer flex-col gap-3.5', className)}>
      <div className="aspect-[2/3] overflow-hidden rounded-lg bg-surface-container border border-surface-variant shadow-sm dark:bg-neutral-900 dark:border-neutral-800 p-0.5 transition-shadow group-hover:shadow-md">
        <img
          alt={book.title}
          src={cover}
          referrerPolicy="no-referrer"
          className="h-full w-full rounded-[4px] object-cover grayscale-[0.45] transition-all duration-700 group-hover:scale-[1.03] group-hover:grayscale-0"
        />
      </div>
      <div className="min-w-0">
        {book.category && (
          <p className="mb-1 font-ui-label-sm text-[11px] uppercase leading-none tracking-wider text-on-surface-variant dark:text-neutral-400 sm:text-ui-label-sm">
            {book.category}
          </p>
        )}
        <h3 className="mb-1 line-clamp-2 font-headline-md text-on-surface dark:text-neutral-100 text-[22px] leading-[1.2] sm:text-[24px] md:text-[26px]">
          {book.title}
        </h3>
        <p className="font-reading-body text-on-surface-variant dark:text-neutral-400 text-[14px] leading-snug sm:text-[15px] md:text-[16px]">
          {book.authorName ? <>by {book.authorName}</> : null}
        </p>
      </div>
    </Link>
  );
}
