'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import AuthGuard from '@/components/layout/AuthGuard';
import Icon from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { eventsApi, EVENT_REWARD_LABELS } from '@/lib/eventsApi';
import { formatDateTime } from '@/lib/format';
import { useUiStore } from '@/stores/uiStore';
import { cn } from '@/lib/cn';

function DetailInner() {
  const { id } = useParams();
  const pushToast = useUiStore((s) => s.pushToast);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await eventsApi.detail(id));
    } catch (err) {
      setData(null);
      setError(err.message || 'Could not load this event');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function register() {
    setBusy(true);
    try {
      setData(await eventsApi.register(id));
      pushToast({ type: 'success', title: 'You are registered', message: 'Progress starts from now.' });
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not register', message: err.message });
    } finally {
      setBusy(false);
    }
  }

  async function claim(rewardId) {
    setBusy(true);
    try {
      const next = await eventsApi.claim(id, rewardId);
      setData(next);
      pushToast({ type: 'success', title: 'Reward claimed' });
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not claim', message: err.message });
    } finally {
      setBusy(false);
    }
  }

  const event = data?.event;

  return (
    <div className="min-h-screen flex flex-col bg-[#f6f5f2] dark:bg-black">
      <SiteHeader variant="solid" />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-20 pt-28 md:px-edge md:pt-32">
        <Link href="/events" className="text-[12px] font-semibold uppercase tracking-widest text-ink-500 hover:text-ink-900 dark:text-neutral-500">
          All events
        </Link>

        {loading ? (
          <div className="mt-6 space-y-3" aria-busy="true">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </div>
        ) : null}

        {!loading && error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-white p-6 dark:border-red-900/50 dark:bg-neutral-950" role="alert">
            <p className="font-serif text-[22px] text-ink-900 dark:text-neutral-50">This event could not be loaded</p>
            <p className="mt-2 text-[14px] text-ink-600 dark:text-neutral-400">{error}</p>
            <button type="button" onClick={load} className="mt-4 rounded-full bg-ink-900 px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-white dark:bg-white dark:text-black">
              Try again
            </button>
          </div>
        ) : null}

        {!loading && !error && event ? (
          <div className="mt-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-500 dark:text-neutral-500">
              {formatDateTime(event.startsAt)} – {formatDateTime(event.endsAt)}
            </p>
            <h1 className="mt-2 font-serif text-[36px] leading-[1.1] text-ink-900 dark:text-neutral-50 md:text-[46px]">{event.name}</h1>
            {event.summary ? <p className="mt-3 text-[16px] text-ink-700 dark:text-neutral-300">{event.summary}</p> : null}
            {event.description ? <p className="mt-3 whitespace-pre-wrap text-[14px] leading-relaxed text-ink-600 dark:text-neutral-400">{event.description}</p> : null}
            <p className="mt-4 text-[13px] text-ink-500 dark:text-neutral-500">{data.tracking}</p>

            {!event.registered ? (
              <button
                type="button"
                onClick={register}
                disabled={busy}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink-900 px-5 py-3 text-[12px] font-semibold uppercase tracking-widest text-white disabled:opacity-50 dark:bg-white dark:text-black"
              >
                <Icon name="how_to_reg" size={18} />
                Register
              </button>
            ) : (
              <p className="mt-6 text-[13px] font-semibold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                Registered {event.registeredAt ? formatDateTime(event.registeredAt) : ''}
              </p>
            )}

            <section className="mt-10" aria-labelledby="event-activities">
              <h2 id="event-activities" className="font-serif text-[26px] text-ink-900 dark:text-neutral-50">Activities</h2>
              <div className="mt-4 grid gap-3">
                {(data.activities || []).map((activity) => (
                  <article key={activity.id} className="rounded-2xl border border-neutral-200/80 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-serif text-[20px] text-ink-900 dark:text-neutral-50">{activity.title}</h3>
                        {activity.description ? <p className="mt-1 text-[13px] text-ink-600 dark:text-neutral-400">{activity.description}</p> : null}
                      </div>
                      {activity.completed ? <Icon name="check_circle" filled className="text-emerald-600" /> : null}
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                        <div
                          className="h-full rounded-full bg-ink-900 dark:bg-neutral-100"
                          style={{ width: `${activity.target ? Math.min(100, Math.round((activity.progress / activity.target) * 100)) : 0}%` }}
                        />
                      </div>
                      <span className="text-[13px] font-semibold tabular-nums">{activity.progressLabel}</span>
                    </div>
                    {!event.registered ? (
                      <p className="mt-2 text-[12px] text-ink-500">Progress starts after you register.</p>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>

            <section className="mt-10" aria-labelledby="event-rewards">
              <h2 id="event-rewards" className="font-serif text-[26px] text-ink-900 dark:text-neutral-50">Rewards</h2>
              <div className="mt-4 grid gap-3">
                {(data.rewards || []).map((reward) => (
                  <article key={reward.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-200/80 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-500">{EVENT_REWARD_LABELS[reward.rewardType] || reward.rewardType}</p>
                      <h3 className="font-serif text-[20px] text-ink-900 dark:text-neutral-50">{reward.title}</h3>
                      {reward.description ? <p className="mt-1 text-[13px] text-ink-600 dark:text-neutral-400">{reward.description}</p> : null}
                    </div>
                    <button
                      type="button"
                      disabled={busy || reward.claimed || !reward.claimable}
                      onClick={() => claim(reward.id)}
                      className={cn(
                        'rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-widest',
                        reward.claimed
                          ? 'bg-emerald-600/10 text-emerald-700 dark:text-emerald-300'
                          : 'bg-ink-900 text-white disabled:opacity-40 dark:bg-white dark:text-black',
                      )}
                    >
                      {reward.claimed ? 'Claimed' : reward.claimable ? 'Claim' : 'Locked'}
                    </button>
                  </article>
                ))}
              </div>
            </section>
          </div>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}

export default function EventDetailPage() {
  return (
    <AuthGuard>
      <DetailInner />
    </AuthGuard>
  );
}
