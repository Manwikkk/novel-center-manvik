'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/Icon';
import { RewardIcon } from '@/components/checkin/RewardOptionCard';
import { formatDate } from '@/lib/format';
import { formatDuration, secondsUntil } from '@/lib/checkinApi';
import { cn } from '@/lib/cn';

const STATUS_STYLES = {
  issued: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  active: 'bg-gold/15 text-gold-dim dark:text-gold',
  used: 'bg-neutral-200 text-ink-600 dark:bg-neutral-800 dark:text-neutral-400',
  expired: 'bg-neutral-200 text-ink-500 dark:bg-neutral-800 dark:text-neutral-500',
  revoked: 'bg-danger/10 text-danger',
};

const STATUS_LABEL = {
  issued: 'Ready',
  active: 'Active',
  used: 'Used',
  expired: 'Expired',
  revoked: 'Revoked',
};

function useTicker(active) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!active) return undefined;
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [active]);
}

function RewardCard({ reward, onActivate }) {
  useTicker(reward.status === 'active');
  const remaining = reward.status === 'active' ? secondsUntil(reward.expiresAt) : 0;
  const total = reward.status === 'active' && reward.durationMinutes ? reward.durationMinutes * 60 : 0;
  const pct = total ? Math.max(0, Math.min(100, Math.round((remaining / total) * 100))) : 0;
  const inactive = reward.status === 'used' || reward.status === 'expired' || reward.status === 'revoked';

  return (
    <article
      className={cn(
        'flex flex-col rounded-2xl border p-4 transition-colors',
        reward.status === 'active'
          ? 'border-gold/60 bg-gold/5 dark:bg-gold/10'
          : 'border-neutral-200/80 bg-white dark:border-neutral-800 dark:bg-neutral-950',
        inactive && 'opacity-70',
      )}
    >
      <div className="flex items-start gap-3">
        <RewardIcon type={reward.type} className="h-11 w-11" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[15px] font-semibold leading-tight text-ink-900 dark:text-neutral-100">{reward.title}</p>
            <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest', STATUS_STYLES[reward.status])}>
              {STATUS_LABEL[reward.status] || reward.status}
            </span>
          </div>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-600 dark:text-neutral-400">{reward.description}</p>
          {reward.lucky ? (
            <p className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-rose-600 dark:text-rose-300">
              <Icon name="auto_awesome" filled size={12} /> Lucky reward
            </p>
          ) : null}
        </div>
      </div>

      {reward.status === 'active' ? (
        <div className="mt-4">
          <div className="flex items-center justify-between text-[12px]">
            <span className="inline-flex items-center gap-1.5 text-ink-600 dark:text-neutral-400">
              <Icon name="timer" size={16} />
              {reward.book ? (
                <Link href={`/books/${reward.book.slug}`} className="font-semibold text-ink-900 hover:underline dark:text-neutral-100">
                  {reward.book.title}
                </Link>
              ) : 'Every eligible novel'}
            </span>
            <span className="font-serif text-[18px] tabular-nums text-ink-900 dark:text-neutral-50">
              {formatDuration(remaining, { withSeconds: remaining < 3600 })}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
            <div className="h-full rounded-full bg-gold transition-all duration-1000" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1.5 text-[11px] text-ink-500 dark:text-neutral-500">Ends {new Date(reward.expiresAt).toLocaleString()}</p>
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-neutral-200/70 pt-3 text-[11px] text-ink-500 dark:border-neutral-800 dark:text-neutral-500">
        <span>
          {reward.status === 'issued' && reward.isVoucher && reward.validUntil ? `Valid until ${formatDate(reward.validUntil)}` : null}
          {reward.status === 'issued' && reward.isPass ? 'Timer starts on activation' : null}
          {reward.status === 'used' && reward.usedAt ? `Used ${formatDate(reward.usedAt)}` : null}
          {reward.status === 'expired' ? 'No longer valid' : null}
          {reward.status === 'active' && reward.book ? 'Reading free' : null}
        </span>
        {reward.status === 'issued' && reward.isPass ? (
          <button
            type="button"
            onClick={() => onActivate(reward)}
            className="inline-flex items-center gap-1.5 rounded-full bg-ink-900 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-widest text-white transition-colors hover:bg-ink-700 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
          >
            <Icon name="play_arrow" filled size={16} /> Activate
          </button>
        ) : null}
        {reward.status === 'issued' && reward.isVoucher ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
            <Icon name="bolt" filled size={14} /> Auto-applies at unlock
          </span>
        ) : null}
        {reward.status === 'active' && reward.book ? (
          <Link
            href={`/books/${reward.book.slug}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-ink-900 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-widest text-ink-900 transition-colors hover:bg-ink-900 hover:text-white dark:border-white dark:text-white dark:hover:bg-white dark:hover:text-black"
          >
            Read now <Icon name="arrow_forward" size={14} />
          </Link>
        ) : null}
        {reward.status === 'active' && !reward.book ? (
          <Link
            href="/discover"
            className="inline-flex items-center gap-1.5 rounded-full border border-ink-900 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-widest text-ink-900 transition-colors hover:bg-ink-900 hover:text-white dark:border-white dark:text-white dark:hover:bg-white dark:hover:text-black"
          >
            Browse novels <Icon name="arrow_forward" size={14} />
          </Link>
        ) : null}
      </div>
    </article>
  );
}

export default function RewardInventory({ items = [], onActivate }) {
  const [showHistory, setShowHistory] = useState(false);
  const live = items.filter((r) => r.status === 'issued' || r.status === 'active');
  const history = items.filter((r) => r.status !== 'issued' && r.status !== 'active');
  const visible = showHistory ? items : live;

  return (
    <section aria-label="Your rewards">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-500 dark:text-neutral-500">Reward inventory</p>
          <h2 className="mt-1 font-serif text-[24px] leading-tight text-ink-900 dark:text-neutral-50">Your rewards</h2>
        </div>
        {history.length ? (
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="text-[12px] font-semibold uppercase tracking-widest text-ink-600 underline-offset-4 hover:underline dark:text-neutral-400"
          >
            {showHistory ? 'Hide used & expired' : `Show history (${history.length})`}
          </button>
        ) : null}
      </div>

      {visible.length ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {visible.map((r) => <RewardCard key={r.id} reward={r} onActivate={onActivate} />)}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-neutral-300 bg-white/60 px-6 py-12 text-center dark:border-neutral-700 dark:bg-neutral-950/60">
          <Icon name="redeem" size={32} className="text-ink-300 dark:text-neutral-600" />
          <p className="mt-3 text-[16px] font-semibold text-ink-900 dark:text-neutral-100">No rewards stored yet</p>
          <p className="mx-auto mt-1 max-w-sm text-[13px] text-ink-500 dark:text-neutral-500">
            Reach Day 7 and Day 14 of the cycle to choose coins, discount vouchers or Novel Passes. Everything you pick lands here.
          </p>
        </div>
      )}
    </section>
  );
}
