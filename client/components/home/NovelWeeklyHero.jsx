'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Icon from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/stores/authStore';
import { isCreator } from '@/lib/experience';

/*
 * Home hero: the admin-curated "Weekly Book" slider on the left and the
 * "Meet Novel Centre" column on the right. Both columns are surface cards
 * that follow the site theme (light / dark); the slider paints a blurred,
 * low-opacity copy of the cover behind the copy for a soft editorial feel.
 */

// Filler tiles for "Meet Novel Centre" slots without an assigned book.
const PROMOS = [
  {
    title: 'Become an author',
    hint: 'Publish chapters, grow readers and earn from unlocks.',
    href: '/author/books/new',
    icon: 'edit_note',
    // Members who already write see their studio instead.
    creator: { title: 'Open your studio', hint: 'Drafts, chapters, readers and income in one place.', href: '/author', icon: 'space_dashboard' },
  },
  {
    title: 'Explore the rankings',
    hint: 'The most-read and trending novels this week.',
    href: '/ranking',
    icon: 'leaderboard',
  },
  {
    title: 'Browse every genre',
    hint: 'Fantasy, romance, thrillers, sci-fi and more.',
    href: '/discover',
    icon: 'auto_stories',
  },
];

const MEET_SLOTS = 3;

function heroCoverSrc(url) {
  if (!url) return url;
  return url
    .replace('thumbnail/150x', 'thumbnail/520x')
    .replace('thumbnail/150&', 'thumbnail/520&')
    .replace('thumbnail/150', 'thumbnail/520');
}

function Eyebrow({ children }) {
  return (
    <h2 className="mb-4 flex items-center gap-3 font-ui-label-sm text-ui-label-sm font-bold uppercase tracking-widest text-ink-900 dark:text-neutral-100">
      <span>{children}</span>
      <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" aria-hidden />
    </h2>
  );
}

function CoverFrame({ src, title, className, sizes = '160px', priority = false }) {
  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden rounded-xl bg-neutral-200 ring-1 ring-black/10 dark:bg-neutral-800 dark:ring-white/10',
        className,
      )}
    >
      {src ? (
        <Image
          src={src}
          alt=""
          fill
          referrerPolicy="no-referrer"
          className="object-cover"
          sizes={sizes}
          priority={priority}
          unoptimized
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center font-serif text-3xl text-ink-400 dark:text-neutral-500">
          {title?.[0] || 'N'}
        </div>
      )}
    </div>
  );
}

