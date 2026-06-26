import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/cn';

function normalizeCover(url) {
  if (!url) return url;
  return url
    .replace('thumbnail/150x', 'thumbnail/240x')
    .replace('thumbnail/150&', 'thumbnail/240&');
}

export default function CompactBookTile({ book, className, action, href: hrefProp, subtitle }) {
  if (!book) return null;

  const href = hrefProp || (book.slug ? `/books/${book.slug}` : '/discover');
  const cover = normalizeCover(book.coverUrl);
  const title = book.title || 'Untitled';
  const meta = subtitle ?? (book.category || 'Novel');

  return (
    <div className={cn('min-w-0 group', className)}>
      <div className="relative w-full max-w-[120px]">
        <Link href={href} className="block">
          <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-900 shadow-book ring-1 ring-black/5 dark:ring-white/10">
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
        </Link>
        {action}
      </div>

      <Link href={href} className="block max-w-[120px]">
        <p className="mt-3 font-sans text-[15px] leading-snug font-semibold text-ink-900 dark:text-neutral-100 line-clamp-2">
          {title}
        </p>
        <p className="mt-1 text-sm text-ink-500 dark:text-neutral-500 line-clamp-1">
          {meta}
        </p>
      </Link>
    </div>
  );
}
