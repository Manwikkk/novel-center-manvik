'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const SIDEBAR = [
  {
    title: 'WebNovel Spirity Awards 2026',
    img: 'https://webbanner.webnovel.com/utils/1768212212_346290.jpg?imageMogr2/quality/80',
    href: '/discover',
  },
  {
    title: 'WebNovel Author Benefits',
    img: 'https://webbanner.webnovel.com/utils/1736997772_791074.png?imageMogr2/quality/80',
    href: '/discover',
  },
  {
    title: 'More Novels and Bonus!',
    img: 'https://webbanner.webnovel.com/utils/1697615553_297844.jpg?imageMogr2/quality/80',
    href: '/discover',
  },
];

function heroCoverSrc(url) {
  if (!url) return url;
  return url
    .replace('thumbnail/150x', 'thumbnail/520x')
    .replace('thumbnail/150&', 'thumbnail/520&')
    .replace('thumbnail/150', 'thumbnail/520');
}

export default function NovelWeeklyHero({ items = [] }) {
  const slides = (Array.isArray(items) ? items : []).slice(0, 4);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || slides.length <= 1) return undefined;
    const t = setInterval(() => setActive((n) => (n + 1) % slides.length), 6000);
    return () => clearInterval(t);
  }, [paused, slides.length]);

  if (slides.length === 0) return null;

  return (
    <section
      className="relative mb-16 scroll-mt-32 max-lg:scroll-mt-36 md:mb-24"
      aria-roledescription="carousel"
      aria-label="Weekly featured books"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="max-w-[1280px] mx-auto px-4 md:px-edge">
        <div className="flex flex-col lg:flex-row lg:items-stretch gap-8 lg:gap-10">
          {/* Weekly Book — slider */}
          <div className="flex min-h-0 w-full flex-col lg:w-[46%] lg:max-w-[46%] lg:shrink-0">
            <h2 className="mb-4 font-ui-label-sm text-ui-label-sm font-bold uppercase tracking-widest text-ink-900 dark:text-neutral-100">
              Weekly Book
            </h2>
            <div className="relative flex min-h-[300px] flex-1 overflow-hidden rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.45)] sm:min-h-[308px] md:min-h-[316px] lg:min-h-0">
              {slides.map((slide, i) => {
                const show = i === active;
                const coverSrc = heroCoverSrc(slide?.coverUrl);
                const slideTitle = slide?.title || 'Untitled';
                const slideHref = slide?.slug ? `/books/${slide.slug}` : '/discover';
                const description =
                  (slide?.synopsis && String(slide.synopsis).trim()) ||
                  'Featured this week — dive into the chapter list and keep reading where you left off in Novel Centre.';
                return (
                  <div
                    key={(slide?.id ?? slideTitle) + String(i)}
                    className={`absolute inset-0 transition-opacity duration-700 ease-out ${
                      show ? 'opacity-100 z-[1]' : 'opacity-0 z-0 pointer-events-none'
                    }`}
                    aria-hidden={!show}
                  >
                    <div className="absolute inset-0">
                      <div className="relative h-full w-full">
                        {coverSrc ? (
                          <Image
                            src={coverSrc}
                            alt=""
                            fill
                            referrerPolicy="no-referrer"
                            className="object-cover scale-110 blur-2xl opacity-70 dark:opacity-50"
                            sizes="(max-width: 1024px) 100vw, 46vw"
                            priority={i === 0}
                            unoptimized
                          />
                        ) : null}
                      </div>
                    </div>
                    <div
                      className="absolute inset-0 bg-gradient-to-r from-black/88 via-black/72 to-black/35 dark:from-black/92 dark:via-black/78 dark:to-black/45"
                      aria-hidden
                    />
                    <Link
                      href={slideHref}
                      className="relative z-[2] flex h-full min-h-[300px] flex-col items-center justify-center gap-4 p-5 pb-[5.25rem] max-sm:pb-[5.75rem] sm:min-h-[308px] sm:gap-6 sm:p-6 sm:pb-14 md:min-h-[316px] md:p-7 md:pb-14 lg:min-h-0 lg:pb-12 sm:flex-row sm:items-center sm:justify-start"
                    >
                      <div className="relative h-[180px] w-[120px] shrink-0 overflow-hidden rounded-lg bg-black/25 shadow-[0_12px_40px_rgba(0,0,0,0.45)] ring-1 ring-white/10 sm:h-[196px] sm:w-[131px] md:h-[210px] md:w-[140px] lg:h-[218px] lg:w-[146px]">
                        {coverSrc ? (
                          <Image
                            src={coverSrc}
                            alt=""
                            fill
                            referrerPolicy="no-referrer"
                            className="object-contain"
                            sizes="128px"
                            priority={i === 0}
                            unoptimized
                          />
                        ) : null}
                      </div>
                      <div className="flex-1 flex flex-col justify-center text-center sm:text-left min-w-0">
                        <h3
                          className="line-clamp-4 max-sm:line-clamp-3 font-serif text-lg font-semibold leading-snug tracking-tight text-white sm:text-xl md:text-2xl md:line-clamp-4 lg:line-clamp-none"
                          style={{
                            textShadow:
                              '0 2px 12px rgba(0,0,0,0.85), 0 1px 3px rgba(0,0,0,0.9)',
                          }}
                        >
                          {slideTitle}
                        </h3>
                        <p
                          className="mt-4 font-sans text-sm md:text-base text-white/85 max-w-xl mx-auto sm:mx-0 leading-relaxed line-clamp-4 md:line-clamp-5"
                          style={{ textShadow: '0 1px 8px rgba(0,0,0,0.75)' }}
                        >
                          {description}
                        </p>
                      </div>
                    </Link>
                  </div>
                );
              })}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] flex justify-center bg-gradient-to-t from-black/55 via-black/25 to-transparent pb-3 pt-10 max-sm:pb-4 max-sm:pt-12 sm:pb-3.5 sm:pt-8 lg:bottom-2 lg:bg-none lg:pb-2 lg:pt-0">
                <div className="pointer-events-auto flex justify-center gap-2">
                {slides.map((_, i) => (
                  <button
                    key={String(i)}
                    type="button"
                    onClick={() => setActive(i)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      i === active ? 'w-8 bg-white' : 'w-2 bg-white/35 hover:bg-white/55'
                    }`}
                    aria-label={`Go to slide ${i + 1}`}
                    aria-current={i === active}
                  />
                ))}
                </div>
              </div>
            </div>
          </div>

          {/* Meet Webnovel — sidebar */}
          <div className="flex min-h-0 w-full flex-col gap-4 lg:w-[54%] lg:shrink-0">
            <h2 className="font-ui-label-sm text-ui-label-sm font-bold uppercase tracking-widest text-ink-900 dark:text-neutral-100">
              Meet Webnovel
            </h2>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-editorial-card divide-y divide-neutral-200 dark:divide-neutral-800">
              {SIDEBAR.map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className="group flex min-h-0 flex-1 items-center gap-4 p-4 transition-colors hover:bg-neutral-50 md:p-5 dark:hover:bg-neutral-900/80"
                >
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-sans text-[15px] md:text-base font-semibold text-ink-900 dark:text-neutral-100 leading-snug group-hover:text-ink-700 dark:group-hover:text-white transition-colors">
                      {item.title}
                    </p>
                    <p className="mt-1 font-ui-label-sm text-ui-label-sm text-ink-500 dark:text-neutral-500 normal-case tracking-normal">
                      Explore promotions and reading perks.
                    </p>
                  </div>
                  <div className="relative w-20 h-14 md:w-24 md:h-16 shrink-0 rounded-lg overflow-hidden ring-1 ring-black/5 dark:ring-white/10 shadow-sm transition-transform duration-300 group-hover:scale-[1.04] group-hover:brightness-105">
                    <Image
                      src={item.img}
                      alt=""
                      fill
                      referrerPolicy="no-referrer"
                      className="object-cover"
                      sizes="96px"
                      unoptimized
                    />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