export default function NovelWeeklyHero({ items = [], meetItems = [], visibility = {} }) {
  const showWeekly = visibility.weekly_book !== false;
  const showMeet = visibility.meet_webnovel !== false;
  const slides = (Array.isArray(items) ? items : []).slice(0, 4);
  // Books assigned to the "Meet Novel Centre" shelf in Page Configuration,
  // topped up with promo tiles so the column always shows three rows.
  const meetBooks = (Array.isArray(meetItems) ? meetItems : []).filter((b) => b && b.slug).slice(0, MEET_SLOTS);
  const user = useAuthStore((s) => s.user);
  const creator = isCreator(user);
  const meetRows = [
    ...meetBooks.map((book) => ({ kind: 'book', book })),
    ...PROMOS.slice(0, Math.max(0, MEET_SLOTS - meetBooks.length)).map((p) => ({ kind: 'promo', promo: creator && p.creator ? p.creator : p })),
  ];
  const renderWeekly = showWeekly && slides.length > 0;
  const renderMeet = showMeet;
  const both = renderWeekly && renderMeet;
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || slides.length <= 1) return undefined;
    const t = setInterval(() => setActive((n) => (n + 1) % slides.length), 7000);
    return () => clearInterval(t);
  }, [paused, slides.length]);

  if (!renderWeekly && !renderMeet) return null;

  const go = (delta) => setActive((n) => (n + delta + slides.length) % slides.length);

  const sectionLabel = both
    ? 'Weekly featured books and Novel Centre highlights'
    : renderWeekly
      ? 'Weekly featured books'
      : 'Novel Centre highlights';

  const card =
    'relative overflow-hidden rounded-3xl border border-neutral-200/80 bg-white shadow-editorial-card dark:border-neutral-800 dark:bg-neutral-950';

  return (
    <section
      className="relative mb-16 scroll-mt-32 max-lg:scroll-mt-36 md:mb-24"
      aria-roledescription={renderWeekly ? 'carousel' : undefined}
      aria-label={sectionLabel}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="max-w-[1280px] mx-auto px-4 md:px-edge">
        <div
          className={cn(
            'grid grid-cols-1 gap-8 lg:gap-8',
            both ? 'lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-stretch' : 'lg:grid-cols-1',
          )}
        >
          {/* ── Weekly Book — slider ─────────────────────────────────────── */}
          {renderWeekly ? (
            <div className="flex min-w-0 flex-col">
              <Eyebrow>Weekly Book</Eyebrow>
              <div className={cn(card, 'flex-1 min-h-[360px] md:min-h-[400px]')}>
                {slides.map((slide, i) => {
                  const show = i === active;
                  const coverSrc = heroCoverSrc(slide?.coverUrl);
                  const slideTitle = slide?.title || 'Untitled';
                  const slideHref = slide?.slug ? `/books/${slide.slug}` : '/discover';
                  const description =
                    (slide?.synopsis && String(slide.synopsis).trim()) ||
                    'Featured this week — open the chapter list and keep reading where you left off.';
                  const chapters = Number(slide?.chapterNum) || 0;
                  return (
                    <div
                      key={(slide?.id ?? slideTitle) + String(i)}
                      className={cn(
                        'absolute inset-0 transition-opacity duration-700 ease-out',
                        show ? 'z-[1] opacity-100' : 'pointer-events-none z-0 opacity-0',
                      )}
                      aria-hidden={!show}
                    >
                      {/* Soft backdrop: the cover, blurred, fading into the card surface. */}
                      {coverSrc ? (
                        <Image
                          src={coverSrc}
                          alt=""
                          fill
                          referrerPolicy="no-referrer"
                          className="scale-125 object-cover opacity-35 blur-3xl dark:opacity-30"
                          sizes="(max-width: 1024px) 100vw, 60vw"
                          priority={i === 0}
                          unoptimized
                        />
                      ) : null}
                      <div
                        className="absolute inset-0 bg-gradient-to-r from-white via-white/85 to-white/40 dark:from-neutral-950 dark:via-neutral-950/85 dark:to-neutral-950/50"
                        aria-hidden
                      />

                      <div className="relative z-[2] flex h-full flex-col gap-6 p-6 pb-20 sm:flex-row sm:items-center sm:gap-8 sm:p-8 sm:pb-20 md:p-10 md:pb-20">
                        <Link href={slideHref} className="group mx-auto shrink-0 sm:mx-0" tabIndex={show ? 0 : -1}>
                          <CoverFrame
                            src={coverSrc}
                            title={slideTitle}
                            priority={i === 0}
                            className="h-[204px] w-[136px] shadow-[0_18px_40px_rgba(0,0,0,0.28)] transition-transform duration-500 group-hover:-translate-y-1 md:h-[240px] md:w-[160px]"
                          />
                        </Link>

                        <div className="flex min-w-0 flex-1 flex-col justify-center text-center sm:text-left">
                          <p className="font-ui-label-sm text-ui-label-sm uppercase tracking-widest text-gold-dim dark:text-gold">
                            Weekly pick{slide?.category ? ` · ${slide.category}` : ''}
                          </p>
                          <h3 className="mt-2 line-clamp-2 font-serif text-[28px] font-semibold leading-[1.15] tracking-tight text-ink-900 dark:text-neutral-50 md:text-[34px]">
                            <Link href={slideHref} tabIndex={show ? 0 : -1} className="hover:underline decoration-gold/70 underline-offset-4">
                              {slideTitle}
                            </Link>
                          </h3>
                          {slide?.authorName ? (
                            <p className="mt-2 text-[14px] text-ink-500 dark:text-neutral-400">
                              by <span className="font-medium text-ink-700 dark:text-neutral-200">{slide.authorName}</span>
                            </p>
                          ) : null}
                          <p className="mx-auto mt-4 line-clamp-3 max-w-xl font-sans text-[15px] leading-relaxed text-ink-600 dark:text-neutral-300 sm:mx-0 md:line-clamp-4">
                            {description}
                          </p>
                          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-3 sm:justify-start">
                            <Link
                              href={slideHref}
                              tabIndex={show ? 0 : -1}
                              className="inline-flex items-center gap-2 rounded-full bg-ink-900 px-5 py-2.5 text-[12px] font-semibold uppercase tracking-widest text-white transition-colors hover:bg-ink-700 dark:bg-neutral-100 dark:text-black dark:hover:bg-white"
                            >
                              Read now
                              <Icon name="arrow_forward" size={16} />
                            </Link>
                            {chapters > 0 ? (
                              <span className="inline-flex items-center gap-1.5 text-[13px] text-ink-500 dark:text-neutral-400">
                                <Icon name="menu_book" size={16} className="opacity-80" />
                                {chapters} {chapters === 1 ? 'chapter' : 'chapters'}
                              </span>
                            ) : null}
                            {slide?.score != null ? (
                              <span className="inline-flex items-center gap-1 text-[13px] text-ink-500 dark:text-neutral-400">
                                <Icon name="star" filled size={16} className="text-gold" />
                                {Number(slide.score).toFixed(1)}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Slider controls */}
                {slides.length > 1 ? (
                  <div className="absolute inset-x-0 bottom-0 z-[3] flex items-center justify-between px-6 pb-5 sm:px-8 md:px-10">
                    <div className="flex items-center gap-2">
                      {slides.map((_, i) => (
                        <button
                          key={String(i)}
                          type="button"
                          onClick={() => setActive(i)}
                          className={cn(
                            'h-1.5 rounded-full transition-all duration-300',
                            i === active
                              ? 'w-8 bg-ink-900 dark:bg-neutral-100'
                              : 'w-2 bg-ink-900/25 hover:bg-ink-900/50 dark:bg-white/30 dark:hover:bg-white/60',
                          )}
                          aria-label={`Go to slide ${i + 1}`}
                          aria-current={i === active ? 'true' : undefined}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => go(-1)}
                        aria-label="Previous book"
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-300/80 bg-white/70 text-ink-700 backdrop-blur transition-colors hover:bg-white dark:border-neutral-700 dark:bg-neutral-900/70 dark:text-neutral-200 dark:hover:bg-neutral-800"
                      >
                        <Icon name="chevron_left" size={20} />
                      </button>
                      <button
                        type="button"
                        onClick={() => go(1)}
                        aria-label="Next book"
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-300/80 bg-white/70 text-ink-700 backdrop-blur transition-colors hover:bg-white dark:border-neutral-700 dark:bg-neutral-900/70 dark:text-neutral-200 dark:hover:bg-neutral-800"
                      >
                        <Icon name="chevron_right" size={20} />
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* ── Meet Novel Centre ────────────────────────────────────────── */}
          {renderMeet ? (
            <div className="flex min-w-0 flex-col">
              <Eyebrow>Meet Novel Centre</Eyebrow>
              <div className={cn(card, 'flex flex-1 flex-col divide-y divide-neutral-200/80 dark:divide-neutral-800')}>
                {meetRows.map((row) =>
                  row.kind === 'book' ? (
                    <Link
                      key={`book-${row.book.id}`}
                      href={`/books/${row.book.slug}`}
                      className="group flex flex-1 items-center gap-5 p-5 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900/70 md:px-6"
                    >
                      <CoverFrame
                        src={heroCoverSrc(row.book.coverUrl)}
                        title={row.book.title}
                        sizes="72px"
                        className="h-[100px] w-[68px] shadow-md transition-transform duration-300 group-hover:-translate-y-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-ui-label-sm text-[10px] uppercase tracking-widest text-gold-dim dark:text-gold">
                          {row.book.category || 'Novel'}
                        </p>
                        <p className="mt-1 line-clamp-1 font-serif text-[19px] font-semibold leading-snug text-ink-900 transition-colors group-hover:text-ink-700 dark:text-neutral-100 dark:group-hover:text-white">
                          {row.book.title}
                        </p>
                        {row.book.authorName ? (
                          <p className="mt-0.5 text-[12px] text-ink-500 dark:text-neutral-400">by {row.book.authorName}</p>
                        ) : null}
                        {row.book.synopsis ? (
                          <p className="mt-1.5 line-clamp-2 text-[13px] leading-snug text-ink-600 dark:text-neutral-400">
                            {String(row.book.synopsis).trim()}
                          </p>
                        ) : null}
                      </div>
                      <Icon
                        name="arrow_forward"
                        size={20}
                        className="shrink-0 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-ink-900 dark:text-neutral-600 dark:group-hover:text-neutral-100"
                      />
                    </Link>
                  ) : (
                    <Link
                      key={`promo-${row.promo.href}`}
                      href={row.promo.href}
                      className="group flex flex-1 items-center gap-5 p-5 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900/70 md:px-6"
                    >
                      <div className="flex h-[100px] w-[68px] shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cream-200 to-cream-500 text-ink-700 ring-1 ring-black/5 dark:from-neutral-900 dark:to-neutral-800 dark:text-neutral-200 dark:ring-white/10">
                        <Icon name={row.promo.icon} size={28} weight={300} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-ui-label-sm text-[10px] uppercase tracking-widest text-ink-400 dark:text-neutral-500">
                          Novel Centre
                        </p>
                        <p className="mt-1 font-serif text-[19px] font-semibold leading-snug text-ink-900 transition-colors group-hover:text-ink-700 dark:text-neutral-100 dark:group-hover:text-white">
                          {row.promo.title}
                        </p>
                        <p className="mt-1.5 line-clamp-2 text-[13px] leading-snug text-ink-600 dark:text-neutral-400">
                          {row.promo.hint}
                        </p>
                      </div>
                      <Icon
                        name="arrow_forward"
                        size={20}
                        className="shrink-0 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-ink-900 dark:text-neutral-600 dark:group-hover:text-neutral-100"
                      />
                    </Link>
                  ),
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
