import Image from 'next/image';
import Link from 'next/link';

function normalizeCover(url) {
  if (!url) return url;
  return url
    .replace('thumbnail/150x', 'thumbnail/240x')
    .replace('thumbnail/150&', 'thumbnail/240&');
}

function toScore(v) {
  const n = typeof v === 'string' ? Number.parseFloat(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

function fallbackScore(idx) {
  const v = ((idx + 1) * 37) % 8;
  return 4.2 + v * 0.1;
}

export default function YouMayAlsoLikeSection({ items = [] }) {
  if (!Array.isArray(items) || items.length === 0) return null;

  const visible = items.slice(0, 7);

  return (
    <section className="mt-14 md:mt-16">
      <h2 className="font-headline-md text-headline-md text-ink-900 dark:text-neutral-100 mb-6">
        You May Also Like
      </h2>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-4 sm:gap-x-6 sm:gap-y-8">
        {visible.map((b, idx) => {
          const href = b?.slug ? `/books/${b.slug}` : '/discover';
          const cover = normalizeCover(b?.coverUrl);
          const title = b?.title || 'Untitled';
          const category = b?.category || 'Novel';
          const rating = toScore(b?.score) ?? fallbackScore(idx);

          return (
            <Link key={b?.id ?? href + title} href={href} className="min-w-0 group block">
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
              <div className="mt-1 flex items-center gap-2">
                <p className="text-sm text-ink-500 dark:text-neutral-500 line-clamp-1">{category}</p>
                <span className="inline-flex items-center gap-1 text-sm text-ink-500 dark:text-neutral-400 shrink-0">
                  <span className="text-[12px] leading-none">★</span>
                  {rating.toFixed(1)}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

