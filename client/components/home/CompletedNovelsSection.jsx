'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';

function normalizeCover(url) {
  if (!url) return url;
  return url
    .replace('thumbnail/150x', 'thumbnail/420x')
    .replace('thumbnail/150&', 'thumbnail/420&');
}

function toScore(v) {
  const n = typeof v === 'string' ? Number.parseFloat(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

function fallbackScore(idx) {
  const v = ((idx + 1) * 41) % 7;
  return 4.3 + v * 0.1;
}

export default function CompletedNovelsSection({ items = [] }) {
  const list = (Array.isArray(items) ? items : []).slice(0, 10);
  const [active, setActive] = useState(0);

  const selected = list[active] || list[0];
  const selectedIdx = Math.max(0, Math.min(active, list.length - 1));

  const coverStrip = useMemo(
    () =>
      list.map((b) => ({
        id: b?.id ?? b?.slug ?? b?.title,
        title: b?.title || 'Untitled',
        cover: normalizeCover(b?.coverUrl),
        href: b?.slug ? `/books/${b.slug}` : '/discover',
      })),
    [list],
  );

  if (!selected) return null;

  const heroCover = normalizeCover(selected?.coverUrl);
  const title = selected?.title || 'Untitled';
  const category = selected?.category || 'Novel';
  const rating = toScore(selected?.score) ?? fallbackScore(selectedIdx);
  const description =
    (selected?.synopsis && String(selected.synopsis).trim()) ||
    'A completed story you can binge from start to finish — no waiting, no cliffhangers left unresolved.';
  const href = selected?.slug ? `/books/${selected.slug}` : '/discover';
  const chapterNum = selected?.chapterNum;

  return (
    <div className="min-w-0">
      <h2 className="font-headline-md text-headline-md text-ink-900 dark:text-neutral-100 mb-6">
        Completed Novels
      </h2>

      {/* Top strip */}
      <div className="rounded-2xl bg-neutral-50/70 dark:bg-neutral-950/40 border border-neutral-200 dark:border-neutral-800 p-4 md:p-5">
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
          {coverStrip.map((b, i) => (
            <button
              key={String(b.id) + String(i)}
              type="button"
              onClick={() => setActive(i)}
              className={[
                'group shrink-0 rounded-xl overflow-hidden ring-2 transition-all',
                i === selectedIdx
                  ? 'ring-gold shadow-gold-glow'
                  : 'ring-transparent hover:ring-ink-200 dark:hover:ring-neutral-700',
              ].join(' ')}
              aria-label={`Select ${b.title}`}
              aria-current={i === selectedIdx}
            >
              <div className="relative h-[72px] w-[52px] bg-neutral-100 dark:bg-neutral-900">
                {b.cover ? (
                  <>
                    <Image
                      src={b.cover}
                      alt=""
                      fill
                      referrerPolicy="no-referrer"
                      className="object-cover scale-110 blur-lg opacity-45 transition-transform duration-300 ease-out group-hover:scale-[1.18]"
                      sizes="52px"
                      unoptimized
                    />
                    <Image
                      src={b.cover}
                      alt={b.title}
                      fill
                      referrerPolicy="no-referrer"
                      className="transition-transform duration-300 ease-out group-hover:scale-[1.06]"
                      sizes="52px"
                      unoptimized
                    />
                  </>
                ) : null}
              </div>
            </button>
          ))}
        </div>

        {/* Detail panel */}
        <div className="mt-4 md:mt-5 grid grid-cols-1 md:grid-cols-[150px_1fr] gap-5 md:gap-6 items-start">
          <Link href={href} className="w-fit group">
            <div className="relative h-[222px] w-[150px] rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-900 shadow-book ring-1 ring-black/5 dark:ring-white/10">
              {heroCover ? (
                <>
                  <Image
                    src={heroCover}
                    alt=""
                    fill
                    referrerPolicy="no-referrer"
                    className="object-cover scale-110 blur-2xl opacity-40 transition-transform duration-300 ease-out group-hover:scale-[1.18]"
                    sizes="150px"
                    unoptimized
                  />
                  <Image
                    src={heroCover}
                    alt={title}
                    fill
                    referrerPolicy="no-referrer"
                    className="transition-transform duration-300 ease-out group-hover:scale-[1.05]"
                    sizes="150px"
                    unoptimized
                  />
                </>
              ) : null}
            </div>
          </Link>

          <div className="min-w-0">
            <h3 className="font-serif text-lg md:text-xl font-semibold text-ink-900 dark:text-neutral-100 leading-snug">
              {title}
            </h3>

            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-ink-600 dark:text-neutral-300">
              <span className="text-sm">{category}</span>
              <span className="inline-flex items-center gap-2 text-sm">
                <span className="text-[14px] leading-none">★</span>
                {rating.toFixed(1)}
              </span>
              {chapterNum ? (
                <span className="text-sm text-ink-500 dark:text-neutral-500">
                  {chapterNum} chapters
                </span>
              ) : null}
            </div>

            <p className="mt-3 text-sm md:text-[15px] leading-relaxed text-ink-600 dark:text-neutral-400 line-clamp-4 md:line-clamp-5">
              {description}
            </p>

            <div className="mt-4 flex items-center gap-2.5">
              <Link
                href={href}
                className="inline-flex items-center justify-center rounded-full bg-ink-900 text-white dark:bg-white dark:text-black px-5 py-2 font-ui-label-sm text-ui-label-sm uppercase tracking-widest hover:opacity-90 transition-opacity"
              >
                Read now
              </Link>
              <button
                type="button"
                className="h-10 w-10 rounded-full bg-ink-900/5 dark:bg-white/10 text-ink-900 dark:text-neutral-100 grid place-items-center hover:bg-ink-900/10 dark:hover:bg-white/15 transition-colors"
                aria-label="Add to library"
              >
                <span className="text-lg leading-none">+</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
