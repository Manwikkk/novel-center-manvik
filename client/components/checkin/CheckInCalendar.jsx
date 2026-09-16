'use client';

import { useEffect, useMemo, useState } from 'react';
import Icon from '@/components/ui/Icon';
import { checkinApi } from '@/lib/checkinApi';
import { cn } from '@/lib/cn';

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function monthLabel(month) {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function shiftMonth(month, delta) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Month grid of claimed days; streak numbers show how each run built up. */
export default function CheckInCalendar({ today, refreshKey }) {
  const [month, setMonth] = useState(() => (today || new Date().toISOString().slice(0, 10)).slice(0, 7));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    checkinApi.history(month)
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setData({ month, days: [], totals: { claims: 0, exp: 0, bonusCoins: 0 } }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [month, refreshKey]);

  const cells = useMemo(() => {
    const [y, m] = month.split('-').map(Number);
    const first = new Date(Date.UTC(y, m - 1, 1));
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const lead = (first.getUTCDay() + 6) % 7; // Monday-first
    const byDate = new Map((data?.days || []).map((d) => [d.date, d]));
    const out = [];
    for (let i = 0; i < lead; i += 1) out.push({ key: `lead-${i}`, empty: true });
    for (let d = 1; d <= daysInMonth; d += 1) {
      const date = `${month}-${String(d).padStart(2, '0')}`;
      out.push({ key: date, date, day: d, claim: byDate.get(date) || null, isToday: date === today, future: today && date > today });
    }
    return out;
  }, [month, data, today]);

  const currentMonth = (today || '').slice(0, 7);

  return (
    <section aria-label="Check-in calendar" className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-editorial-card dark:border-neutral-800 dark:bg-neutral-950 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-500 dark:text-neutral-500">History</p>
          <h2 className="mt-1 font-serif text-[22px] leading-tight text-ink-900 dark:text-neutral-50">{monthLabel(month)}</h2>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Previous month" onClick={() => setMonth((m) => shiftMonth(m, -1))} className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 text-ink-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800">
            <Icon name="chevron_left" size={20} />
          </button>
          <button
            type="button"
            aria-label="Next month"
            disabled={month >= currentMonth}
            onClick={() => setMonth((m) => shiftMonth(m, 1))}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 text-ink-700 hover:bg-neutral-100 disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            <Icon name="chevron_right" size={20} />
          </button>
        </div>
      </div>

      <div className={cn('mt-5 grid grid-cols-7 gap-1.5 text-center', loading && 'opacity-60')}>
        {WEEKDAYS.map((w) => (
          <span key={w} className="pb-1 text-[10px] font-semibold uppercase tracking-widest text-ink-400 dark:text-neutral-600">{w}</span>
        ))}
        {cells.map((c) => (
          c.empty ? <span key={c.key} /> : (
            <div
              key={c.key}
              title={c.claim ? `Streak day ${c.claim.streak} · +${c.claim.exp} EXP${c.claim.rewardTitle ? ` · ${c.claim.rewardTitle}` : ''}` : undefined}
              className={cn(
                'relative flex aspect-square flex-col items-center justify-center rounded-lg text-[13px] tabular-nums',
                c.claim
                  ? 'bg-ink-900 font-semibold text-white dark:bg-white dark:text-black'
                  : c.future
                    ? 'text-ink-300 dark:text-neutral-700'
                    : 'bg-neutral-100 text-ink-600 dark:bg-neutral-900 dark:text-neutral-400',
                c.isToday && !c.claim && 'ring-2 ring-gold',
                c.isToday && c.claim && 'ring-2 ring-gold ring-offset-1 ring-offset-white dark:ring-offset-black',
              )}
            >
              {c.day}
              {c.claim?.milestone ? (
                <Icon name={c.claim.milestone === 'day14' ? 'workspace_premium' : 'redeem'} filled size={11} className="absolute right-1 top-1 text-gold" />
              ) : null}
              {c.claim?.lucky ? (
                <Icon name="auto_awesome" filled size={11} className="absolute left-1 top-1 text-rose-400" />
              ) : null}
            </div>
          )
        ))}
      </div>

      <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-neutral-200/70 pt-4 dark:border-neutral-800">
        {[
          { label: 'Check-ins', value: data?.totals?.claims ?? 0 },
          { label: 'EXP earned', value: data?.totals?.exp ?? 0 },
          { label: 'Bonus coins', value: data?.totals?.bonusCoins ?? 0 },
        ].map((s) => (
          <div key={s.label}>
            <dt className="text-[10px] font-semibold uppercase tracking-widest text-ink-400 dark:text-neutral-500">{s.label}</dt>
            <dd className="mt-1 font-serif text-[22px] leading-none text-ink-900 tabular-nums dark:text-neutral-50">{s.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
