'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import SectionViewAllLink from '@/components/home/SectionViewAllLink';

function normalizeCover(url) {
  if (!url) return url;
  return url
    .replace('thumbnail/150x', 'thumbnail/240x')
    .replace('thumbnail/150&', 'thumbnail/240&');
}

function Cover({ src, alt, sizes }) {
  if (!src) return null;
  return (
    <div className="relative h-full w-full">
      <Image
        src={src}
        alt=""
        fill
        referrerPolicy="no-referrer"
        className="object-cover scale-110 blur-2xl opacity-40 transition-transform duration-300 ease-out group-hover:scale-[1.18]"
        sizes={sizes}
        unoptimized
      />
      <Image
        src={src}
        alt={alt}
        fill
        referrerPolicy="no-referrer"
        className="object-contain transition-transform duration-300 ease-out group-hover:scale-[1.06]"
        sizes={sizes}
        unoptimized
      />
    </div>
  );
}

export default function EditorsChoiceSection({ items = [] }) {
  const list = (Array.isArray(items) ? items : []).slice(0, 6);
  const [active, setActive] = useState(0);

  if (list.length === 0) return null;

  return (
    <div className="min-w-0">
      <div className="flex items-end justify-between gap-4 mb-6">
        <h2 className="font-headline-md text-headline-md text-ink-900 dark:text-neutral-100 min-w-0">
          Editors&apos; Choice
        </h2>
        <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 shrink-0">
          <button
            type="button"
            onClick={() => setActive((n) => (n + 1) % Math.max(1, list.length))}
            className="font-ui-label-sm text-ui-label-sm uppercase tracking-widest text-[#2f6bff] hover:opacity-80 transition-opacity"
          >
            Switch
          </button>
          <SectionViewAllLink href="/sections/editors-choice" />
        </div>
      </div>

      <div className="border-t border-neutral-200 dark:border-neutral-800 pt-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
          {list.map((b, idx) => {
            const t = b?.title || 'Untitled';
            const c = b?.category || 'Novel';
            const s = normalizeCover(b?.coverUrl);
            const key = b?.id ?? b?.slug ?? t;
            const href = b?.slug ? `/books/${b.slug}` : '/discover';
            const isActive = idx === active;
            return (
              <Link
                key={String(key) + String(idx)}
                href={href}
                onMouseEnter={() => setActive(idx)}
                className="group flex items-start gap-3 sm:gap-4 text-left rounded-xl p-2 -m-2 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900/60"
              >
                <div
                  className={[
                    'relative h-[72px] w-[54px] sm:h-[84px] sm:w-[64px] shrink-0 rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-900 ring-2 transition-all',
                    isActive
                      ? 'ring-gold shadow-gold-glow'
                      : 'ring-transparent group-hover:ring-ink-200 dark:group-hover:ring-neutral-700',
                  ].join(' ')}
                >
                  <Cover src={s} alt={t} sizes="64px" />
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="font-sans text-[15px] sm:text-base leading-snug font-semibold text-ink-900 dark:text-neutral-100 line-clamp-2">
                    {t}
                  </p>
                  <p className="mt-1 text-sm text-ink-500 dark:text-neutral-400">{c}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
