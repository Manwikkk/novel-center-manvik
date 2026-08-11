'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

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
  const v = ((idx + 1) * 31) % 7;
  return 4.4 + v * 0.08;
}

function Cover({ src, alt, sizes, blurClass = 'opacity-30', mode = 'contain' }) {
  if (!src) return null;
  const mainFit =
    mode === 'fill'
      ? 'object-cover object-center scale-[1.02] group-hover:scale-105'
      : 'object-contain group-hover:scale-[1.06]';
  return (
    <div className="relative h-full w-full overflow-hidden">
      <Image
        src={src}
        alt=""
        fill
        referrerPolicy="no-referrer"
        className={`object-cover scale-110 blur-2xl ${blurClass} transition-transform duration-300 ease-out group-hover:scale-[1.18]`}
        sizes={sizes}
        unoptimized
      />
      <Image
        src={src}
        alt={alt}
        fill
        referrerPolicy="no-referrer"
        className={`${mainFit} transition-transform duration-300 ease-out`}
        sizes={sizes}
        unoptimized
      />
    </div>
  );
}

/**
 * "ORIGINAL" ribbon — gold fill + ink text in light mode, same gold with deep text in dark
 * so it reads as a full editorial highlight (not neutral black/white).
 */
function OriginalBadge() {
  return (
    <span
      className={[
        'absolute -left-1 top-0 z-10',
        'inline-flex items-center gap-1.5',
        'rounded-br-xl rounded-tl-2xl',
        'px-2.5 py-1',
        'bg-gold text-ink-900',
        'dark:bg-gold dark:text-black',
        'ring-1 ring-ink-900/20 shadow-sm',
        'dark:ring-black/30 dark:shadow-[0_1px_8px_rgba(0,0,0,0.35)]',
        'font-ui-label-sm text-[10px] uppercase tracking-[0.2em] font-bold leading-none',
      ].join(' ')}
      aria-label="GS Original"
    >
      <svg
        width="9"
        height="9"
        viewBox="0 0 12 12"
        fill="currentColor"
        className="shrink-0 text-ink-900 dark:text-black"
        aria-hidden
      >
        <path d="M6 0l1.5 4.5H12L8.25 7.5 9.75 12 6 9 2.25 12l1.5-4.5L0 4.5h4.5z" />
      </svg>
      <span className="text-ink-900 dark:text-black">Original</span>
    </span>
  );
}

