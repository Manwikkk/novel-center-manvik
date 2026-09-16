'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/Icon';
import { checkinApi, formatDuration, secondsUntil } from '@/lib/checkinApi';
import { useUiStore } from '@/stores/uiStore';
import { cn } from '@/lib/cn';

/**
 * Compact Daily Check-In widget for the profile dashboard: streak, today's
 * claim and a link to the full streak page. The profile never computes
 * streaks or rewards itself — everything shown comes from the API.
 */
export default function CheckInCard({ onClaimed, className }) {
  const router = useRouter();
  const pushToast = useUiStore((s) => s.pushToast);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [, setTick] = useState(0);

  const load = useCallback(() => {
    checkinApi.status().then(setStatus).catch(() => setStatus(null));
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!status?.claimedToday) return undefined;
    const t = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, [status?.claimedToday]);

  async function claim() {
    if (busy || !status || status.claimedToday) return;
    setBusy(true);
    try {
      const res = await checkinApi.claim();
      setStatus(res.status);
      pushToast({ type: 'success', title: `Day ${res.claim.displayDay} claimed`, message: `+${res.claim.exp} EXP · ${res.claim.streak}-day streak` });
      onClaimed?.(res);
      if (res.claim.milestone) router.push('/check-in');
    } catch (err) {
      if (err.status === 409) load();
      else pushToast({ type: 'error', title: 'Check-in failed', message: err.message });
    } finally {
      setBusy(false);
    }
  }

  if (!status) return null;
  const pending = status.pendingMilestones?.length || 0;
  const activePass = status.inventory?.activePasses?.[0] || null;
  const days = status.track || [];

  return (
    <section className={cn('overflow-hidden rounded-lg bg-white shadow-sm dark:bg-neutral-900', className)} aria-label="Daily check-in">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-center gap-4">
          <span className={cn(
            'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl',
            status.streak.current > 0 ? 'bg-gold/15 text-gold-dim dark:text-gold' : 'bg-neutral-100 text-ink-400 dark:bg-neutral-800',
          )}>
            <Icon name="local_fire_department" filled size={30} />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-500 dark:text-neutral-500">Daily check-in</p>
            <p className="font-serif text-[24px] leading-tight text-ink-900 dark:text-neutral-50">
              {status.streak.current}-day streak
              <span className="ml-2 font-sans text-[12px] font-medium text-ink-500 dark:text-neutral-500">Day {status.cycle.day} of {status.cycle.length}</span>
            </p>
            <p className="text-[12px] text-ink-500 dark:text-neutral-500">
              Longest {status.streak.longest} · {status.streak.total} total
              {activePass ? ` · ${activePass.title} active` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:justify-end">
          {pending ? (
            <Link href="/check-in" className="inline-flex items-center gap-1.5 rounded-full border border-gold bg-gold/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-widest text-gold-dim dark:text-gold">
              <Icon name="redeem" filled size={16} /> Choose reward
            </Link>
          ) : null}
          {status.claimedToday ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
              <Icon name="task_alt" size={16} /> Claimed · {formatDuration(secondsUntil(status.nextResetAt))}
            </span>
          ) : (
            <button
              type="button"
              onClick={claim}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-full bg-[#1e80ff] px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-white transition-colors hover:bg-[#1a6fe0] disabled:opacity-60"
            >
              <Icon name="bolt" filled size={16} />
              {busy ? 'Claiming…' : `Claim +${status.todayReward.exp} EXP`}
            </button>
          )}
          <Link href="/check-in" className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 text-ink-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800" aria-label="Open check-in page">
            <Icon name="arrow_forward" size={18} />
          </Link>
        </div>
      </div>

      <div className="flex gap-1 border-t border-neutral-100 px-4 py-3 dark:border-neutral-800 sm:px-5">
        {days.map((d) => (
          <span
            key={d.day}
            title={`Day ${d.day} · +${d.exp} EXP`}
            className={cn(
              'h-1.5 flex-1 rounded-full',
              d.state === 'claimed' && 'bg-ink-900 dark:bg-white',
              d.state === 'today' && 'bg-gold',
              d.state === 'upcoming' && 'bg-neutral-200 dark:bg-neutral-800',
              d.milestone && d.state === 'upcoming' && 'bg-gold/40',
            )}
          />
        ))}
      </div>
    </section>
  );
}
