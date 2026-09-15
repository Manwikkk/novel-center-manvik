'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Icon from '@/components/ui/Icon';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { isCreator, STUDIO_LINKS } from '@/lib/experience';
import { formatTokens } from '@/lib/format';

/**
 * Home-page strip for members who write: a welcome line, the studio shortcuts
 * and a couple of live numbers, so the author tools are one click from home.
 */
export default function CreatorQuickBar() {
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const [stats, setStats] = useState(null);
  const show = hydrated && isCreator(user);

  useEffect(() => {
    if (!show) return undefined;
    let cancelled = false;
    api.get('/author/earnings')
      .then((d) => { if (!cancelled) setStats(d?.totals || null); })
      .catch(() => { if (!cancelled) setStats(null); });
    return () => { cancelled = true; };
  }, [show, user?.id]);

  if (!show) return null;

  const firstName = (user.displayName || '').split(/\s+/)[0] || 'there';
  const facts = stats
    ? [
        { label: 'Novels', value: formatTokens(stats.books) },
        { label: 'Chapters', value: formatTokens(stats.chapters) },
        { label: 'Readers', value: formatTokens(stats.uniqueReaders) },
        { label: 'Tokens · 30d', value: formatTokens(stats.monthTokens) },
      ]
    : [];

  return (
    <section className="max-w-[1280px] mx-auto px-4 md:px-edge mb-10 md:mb-14" aria-label="Author studio shortcuts">
      <div className="flex flex-col gap-5 rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-editorial-card dark:border-neutral-800 dark:bg-neutral-950 md:flex-row md:items-center md:justify-between md:px-7">
        <div className="min-w-0">
          <p className="font-ui-label-sm text-ui-label-sm uppercase tracking-widest text-gold-dim dark:text-gold">Author studio</p>
          <p className="mt-1 font-serif text-[22px] font-semibold leading-tight text-ink-900 dark:text-neutral-50">
            Welcome back, {firstName}.
          </p>
          {facts.length ? (
            <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1">
              {facts.map((f) => (
                <div key={f.label} className="flex items-baseline gap-1.5">
                  <dt className="text-[11px] uppercase tracking-widest text-ink-400 dark:text-neutral-500">{f.label}</dt>
                  <dd className="text-[14px] font-semibold tabular-nums text-ink-800 dark:text-neutral-200">{f.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {STUDIO_LINKS.map((link, i) => (
            <Link
              key={link.href}
              href={link.href}
              className={
                i === 0
                  ? 'inline-flex items-center gap-2 rounded-full bg-ink-900 px-4 py-2.5 text-[12px] font-semibold uppercase tracking-widest text-white transition-colors hover:bg-ink-700 dark:bg-neutral-100 dark:text-black dark:hover:bg-white'
                  : 'inline-flex items-center gap-2 rounded-full border border-neutral-300 px-4 py-2.5 text-[12px] font-semibold uppercase tracking-widest text-ink-800 transition-colors hover:border-ink-900 hover:text-ink-900 dark:border-neutral-700 dark:text-neutral-200 dark:hover:border-neutral-300 dark:hover:text-white'
              }
            >
              <Icon name={link.icon} size={18} />
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