export default function GSOriginalsSection({ items = [] }) {
  const list = (Array.isArray(items) ? items : []).slice(0, 6);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || list.length <= 1) return undefined;
    const t = setInterval(() => setActive((n) => (n + 1) % list.length), 3000);
    return () => clearInterval(t);
  }, [paused, list.length]);

  if (list.length === 0) return null;

  const safeIdx = Math.max(0, Math.min(active, list.length - 1));
  const selected = list[safeIdx];
  const cover = normalizeCover(selected?.coverUrl);
  const title = selected?.title || 'Untitled';
  const category = selected?.category || 'Original';
  const rating = toScore(selected?.score) ?? fallbackScore(safeIdx);
  const description =
    (selected?.synopsis && String(selected.synopsis).trim()) ||
    'A Novel Centre Original — exclusive serialized fiction crafted with our editors. Dive in early, follow chapter by chapter, and shape what gets greenlit next.';
  const href = selected?.slug ? `/books/${selected.slug}` : '/discover';
  const chapterNum = selected?.chapterNum;

  return (
    <section
      className="relative isolate mt-14 md:mt-16"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="max-w-[1280px] mx-auto px-4 md:px-edge">
        <div className="relative rounded-3xl bg-white dark:bg-black overflow-hidden shadow-editorial-card">
          <div className="p-5 md:p-6">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
              <div className="flex items-center gap-4">
                <span className="inline-flex items-center gap-2 rounded-full border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/40 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-ink-700 dark:text-neutral-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-ink-900 dark:bg-white" />
                  Exclusive
                </span>
                <h2 className="font-serif text-2xl md:text-3xl font-semibold leading-tight text-ink-900 dark:text-white tracking-tight">
                  GS Originals
                </h2>
              </div>
              <p className="max-w-md text-sm text-ink-600 dark:text-neutral-400 leading-relaxed">
                Hand-picked stories you&apos;ll only find on Novel Centre — edited, serialized, and
                shaped by readers like you.
              </p>
            </div>

            {/* Featured + More originals share one row on all breakpoints */}
            <div className="grid grid-cols-2 lg:grid-cols-[1.1fr_0.9fr] gap-3 sm:gap-5 lg:gap-8 items-stretch lg:max-h-[70vh]">
              <div className="relative min-w-0">
                <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 p-3 sm:p-5 h-full flex flex-col">
                  <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-3 sm:gap-5 items-start flex-1">

                    {/* ── Featured cover with ORIGINAL badge ── */}
                    <Link href={href} className="block w-fit mx-auto md:mx-0 group">
                      <div className="relative h-[150px] w-[100px] sm:h-[180px] sm:w-[120px] md:h-[208px] md:w-[140px] rounded-xl md:rounded-2xl overflow-hidden bg-white dark:bg-black ring-1 ring-black/10 dark:ring-white/10 shadow-book">
                        <OriginalBadge />
                        <Cover src={cover} alt={title} sizes="140px" blurClass="opacity-35" mode="fill" />
                      </div>
                    </Link>

                    <div className="min-w-0 text-center md:text-left">
                      <p className="font-ui-label-sm text-[9px] sm:text-[11px] uppercase tracking-[0.18em] sm:tracking-[0.22em] text-ink-500 dark:text-neutral-500">
                        Featured story
                      </p>
                      <h3 className="mt-1.5 sm:mt-2 font-serif text-[15px] sm:text-xl md:text-2xl font-semibold leading-snug text-ink-900 dark:text-white line-clamp-2">
                        {title}
                      </h3>

                      <div className="mt-1.5 sm:mt-2.5 flex flex-wrap items-center justify-center md:justify-start gap-x-2 sm:gap-x-4 gap-y-1 text-[11px] sm:text-sm text-ink-600 dark:text-neutral-400">
                        <span>{category}</span>
                        <span className="inline-flex items-center gap-1">
                          <span className="text-[11px] leading-none">★</span>
                          <span>{rating.toFixed(1)}</span>
                        </span>
                        {chapterNum ? (
                          <span className="hidden sm:inline text-ink-500 dark:text-neutral-500">{chapterNum} chapters</span>
                        ) : null}
                      </div>

                      <p className="mt-2 sm:mt-3 hidden sm:block text-sm md:text-[15px] leading-relaxed text-ink-600 dark:text-neutral-400 line-clamp-3 md:line-clamp-4">
                        {description}
                      </p>

                      <div className="mt-3 sm:mt-4 flex items-center justify-center md:justify-start gap-2 sm:gap-3">
                        <Link
                          href={href}
                          className="inline-flex items-center justify-center gap-1.5 rounded-full bg-ink-900 text-white dark:bg-white dark:text-black px-3 sm:px-5 py-1.5 sm:py-2 font-ui-label-sm text-[10px] sm:text-ui-label-sm uppercase tracking-widest hover:opacity-90 transition-opacity"
                        >
                          Read
                          <span className="hidden sm:inline"> original</span>
                        </Link>
                        <button
                          type="button"
                          className="h-8 w-8 sm:h-10 sm:w-10 rounded-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900/40 text-ink-900 dark:text-white grid place-items-center hover:bg-neutral-50 dark:hover:bg-neutral-900/60 transition-colors"
                          aria-label="Add to library"
                        >
                          <span className="text-base sm:text-lg leading-none">+</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {list.length > 1 ? (
                    <div className="mt-3 sm:mt-5 flex items-center justify-center gap-1.5 sm:gap-2">
                      {list.map((_, i) => (
                        <button
                          key={String(i)}
                          type="button"
                          onClick={() => setActive(i)}
                          aria-label={`Show original ${i + 1}`}
                          aria-current={i === safeIdx}
                          className={`h-1.5 rounded-full transition-all ${
                            i === safeIdx
                              ? 'w-5 sm:w-8 bg-ink-900 dark:bg-white'
                              : 'w-1.5 sm:w-2 bg-ink-900/25 dark:bg-white/25 hover:bg-ink-900/40 dark:hover:bg-white/40'
                          }`}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="min-w-0 min-h-0 flex flex-col lg:pl-1">
                <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3 shrink-0">
                  <p className="font-ui-label-sm text-[9px] sm:text-[11px] uppercase tracking-[0.16em] sm:tracking-[0.22em] text-ink-500 dark:text-neutral-500 truncate">
                    More originals
                  </p>
                  <Link
                    href="/discover"
                    className="shrink-0 text-[9px] sm:text-[12px] uppercase tracking-widest text-ink-700 dark:text-neutral-300 hover:opacity-80"
                  >
                    Browse all
                  </Link>
                </div>

                <div className="space-y-1.5 sm:space-y-2 flex-1 max-h-[280px] sm:max-h-[340px] lg:max-h-[calc(70vh-140px)] overflow-y-auto overscroll-contain pr-0.5">
                  {list.map((b, idx) => {
                    const t = b?.title || 'Untitled';
                    const c = b?.category || 'Original';
                    const s = normalizeCover(b?.coverUrl);
                    const isActive = idx === safeIdx;
                    const key = b?.id ?? b?.slug ?? t;
                    return (
                      <button
                        key={String(key) + String(idx)}
                        type="button"
                        onClick={() => setActive(idx)}
                        className={[
                          'group flex w-full items-center gap-1.5 sm:gap-3 rounded-lg sm:rounded-xl px-1.5 sm:px-3 py-2 sm:py-3 text-left transition-all border',
                          isActive
                            ? 'bg-neutral-50 dark:bg-neutral-900/50 border-neutral-200 dark:border-neutral-700'
                            : 'bg-transparent border-neutral-200/60 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900/40',
                        ].join(' ')}
                      >
                        <div className="flex h-5 w-5 sm:h-6 sm:w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-900 text-[9px] sm:text-[11px] font-bold tabular-nums text-ink-700 dark:text-neutral-300">
                          {String(idx + 1).padStart(2, '0')}
                        </div>

                        <div className="relative h-[40px] w-[30px] sm:h-[52px] sm:w-[40px] shrink-0 overflow-hidden rounded-md bg-white dark:bg-black ring-1 ring-black/10 dark:ring-white/10">
                          <span className="absolute -left-1 top-0 z-10 hidden sm:inline-flex items-center gap-0.5 rounded-br-md rounded-tl-md bg-gold px-1 py-px text-[7px] font-bold uppercase leading-none tracking-wider text-ink-900 ring-1 ring-ink-900/15 dark:text-black dark:ring-black/25">
                            <span className="text-[6px] leading-none text-ink-900 dark:text-black" aria-hidden>
                              ★
                            </span>
                            Orig
                          </span>
                          <div className="group relative h-full w-full">
                            <Cover src={s} alt={t} sizes="40px" blurClass="opacity-35" />
                          </div>
                        </div>

                        <div className="min-w-0 flex-1 py-0.5">
                          <p
                            className={`font-sans text-[11px] sm:text-sm font-semibold leading-snug line-clamp-2 sm:line-clamp-1 ${
                              isActive ? 'text-ink-900 dark:text-white' : 'text-ink-800 dark:text-neutral-200'
                            }`}
                          >
                            {t}
                          </p>
                          <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-ink-500 dark:text-neutral-400 line-clamp-1">{c}</p>
                        </div>
                        {isActive ? (
                          <span aria-hidden className="hidden sm:inline text-ink-900 dark:text-white text-lg leading-none shrink-0">›</span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}