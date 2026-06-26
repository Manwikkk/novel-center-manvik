import Image from 'next/image';
import Link from 'next/link';
import SectionViewAllLink from '@/components/home/SectionViewAllLink';
import { cn } from '@/lib/cn';

function normalizeCover(url) {
  if (!url) return url;
  return url
    .replace('thumbnail/150x', 'thumbnail/240x')
    .replace('thumbnail/150&', 'thumbnail/240&');
}

export default function UpdatedTodaySection({ items = [] }) {
  if (!Array.isArray(items) || items.length === 0) return null;

  const visible = items.slice(0, 7);

  return (
    <section className="max-w-[1280px] mx-auto px-4 md:px-edge mt-14 md:mt-16">
      <div className="flex items-end justify-between gap-4 mb-6">
        <h2 className="font-headline-md text-headline-md text-ink-900 dark:text-neutral-100">
          Updated Today
        </h2>
        <SectionViewAllLink href="/sections/updated-today" />
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-4 sm:gap-x-6 sm:gap-y-8">
        {visible.map((b, i) => {
          const href = b?.slug ? `/books/${b.slug}` : '/discover';
          const cover = normalizeCover(b?.coverUrl);
          const title = b?.title || 'Untitled';
          const category = b?.category || 'Novel';

          return (
            <Link
              key={b?.id ?? href + title}
              href={href}
              className={cn('min-w-0 group block', i >= 6 && 'hidden sm:block')}
            >
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
              <p className="mt-1 text-sm text-ink-500 dark:text-neutral-500">{category}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
