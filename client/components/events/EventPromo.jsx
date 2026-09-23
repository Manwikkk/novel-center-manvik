'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { eventsApi, EVENT_REWARD_LABELS } from '@/lib/eventsApi';
import { formatDateTime } from '@/lib/format';
import Icon from '@/components/ui/Icon';

/**
 * Promoted events ask the reader to register. Dismissal is remembered on the
 * server so the same campaign does not cover the page on every visit.
 */
export default function EventPromo() {
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const pathname = usePathname();
  const router = useRouter();
  const [event, setEvent] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!hydrated || !user?.id) {
      setEvent(null);
      return undefined;
    }
    if (pathname?.startsWith('/admin') || pathname?.startsWith('/events')) return undefined;
    let cancelled = false;
    eventsApi.promoted()
      .then((data) => {
        if (!cancelled) setEvent(data.items?.[0] || null);
      })
      .catch(() => {
        if (!cancelled) setEvent(null);
      });
    return () => { cancelled = true; };
  }, [hydrated, user?.id, pathname]);

  if (!event) return null;

  async function dismiss() {
    setBusy(true);
    try {
      await eventsApi.dismiss(event.id);
    } catch (_e) { /* closing the popup still hides it for this view */ }
    setEvent(null);
    setBusy(false);
  }

  async function register() {
    setBusy(true);
    try {
      await eventsApi.register(event.id);
      const id = event.id;
      setEvent(null);
      router.push(`/events/${id}`);
    } catch (_e) {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="event-promo-title">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-editorial-modal dark:bg-neutral-950 sm:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-dim dark:text-gold">Limited event</p>
        <h2 id="event-promo-title" className="mt-2 font-serif text-[30px] leading-tight text-ink-900 dark:text-neutral-50">{event.name}</h2>
        <p className="mt-2 text-[13px] text-ink-500 dark:text-neutral-500">
          {formatDateTime(event.startsAt)} – {formatDateTime(event.endsAt)}
        </p>
        {event.summary ? <p className="mt-3 text-[14px] leading-relaxed text-ink-700 dark:text-neutral-300">{event.summary}</p> : null}
        <ul className="mt-4 space-y-1 text-[13px] text-ink-600 dark:text-neutral-400">
          {(event.activities || []).slice(0, 4).map((activity) => (
            <li key={activity.id || activity.code}>· {activity.title}</li>
          ))}
        </ul>
        <p className="mt-3 text-[12px] uppercase tracking-widest text-ink-400">
          {(event.rewards || []).map((reward) => EVENT_REWARD_LABELS[reward.rewardType] || reward.rewardType).join(' · ')}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={register} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-ink-900 px-5 py-3 text-[12px] font-semibold uppercase tracking-widest text-white disabled:opacity-50 dark:bg-white dark:text-black">
            <Icon name="how_to_reg" size={18} />
            Register
          </button>
          <button type="button" onClick={() => router.push(`/events/${event.id}`)} className="rounded-full border border-neutral-300 px-5 py-3 text-[12px] font-semibold uppercase tracking-widest text-ink-800 dark:border-neutral-700 dark:text-neutral-200">
            View details
          </button>
          <button type="button" onClick={dismiss} disabled={busy} className="rounded-full px-3 py-3 text-[12px] font-semibold uppercase tracking-widest text-ink-500">
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
