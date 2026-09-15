import Image from 'next/image';
import Link from 'next/link';

function normalizeCover(url) {
  if (!url) return url;
  return url
    .replace('thumbnail/150x', 'thumbnail/200x')
    .replace('thumbnail/150&', 'thumbnail/200&');
}

function toScore(v) {
  const n = typeof v === 'string' ? Number.parseFloat(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

function fallbackScore(idx, seed = 0) {
  const v = ((idx + 1) * 37 + seed * 13) % 8;
  return 4.2 + v * 0.1;
}

function Rating({ score }) {
  return (
    <span className="inline-flex items-center gap-1 text-ink-500 dark:text-neutral-400">
      <span className="text-[12px] leading-none">★</span>
      <span className="text-sm">{score.toFixed(1)}</span>
    </span>
  );
}

function RibbonTitle({ children }) {
  return (
    <div className="inline-flex items-stretch">
      <div className="relative bg-black text-white px-3 py-1.5 font-ui-label-lg text-ui-label-lg font-semibold leading-none">
        {children}
      </div>
      <div
        aria-hidden
        className="w-6 bg-gold"
        style={{ clipPath: 'polygon(0 0, 100% 0, 78% 100%, 0% 100%)' }}
      />
    </div>
  );
}

function RankList({ title, items, seed = 0, viewAllHref }) {
  return (
    <div className="min-w-0">
      <div className="mb-3 flex items-end justify-between gap-3">
        <RibbonTitle>{title}</RibbonTitle>
        {viewAllHref ? (
          <Link
            href={viewAllHref}
            className="shrink-0 mb-0.5 font-ui-label-sm text-ui-label-sm uppercase tracking-widest text-ink-700 dark:text-neutral-300 border-b border-ink-700/50 dark:border-neutral-500 pb-0.5 hover:text-ink-900 dark:hover:text-white hover:border-ink-900 dark:hover:border-white transition-colors"
          >
            View all
          </Link>
        ) : null}
      </div>
      <div className="space-y-2">
        {items.slice(0, 5).map((b, idx) => {
          const href = b?.slug ? `/books/${b.slug}` : '/discover';
          const cover = normalizeCover(b?.coverUrl);
          const titleText = b?.title || 'Untitled';
          const category = b?.category || 'Novel';
          const score = toScore(b?.score) ?? fallbackScore(idx, seed);

          return (
            <Link
              key={(b?.id ?? href) + String(idx)}
              href={href}
              className="group grid grid-cols-[36px_22px_1fr] items-start gap-1.5 rounded-xl px-1.5 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-900/60 transition-colors"
            >
              <div className="relative h-[48px] w-[36px] shrink-0 overflow-hidden rounded-md bg-neutral-100 dark:bg-neutral-900 ring-1 ring-black/5 dark:ring-white/10">
                {cover ? (
                  <div className="relative h-full w-full">
                    <Image
                      src={cover}
                      alt=""
                      fill
                      referrerPolicy="no-referrer"
                      className="object-cover scale-110 blur-lg opacity-45"
                      sizes="36px"
                      unoptimized
                    />
                    <Image
                      src={cover}
                      alt={titleText}
                      fill
                      referrerPolicy="no-referrer"
                      className="object-contain transition-transform duration-300 ease-out group-hover:scale-[1.08]"
                      sizes="36px"
                      unoptimized
                    />
                  </div>
                ) : null}
              </div>

              <div
                className={[
                  'shrink-0 justify-self-center text-center font-ui-label-sm text-ui-label-sm tabular-nums pt-0.5 font-bold',
                  idx === 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : idx === 1
                      ? 'text-[#ff7a00]'
                      : idx === 2
                        ? 'text-[#e11d48]'
                        : 'text-ink-500 dark:text-neutral-500',
                ].join(' ')}
              >
                {String(idx + 1).padStart(2, '0')}
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-sans text-[14px] md:text-[15px] font-semibold text-ink-900 dark:text-neutral-100 leading-snug line-clamp-1 group-hover:text-ink-700 dark:group-hover:text-white transition-colors">
                  {titleText}
                </p>
                <div className="mt-0.5 flex items-center gap-2">
                  <p className="text-sm text-ink-500 dark:text-neutral-500 line-clamp-1">{category}</p>
                  <Rating score={score} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function RankingNovelsSection({
  mostRead = [],
  trending = [],
  highlyRated = [],
  heading = 'Ranking Novels',
}) {
  if (mostRead.length === 0 && trending.length === 0 && highlyRated.length === 0) return null;

  return (
    <section className="max-w-[1280px] mx-auto px-4 md:px-edge mt-14 md:mt-16">
      {heading ? (
        <div className="mb-6">
          <h2 className="font-headline-md text-headline-md text-ink-900 dark:text-neutral-100">
            {heading}
          </h2>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
        <RankList title="Most Read" items={mostRead} seed={1} viewAllHref="/sections/most-read" />
        <RankList title="Trending" items={trending} seed={2} viewAllHref="/sections/trending" />
        <RankList title="Highly Rated" items={highlyRated} seed={3} viewAllHref="/sections/highly-rated" />
      </div>
    </section>
  );
}
