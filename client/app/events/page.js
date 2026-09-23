'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import AuthGuard from '@/components/layout/AuthGuard';
import Icon from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { eventsApi } from '@/lib/eventsApi';
import { formatDateTime } from '@/lib/format';

function EventsInner() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await eventsApi.list();
      setItems(data.items || []);
    } catch (err) {
      setItems(null);
      setError(err.message || 'Could not load events');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-screen flex flex-col bg-[#f6f5f2] dark:bg-black">
      <SiteHeader variant="solid" />
      <main className="mx-auto w-full max-w-shell flex-1 px-4 pb-20 pt-28 md:px-edge md:pt-32">
        <p className="label-sm uppercase text-ink-500 dark:text-neutral-500">Events</p>
        <h1 className="mt-2 font-serif text-[34px] leading-[1.1] text-ink-900 dark:text-neutral-50 md:text-[44px]">
          Limited campaigns
        </h1>
        <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-ink-600 dark:text-neutral-400">
          Events have their own registration, progress, and rewards. They are not Daily, Weekly, or Monthly tasks, and they are not achievements.
        </p>

        {loading ? (
          <div className="mt-8 space-y-3" aria-busy="true">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </div>
        ) : null}

        {!loading && error ? (
          <div className="mt-8 rounded-2xl border border-red-200 bg-white p-6 dark:border-red-900/50 dark:bg-neutral-950" role="alert">
            <p className="font-serif text-[22px] text-ink-900 dark:text-neutral-50">Events could not be loaded</p>
            <p className="mt-2 text-[14px] text-ink-600 dark:text-neutral-400">{error}</p>
            <button type="button" onClick={load} className="mt-4 rounded-full bg-ink-900 px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-white dark:bg-white dark:text-black">
              Try again
            </button>
          </div>
        ) : null}

        {!loading && !error && items?.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-dashed border-neutral-300 px-5 py-10 text-[14px] text-ink-500 dark:border-neutral-700 dark:text-neutral-400">
            No events are running right now.
          </p>
        ) : null}

        {!loading && !error && items?.length ? (
          <div className="mt-8 grid gap-4">
            {items.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-editorial-card transition hover:-translate-y-0.5 dark:border-neutral-800 dark:bg-neutral-950"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-500 dark:text-neutral-500">
                      {formatDateTime(event.startsAt)} – {formatDateTime(event.endsAt)}
                    </p>
                    <h2 className="mt-1 font-serif text-[26px] leading-tight text-ink-900 dark:text-neutral-50">{event.name}</h2>
                    <p className="mt-2 max-w-2xl text-[14px] text-ink-600 dark:text-neutral-400">{event.summary}</p>
                  </div>
                  <Icon name="arrow_forward" size={20} className="mt-1 text-ink-400" />
                </div>
                <p className="mt-4 text-[12px] uppercase tracking-widest text-ink-500 dark:text-neutral-500">
                  {event.registered
                    ? `${event.completedActivities || 0}/${event.activityCount || 0} activities`
                    : 'Registration open'}
                </p>
              </Link>
            ))}
          </div>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}

export default function EventsPage() {
  return (
    <AuthGuard>
      <EventsInner />
    </AuthGuard>
  );
}
