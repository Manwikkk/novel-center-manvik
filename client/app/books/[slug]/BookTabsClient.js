'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

/*
const DUMMY_FANS = [
  { name: 'James_Quinton', contributed: 23 },
  { name: 'LumenAura', contributed: 22 },
  { name: 'dynisor', contributed: 148 },
];
*/

export default function BookTabsClient({ book, toc }) {
  const [tab, setTab] = useState('about'); // 'about' | 'toc'

  const synopsis = useMemo(() => {
    const s = (book?.synopsis || '').trim();
    return s || 'No synopsis provided yet.';
  }, [book?.synopsis]);

  return (
    <section className="max-w-[900px]">
      <div className="flex items-end gap-10 border-b border-neutral-200 dark:border-neutral-800">
        <TabButton active={tab === 'about'} onClick={() => setTab('about')}>
          About
        </TabButton>
        <TabButton active={tab === 'toc'} onClick={() => setTab('toc')}>
          Table of Contents
        </TabButton>
      </div>

      {tab === 'toc' ? (
        <div className="pt-8">
          {toc}
        </div>
      ) : (
        <div className="pt-8 space-y-10">
          {/* Synopsis */}
          <div>
            <h3 className="font-ui-label-lg text-ui-label-lg font-semibold text-ink-900 dark:text-neutral-100">
              Synopsis
            </h3>
            <p className="mt-3 text-[13px] leading-relaxed text-ink-600 dark:text-neutral-400 max-w-[760px]">
              {synopsis}
            </p>
          </div>

          {/* Tags — the content tags chosen for this book in Author Studio */}
          {(book?.contentTags || []).length > 0 ? (
            <div>
              <h3 className="font-ui-label-lg text-ui-label-lg font-semibold text-ink-900 dark:text-neutral-100">
                Tags
              </h3>
              <div className="mt-4 flex flex-wrap gap-3">
                {book.contentTags.map((t) => (
                  <Link
                    key={t.id}
                    href={`/discover?tag=${encodeURIComponent(t.slug)}`}
                    title={`Browse books tagged ${t.label}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-300 px-3 py-1 text-[11px] uppercase tracking-widest transition-colors hover:bg-rose-100 dark:hover:bg-rose-900/40"
                  >
                    <span className="opacity-80">#</span>
                    {t.label}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {/*
          Fans section (placeholder) — disabled per product request.
          <div>
            <div className="flex items-end justify-between">
              <h3 className="font-ui-label-lg text-ui-label-lg font-semibold text-ink-900 dark:text-neutral-100">
                Fans
              </h3>
              <Link
                href="/authors"
                className="text-[12px] text-[#2f6bff] hover:opacity-80 transition-opacity"
              >
                See all
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden bg-white dark:bg-neutral-950">
              {DUMMY_FANS.map((f, idx) => (
                <div
                  key={f.name}
                  className={[
                    'flex items-center gap-3 px-5 py-4',
                    idx === 0 ? '' : 'border-t sm:border-t-0 sm:border-l border-neutral-200 dark:border-neutral-800',
                  ].join(' ')}
                >
                  <div className="h-10 w-10 rounded-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 grid place-items-center text-sm font-semibold text-ink-700 dark:text-neutral-200">
                    {f.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink-900 dark:text-neutral-100 truncate">
                      {f.name}
                    </p>
                    <p className="mt-0.5 text-[12px] text-ink-500 dark:text-neutral-500 truncate">
                      Contributed {f.contributed}…
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          */}
        </div>
      )}
    </section>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'relative pb-3 font-ui-label-lg text-ui-label-lg font-semibold',
        active ? 'text-ink-900 dark:text-white' : 'text-ink-400 dark:text-neutral-600',
      ].join(' ')}
    >
      {children}
      <span
        aria-hidden
        className={[
          'absolute left-0 right-0 -bottom-[1px] h-[2px] rounded-full transition-opacity',
          active ? 'bg-ink-900 dark:bg-white opacity-100' : 'opacity-0',
        ].join(' ')}
      />
    </button>
  );
}

